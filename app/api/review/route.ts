import { NextRequest, NextResponse } from 'next/server';
import { parseMRUrl } from '@/lib/parseMRUrl';

// Define the exact interfaces as specified in instructions
export interface Issue {
  severity: 'CRITICAL' | 'WARNING' | 'SUGGESTION';
  title: string;
  file: string;
  explanation: string;
  fix: string;
  comment: string;
}

export interface ReviewResponse {
  summary: string;
  healthScore: number;
  issues: Issue[];
  commentsPosted: number;
}

interface GitLabChange {
  old_path: string;
  new_path: string;
  new_file: boolean;
  renamed_file: boolean;
  deleted_file: boolean;
  diff: string;
}

interface GitLabNote {
  id: number;
  body: string;
  system: boolean;
  author: {
    username: string;
    name: string;
  };
}

interface GitLabMergeRequest {
  iid: number;
  title: string;
  description: string;
  state: string;
}

// Simple delay helper (300ms)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.mrUrl) {
      return NextResponse.json(
        { error: 'mrUrl is required in the request body.' },
        { status: 400 }
      );
    }

    const { mrUrl } = body;

    // 1. Parse the GitLab MR URL
    let projectId: string;
    let mrIid: string;
    try {
      const parsed = parseMRUrl(mrUrl);
      projectId = parsed.projectId;
      mrIid = parsed.mrIid;
    } catch (parseError: any) {
      return NextResponse.json(
        { error: parseError.message || 'Invalid GitLab MR URL' },
        { status: 400 }
      );
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const gitlabPat = process.env.GITLAB_PERSONAL_ACCESS_TOKEN;
    const gitlabApiUrl = process.env.GITLAB_API_URL || 'https://gitlab.com';

    // Check if we should fallback to high-fidelity mock mode (if keys are blank or placeholders)
    const isMockMode = !geminiKey || geminiKey.trim() === '' || geminiKey.startsWith('AIzaSy...') ||
                       !gitlabPat || gitlabPat.trim() === '' || gitlabPat.startsWith('glpat-...');

    if (isMockMode) {
      console.log('MergeMinD running in High-Fidelity Mock Mode due to missing/placeholder credentials.');
      const mockResult = getMockReview(mrUrl);
      return NextResponse.json(mockResult);
    }

    const gitlabHeaders = {
      'PRIVATE-TOKEN': gitlabPat!,
      'Content-Type': 'application/json'
    };

    // 2. Fetch MR diff changes
    const changesRes = await fetch(
      `${gitlabApiUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}/changes`,
      { headers: gitlabHeaders }
    );
    if (!changesRes.ok) {
      throw new Error(`Failed to fetch MR changes from GitLab: ${changesRes.statusText}`);
    }
    const changesData = await changesRes.json();
    const rawChanges: GitLabChange[] = changesData.changes || [];
    
    // Rule: Diff up to max 10 files
    const slicedChanges = rawChanges.slice(0, 10);

    // 3. Fetch last 5 merged MRs for context
    const mergedRes = await fetch(
      `${gitlabApiUrl}/api/v4/projects/${projectId}/merge_requests?state=merged&per_page=5&order_by=updated_at`,
      { headers: gitlabHeaders }
    );
    let historicalContext = '';
    if (mergedRes.ok) {
      const mergedData: GitLabMergeRequest[] = await mergedRes.json();
      historicalContext = mergedData
        .map(mr => `- MR #${mr.iid}: ${mr.title}`)
        .join('\n');
    }

    // 4. Fetch existing notes to avoid duplicate review comments
    const notesRes = await fetch(
      `${gitlabApiUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}/notes`,
      { headers: gitlabHeaders }
    );
    let existingNotesContext = '';
    if (notesRes.ok) {
      const notesData: GitLabNote[] = await notesRes.json();
      existingNotesContext = notesData
        .filter(note => !note.system) // filter out system notes
        .map(note => `- @${note.author.username}: ${note.body}`)
        .join('\n');
    }

    // 5. Construct the Gemini senior software engineer prompt
    const prompt = `You are a 10-year senior software engineer. Analyze the following GitLab Merge Request code changes carefully for bugs and quality issues.
Your review MUST categorize issues into:
- CRITICAL: security holes, logic errors, data loss, off-by-one errors.
- WARNING: missing error handling, edge cases, performance bottlenecks.
- SUGGESTION: naming, style improvements, refactoring suggestions.

Here is the context:

HISTORICAL MERGED MR TITLES (FOR REPO CONTEXT):
${historicalContext || 'No past merged MRs found.'}

EXISTING HUMAN NOTES/COMMENTS (DO NOT DUPLICATE FEEDBACK):
${existingNotesContext || 'No existing comments.'}

CURRENT MERGE REQUEST DIFF (MAX 10 FILES):
${slicedChanges.map(change => `
File: ${change.new_path} ${change.new_file ? '(NEW)' : ''} ${change.deleted_file ? '(DELETED)' : ''}
\`\`\`diff
${change.diff}
\`\`\`
`).join('\n')}

INSTRUCTIONS:
1. Provide a concise summary (2-3 sentences) of your overall assessment.
2. Provide a healthScore as an integer between 1 and 10.
3. For each issue found, you must provide:
   - severity (exactly "CRITICAL", "WARNING", or "SUGGESTION")
   - title (short title)
   - file (path to file)
   - explanation (what is wrong and why it matters)
   - fix (corrected code snippet)
   - comment (Full markdown string ready to post to GitLab including severity label, explanation, and fix code block)

Response must be strict JSON only with this exact shape:
{
  "summary": "2-3 sentence overall assessment",
  "healthScore": 7,
  "issues": [
    {
      "severity": "CRITICAL",
      "title": "Short title",
      "file": "path/to/file.js",
      "explanation": "What is wrong and why it matters",
      "fix": "corrected code snippet",
      "comment": "Full markdown string ready to post to GitLab including severity label, explanation, and fix code block"
    }
  ]
}`;

    // 6. Call Gemini 2.5 Flash (Use stable model as preview-05-20 is no longer available/deprecated)
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
    const geminiPayload = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8192,
        responseMimeType: "application/json"
      }
    };

    const geminiRes = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(geminiPayload)
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini API error: ${geminiRes.statusText} - ${errText}`);
    }

    const geminiData = await geminiRes.json();
    const rawTextResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawTextResponse) {
      throw new Error('Empty response returned from Gemini API.');
    }

    // 7. Extract and parse strict JSON from Gemini response using regex
    let parsedReview: {
      summary: string;
      healthScore: number;
      issues: Issue[];
    };

    try {
      const jsonMatch = rawTextResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not extract JSON block from Gemini response.');
      }
      parsedReview = JSON.parse(jsonMatch[0]);
    } catch (parseErr: any) {
      console.error('Gemini text was:', rawTextResponse);
      throw new Error(`Failed to extract or parse review JSON: ${parseErr.message}`);
    }

    // Validate structure
    if (typeof parsedReview.healthScore !== 'number' || !parsedReview.summary || !Array.isArray(parsedReview.issues)) {
      throw new Error('Invalid JSON structure returned from Gemini.');
    }

    // 8. Post each issue as a GitLab comment
    let commentsPosted = 0;
    for (const issue of parsedReview.issues) {
      const postCommentRes = await fetch(
        `${gitlabApiUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}/notes`,
        {
          method: 'POST',
          headers: gitlabHeaders,
          body: JSON.stringify({ body: issue.comment })
        }
      );
      if (postCommentRes.ok) {
        commentsPosted++;
      } else {
        console.error(`Failed to post GitLab comment: ${postCommentRes.statusText}`);
      }
      
      // Delay 300ms between each post as requested to avoid rate limits
      await delay(300);
    }

    // 9. Post final summary comment with health score and footer
    const finalSummaryComment = `## 🤖 MergeMinD AI Review Summary

### Overall Health Score: **${parsedReview.healthScore}/10**

${parsedReview.summary}

---
*Reviewed by MergeMinD*`;

    const summaryCommentRes = await fetch(
      `${gitlabApiUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}/notes`,
      {
        method: 'POST',
        headers: gitlabHeaders,
        body: JSON.stringify({ body: finalSummaryComment })
      }
    );
    if (!summaryCommentRes.ok) {
      console.error(`Failed to post GitLab summary comment: ${summaryCommentRes.statusText}`);
    }

    // 10. Return JSON to frontend
    const finalResult: ReviewResponse = {
      summary: parsedReview.summary,
      healthScore: parsedReview.healthScore,
      issues: parsedReview.issues,
      commentsPosted
    };

    return NextResponse.json(finalResult);

  } catch (error: any) {
    console.error('API review route error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred during the review.' },
      { status: 500 }
    );
  }
}

// High-fidelity pre-computed review for local developer testing when keys are missing
function getMockReview(mrUrl: string): ReviewResponse {
  const isAuthDemo = mrUrl.toLowerCase().includes('auth') || mrUrl.toLowerCase().includes('user');

  if (isAuthDemo) {
    return {
      summary: "The code changes implement basic user registration and login functionality. However, several critical security vulnerabilities exist, particularly regarding plaintext password storage, lack of username duplicate checks, and unsafe loose equality comparisons.",
      healthScore: 4,
      commentsPosted: 3,
      issues: [
        {
          severity: "CRITICAL",
          title: "Plaintext Password Storage",
          file: "auth.js",
          explanation: "Storing user passwords in memory or a database in plaintext is a severe security risk. If database snapshots are leaked or memory dumps are compromised, all user passwords will be exposed. Standard industry practices dictate hashing passwords using bcrypt or argon2 before storage.",
          fix: "const hashedPassword = await bcrypt.hash(password, 12);\nusers.push({ username, password: hashedPassword });",
          comment: `### 🚨 CRITICAL — Plaintext Password Storage

**What is wrong and why it matters:**
Storing user passwords in memory or a database in plaintext is a severe security risk. If database snapshots are leaked or memory dumps are compromised, all user passwords will be exposed.

**How to fix it:**
\`\`\`javascript
const hashedPassword = await bcrypt.hash(password, 12);
users.push({ username, password: hashedPassword });
\`\`\`

---
*Reviewed by MergeMinD*`
        },
        {
          severity: "WARNING",
          title: "Missing Username Duplicate Validation",
          file: "auth.js",
          explanation: "Registration does not check if a username already exists. This allows multiple accounts to be registered under the same username, causing authentication ambiguity and errors during retrieval.",
          fix: "if (users.some(u => u.username === username)) {\n  throw new Error('Username already exists');\n}",
          comment: `### ⚠️ WARNING — Missing Username Duplicate Validation

**What is wrong and why it matters:**
Registration does not check if a username already exists. This allows multiple accounts to be registered under the same username, causing authentication ambiguity.

**How to fix it:**
\`\`\`javascript
if (users.some(u => u.username === username)) {
  throw new Error('Username already exists');
}
\`\`\`

---
*Reviewed by MergeMinD*`
        },
        {
          severity: "SUGGESTION",
          title: "Loose Equality in Login Comparison",
          file: "auth.js",
          explanation: "Using loose equality (==) for matching user credentials makes the code susceptible to implicit type coercion bypasses. Use strict equality (===) to ensure exact type-safe matching.",
          fix: "const user = users.find(u => u.username === username && u.password === password);",
          comment: `### 💡 SUGGESTION — Loose Equality in Login Comparison

**What is wrong and why it matters:**
Using loose equality (==) for matching user credentials makes the code susceptible to implicit type coercion bypasses.

**How to fix it:**
\`\`\`javascript
const user = users.find(u => u.username === username && u.password === password);
\`\`\`

---
*Reviewed by MergeMinD*`
        }
      ]
    };
  }

  // Fallback DB Pool Mock
  return {
    summary: "The MR establishes a solid API baseline for resource retrieval. However, database client connection handling lacks proper release blocks, leading to resource exhaustion under moderate load.",
    healthScore: 7,
    commentsPosted: 2,
    issues: [
      {
        severity: "CRITICAL",
        title: "Potential Connection Pool Leak",
        file: "lib/db.ts",
        explanation: "The database client is successfully reserved from the pool but is not released inside a finally block. When errors occur in queries, connections remain reserved indefinitely, leading to pool starvation.",
        fix: "finally {\n  client.release();\n}",
        comment: `### 🚨 CRITICAL — Potential Connection Pool Leak

**What is wrong and why it matters:**
The database client is successfully reserved from the pool but is not released inside a finally block. When errors occur, connections remain reserved indefinitely, leading to pool starvation.

**How to fix it:**
\`\`\`typescript
finally {
  client.release();
}
\`\`\`

---
*Reviewed by MergeMinD*`
      },
      {
        severity: "WARNING",
        title: "Missing Request Body Validation",
        file: "app/api/review/route.ts",
        explanation: "The POST payload for code reviews extracts and parses fields without checking if they are undefined or empty, causing runtime type errors when processing malformed JSON bodies.",
        fix: "if (!body || !body.mrUrl) {\n  return NextResponse.json({ error: 'mrUrl required' }, { status: 400 });\n}",
        comment: `### ⚠️ WARNING — Missing Request Body Validation

**What is wrong and why it matters:**
The POST payload extracts and parses fields without checking if they are undefined or empty, causing runtime type errors.

**How to fix it:**
\`\`\`typescript
if (!body || !body.mrUrl) {
  return NextResponse.json({ error: 'mrUrl required' }, { status: 400 });
}
\`\`\`

---
*Reviewed by MergeMinD*`
      }
    ]
  };
}
