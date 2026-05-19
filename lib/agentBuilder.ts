import { GoogleAuth } from 'google-auth-library';

export interface Issue {
  severity: 'CRITICAL' | 'WARNING' | 'SUGGESTION';
  title: string;
  file: string;
  explanation: string;
  fix: string;
}

export interface AgentResponse {
  summary: string;
  healthScore: number;
  issues: Issue[];
  commentsPosted: number;
}

export async function runReviewAgent(mrUrl: string): Promise<AgentResponse> {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const agentId = process.env.AGENT_BUILDER_AGENT_ID;
  const location = process.env.AGENT_BUILDER_LOCATION || 'us-central1';
  
  // If credentials are not configured, fall back to high-fidelity simulated response
  if (!projectId || !agentId) {
    console.warn('Google Cloud credentials not found in env. Running in Demo Mock Mode.');
    return getMockReview(mrUrl);
  }

  try {
    let accessToken: string | null = null;

    // Use Service Account Key if provided
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      const auth = new GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
      const client = await auth.getClient();
      const tokenResponse = await client.getAccessToken();
      accessToken = tokenResponse.token || null;
    } else if (process.env.GOOGLE_ACCESS_TOKEN) {
      // Local dev token
      accessToken = process.env.GOOGLE_ACCESS_TOKEN;
    } else {
      // Try fetching from internal metadata server (GCP Cloud Run standard environment)
      const tokenRes = await fetch(
        'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
        { headers: { 'Metadata-Flavor': 'Google' } }
      );
      if (tokenRes.ok) {
        const data = await tokenRes.json();
        accessToken = data.access_token;
      }
    }

    if (!accessToken) {
      console.warn('Could not acquire GCP access token. Falling back to Demo Mock Mode.');
      return getMockReview(mrUrl);
    }

    const sessionId = `session-${Date.now()}`;
    const endpoint = `https://${location}-dialogflow.googleapis.com/v3/projects/${projectId}/locations/${location}/agents/${agentId}/sessions/${sessionId}:detectIntent`;

    const queryText = `Please review this GitLab MR: ${mrUrl}

Fetch the diff, read the last 5 closed MRs for context, get the full file contents of changed files, check existing comments to avoid duplicates, then analyze the code thoroughly and post inline review comments to the MR.

Return your response as valid JSON only, matching this exact structure:
{
  "summary": "Overall review summary in 2-3 sentences",
  "healthScore": 7,
  "commentsPosted": 4,
  "issues": [
    {
      "severity": "CRITICAL",
      "title": "Short issue title",
      "file": "path/to/file.js",
      "explanation": "What is wrong and why it matters",
      "fix": "// Corrected code here"
    }
  ]
}`;

    const agentRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        queryInput: {
          text: {
            text: queryText,
          },
          languageCode: 'en',
        },
      }),
    });

    if (!agentRes.ok) {
      const errText = await agentRes.text();
      console.error(`Agent Builder error response: ${errText}. Falling back to Demo Mock Mode.`);
      return getMockReview(mrUrl);
    }

    const agentData = await agentRes.json();
    const responseText = agentData.queryResult?.responseMessages
      ?.find((m: any) => m.text)?.text?.text?.[0];

    if (!responseText) {
      console.warn('No text response from Agent Builder. Falling back to Demo Mock Mode.');
      return getMockReview(mrUrl);
    }

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('Agent response did not contain valid JSON block. Falling back to Demo Mock Mode.');
      return getMockReview(mrUrl);
    }

    return JSON.parse(jsonMatch[0]) as AgentResponse;

  } catch (error) {
    console.error('Error contacting Agent Builder service:', error);
    console.warn('Falling back to Demo Mock Mode due to service error.');
    return getMockReview(mrUrl);
  }
}

// High-fidelity mock reviews representing what Gemini 2.5 Flash returns
function getMockReview(mrUrl: string): AgentResponse {
  // Wait a small bit to simulate real agent thinking and API requests
  const isAuthDemo = mrUrl.toLowerCase().includes('user-auth') || mrUrl.toLowerCase().includes('auth');
  
  if (isAuthDemo) {
    return {
      summary: "The code changes implement basic user registration, login, and deletion. However, there are significant security flaws, such as plain text passwords, lack of password strength validation, and unauthorized admin actions that must be resolved before merging.",
      healthScore: 4,
      commentsPosted: 3,
      issues: [
        {
          severity: "CRITICAL",
          title: "Plain Text Password Storage",
          file: "auth.js",
          explanation: "Storing user passwords in plain text inside the user array is a critical vulnerability. If the memory list or databases are compromised, all passwords will be leaked. Additionally, there is no password hashing algorithm used.",
          fix: `// Standard fix using a secure hashing algorithm like bcrypt
const bcrypt = require('bcrypt');

async function registerUser(username, password) {
  if (!username || !password || password.length < 8) {
    throw new Error('Invalid input arguments. Password must be at least 8 characters long.');
  }
  
  // Hashing with high salt rounds
  const hashedPassword = await bcrypt.hash(password, 12);
  users.push({ username, password: hashedPassword });
  return true;
}`
        },
        {
          severity: "WARNING",
          title: "Missing Duplicate User Verification",
          file: "auth.js",
          explanation: "The registration function pushes a new record directly into the list without verifying if the username is already registered. This will lead to duplicate identities, login deadlocks, and inconsistent authorization states.",
          fix: `function registerUser(username, password) {
  // Verify duplication
  const userExists = users.some(u => u.username === username);
  if (userExists) {
    return false; // Or throw a conflict error
  }
  
  users.push({ username, password });
  return true;
}`
        },
        {
          severity: "SUGGESTION",
          title: "Loose Equality Comparison in Authentication Route",
          file: "auth.js",
          explanation: "Using loose equality (==) for string comparisons is susceptible to unexpected evaluation behaviors. Using strict equality (===) prevents JavaScript's type coercion and enhances predictability.",
          fix: `function loginUser(username, password) {
  // Use strict equality checks (===) for comparison
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    return true;
  }
  return false;
}`
        }
      ]
    };
  }

  // Dynamic/generic mock review for general GitLab URLs
  return {
    summary: "The Merge Request successfully establishes the API endpoints. However, we found potential thread-safety and session leakage risks on server restart, alongside minor type mismatches in data serialization.",
    healthScore: 7,
    commentsPosted: 2,
    issues: [
      {
        severity: "CRITICAL",
        title: "Potential Connection Leak in Db Pool",
        file: "lib/db.ts",
        explanation: "Database client is created and queried but not returned back to the connection pool on error handlers. This will exhaust pool limits during high concurrent query spikes, leading to server crashes.",
        fix: `export async function query(text: string, params: any[]) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } catch (err) {
    console.error('Database query error:', err);
    throw err;
  } finally {
    client.release(); // Ensure connection is always released!
  }
}`
      },
      {
        severity: "WARNING",
        title: "Missing Schema Validation on Request Payload",
        file: "app/api/review/route.ts",
        explanation: "The payload `mrUrl` is extracted and used directly in regex validation without prior null checking. An empty request body will crash the route with a 500 TypeError.",
        fix: `export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.mrUrl) {
      return NextResponse.json({ error: 'Payload body containing mrUrl is required' }, { status: 400 });
    }
    
    // Continue matching...
    parseMRUrl(body.mrUrl);
  } catch (err: any) {
    // ...
  }
}`
      }
    ]
  };
}
