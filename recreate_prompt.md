# MergeMinD Recreation Blueprint & AI Prompt

This document contains a comprehensive, highly detailed system prompt and technical blueprint designed to instruct an advanced AI coding assistant to recreate the exact **MergeMinD** AI-powered GitLab Merge Request Review platform from scratch.

---

## The Master AI Generation Prompt

Copy and paste the prompt below into any advanced LLM (like Claude 3.5 Sonnet, GPT-4o, or Gemini 1.5/2.0 Pro) to generate the complete codebase.

```markdown
You are an elite full-stack Next.js developer and premium UI/UX designer. Your goal is to recreate a complete, premium, developer-oriented SaaS platform called "MergeMinD". It is an AI-powered code review platform that integrates with GitLab, Firebase Auth, and the Gemini 2.5 Flash API to review Merge Requests like a 10-year senior staff engineer.

The design system is a futuristic dark mode with rich ambient glows, glassmorphism panels, glowing borders, custom loader logs, and exquisite micro-animations (shake, ping, bounce, glow).

Implement the complete directory structure and all individual code files with full functionality (no placeholders, comments like "// implement later", or stubs).

---

### 1. File & Directory Architecture

Implement the following file structure in a Next.js (App Router), TypeScript, and Tailwind CSS stack:

```text
├── .env.example
├── .gitignore
├── next.config.ts
├── tsconfig.json
├── package.json
├── app
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   └── api
│       └── review
│           └── route.ts
├── components
│   ├── AuthPage.tsx
│   ├── DiffViewer.tsx
│   ├── Header.tsx
│   ├── MRInput.tsx
│   └── ReviewPanel.tsx
└── lib
    ├── agentBuilder.ts
    ├── firebase.ts
    └── parseMRUrl.ts
```

---

### 2. Styling Tokens & Custom Utilities (`app/globals.css`)

Implement a Tailwind CSS global stylesheet that defines custom animations, keyframes, radial ambient background glows, scanlines, and glassmorphism. Add this exact setup:

```css
@import "tailwindcss";

@layer base {
  body {
    @apply bg-gray-950 text-slate-100 antialiased selection:bg-orange-500/30 selection:text-orange-300;
  }
}

/* Glassmorphism Panel styles */
.glass-panel {
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

/* Ambient Radial Glows */
.bg-radial-glow {
  background: radial-gradient(circle at center, rgba(249, 115, 22, 0.15) 0%, rgba(249, 115, 22, 0) 70%);
  filter: blur(60px);
}

.bg-radial-purple-glow {
  background: radial-gradient(circle at center, rgba(168, 85, 247, 0.1) 0%, rgba(168, 85, 247, 0) 70%);
  filter: blur(60px);
}

/* Glowing text effects */
.text-glow {
  text-shadow: 0 0 15px rgba(251, 146, 60, 0.6);
}

.text-glow-orange {
  text-shadow: 0 0 12px rgba(249, 115, 22, 0.5);
}

/* Scanline visual overlay effect */
.scanline::after {
  content: " ";
  display: block;
  position: absolute;
  top: 0; left: 0; bottom: 0; right: 0;
  background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
  z-index: 2;
  background-size: 100% 2px, 3px 100%;
  pointer-events: none;
}

/* Pulse animation for active glowing borders */
@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 15px rgba(249, 115, 22, 0.2);
    border-color: rgba(249, 115, 22, 0.3);
  }
  50% {
    box-shadow: 0 0 25px rgba(249, 115, 22, 0.4);
    border-color: rgba(249, 115, 22, 0.6);
  }
}

.pulse-glow {
  animation: pulse-glow 3s infinite;
}

/* Custom Shake Animation for Error Notification */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}

.animate-shake {
  animation: shake 0.5s ease-in-out;
}

/* Fade-In animation */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
```

---

### 3. Core Libraries & Helpers

#### A. URL Parser (`lib/parseMRUrl.ts`)
Extracts project identifier and merge request IID from GitLab URL.
* Match regex pattern: `gitlab.com/(.+?)/-/merge_requests/(\d+)`
* Return project ID (URL encoded using `encodeURIComponent`) and the MR IID.
* Throw a clear error if the URL is invalid.

```typescript
export function parseMRUrl(url: string): { projectId: string; mrIid: string } {
  const match = url.match(/gitlab\.com\/(.+?)\/-\/merge_requests\/(\d+)/);
  if (!match) {
    throw new Error('Invalid GitLab MR URL. Make sure it follows this pattern: https://gitlab.com/owner/project/-/merge_requests/123');
  }
  return {
    projectId: encodeURIComponent(match[1]),
    mrIid: match[2],
  };
}
```

#### B. Firebase Initialization (`lib/firebase.ts`)
Handles standard initialization for both client-side and server-side contexts:
```typescript
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

#### C. Google Cloud Agent Builder Client (`lib/agentBuilder.ts`)
Provides a fallback route integrating Vertex AI Agent Builder sessions:
* Uses dialogflow's `detectIntent` endpoint.
* Authenticates dynamically using `GOOGLE_SERVICE_ACCOUNT_KEY` (flattened JSON string) or `GOOGLE_ACCESS_TOKEN`.
* If keys are missing, gracefully falls back to simulated reviews.

---

### 4. Interactive Components

#### A. Auth Portal (`components/AuthPage.tsx`)
A magnificent card layout with a tabbed interface (Sign In / Sign Up):
* Firebase email/password authentication handler.
* Glowing ambient radial gradient layers in the background (`bg-radial-glow`).
* Floating icon (🤖) with subtle looping bounce animation (`animate-bounce [animation-duration:3s]`).
* Scanline styled glass panel container.
* Detailed inline form validation error banners that shake on appear.
* Monospace support text at the bottom.

#### B. Header (`components/Header.tsx`)
* Blurry glass header (backdrop-blur-md) with custom bottom border.
* Displays current authenticated email inside a premium code pill badge (`font-mono bg-gray-900 border-gray-800`).
* Dynamic hover button to handle Firebase `signOut`.

#### C. MR Input Bar (`components/MRInput.tsx`)
* Monospace labeling: "GitLab Merge Request URL".
* Fully interactive input with border-color transition to `focus:border-orange-400`.
* Button changes status dynamically depending on `loading` state.
* Supports keydown event trigger on Enter key.

#### D. Interactive Code Diff Simulator (`components/DiffViewer.tsx`)
An exceptionally premium client-side component displaying a beautiful mock Git diff review on a file called `auth.js` (`feature/user-auth` vs `main`):
* Includes three interactive tabs: "Review & Inline Comments", "Original", and "Proposed Fix".
* Original / Proposed Fix tabs render cleanly formatted table lines with row numbers.
* The "Review & Inline Comments" tab renders standard diff addition/deletion highlighting combined with **embedded code review cards** inserted directly below the lines containing issues.
* Review cards represent three severities (Critical, Warning, Suggestion) and are styled exactly like real GitLab MR comments complete with description blocks, recommended inline code additions, and clean Lucide iconography.

#### E. Detailed AI Review Findings Dashboard (`components/ReviewPanel.tsx`)
Displays the output response received from the Gemini AI review:
* Break down findings into severity pills: Critical, Warning, and Suggestion.
* Interactive Health Score Badge that evaluates a score out of 10 and updates colors: Emerald (8-10), Yellow (5-7), and Red (<5).
* A "Live on GitLab" indicator with a green pulsing dot to confirm the comments were posted to the merge request.
* Renders each individual code finding as an expandable, styled container matching its severity accent colors (Rose for Critical, Amber for Warning, Cyan for Suggestion).
* Includes suggested corrections styled in elegant monospace code snippets with overflow safety handlers.

---

### 5. Backend Review API Route (`app/api/review/route.ts`)

Create a Next.js App Router API route (`POST`) that performs the complete server-side orchestration:
1. **Payload Extraction:** Read `mrUrl` from body.
2. **GitLab parsing:** Call `parseMRUrl` helper to get project ID and MR IID.
3. **High-Fidelity Mock Fallback:** If `GEMINI_API_KEY` or `GITLAB_PERSONAL_ACCESS_TOKEN` is missing, blank, or matches a default placeholder (like starting with `AIzaSy...` or `glpat-...`), **automatically fall back to a mock data response** containing pre-computed senior reviews (this makes local local development fast and painless without strict API dependency setups).
4. **GitLab Context Fetching:**
   * Fetch Merge Request diff changes (`/projects/${projectId}/merge_requests/${mrIid}/changes`) - slice to max 10 files.
   * Fetch the last 5 merged MR titles for historical project context (`/projects/${projectId}/merge_requests?state=merged&per_page=5`).
   * Fetch existing human comments (`/projects/${projectId}/merge_requests/${mrIid}/notes`) to prevent review duplication.
5. **Construct Gemini AI Prompt:** Make Gemini act as a 10-year senior software engineer. Ask it to output a strict JSON structure containing:
   * `summary` (2-3 sentences)
   * `healthScore` (Integer from 1-10)
   * `issues` array where each issue contains `severity` (CRITICAL, WARNING, SUGGESTION), `title`, `file`, `explanation`, `fix` (corrected code block), and `comment` (Full markdown review ready to post).
6. **Query Gemini:** Make a `fetch` call to Gemini `gemini-2.5-flash:generateContent` using JSON schema configuration settings.
7. **Extract JSON:** Parse response using regex extraction `rawTextResponse.match(/\{[\s\S]*\}/)`.
8. **GitLab Comments Publishing:**
   * Run a loop iterating through the findings.
   * POST each finding comment back to GitLab (`/projects/${projectId}/merge_requests/${mrIid}/notes`).
   * Add a `300ms` delay between each POST request to avoid hitting GitLab rate-limits.
   * Post a final beautiful summary review comment with health score and MergeMinD branding footer.
9. **Response:** Return `ReviewResponse` to frontend containing `summary`, `healthScore`, `issues` and count of `commentsPosted`.

---

### 6. App Root Page (`app/page.tsx`)

Binds everything together:
* Evaluates active Firebase user state using `onAuthStateChanged`.
* Renders an elegant custom spinner loading screen while initializing session state.
* If user is unauthenticated, mounts `<AuthPage />`.
* If authenticated:
  * Mounts `<Header />`.
  * Hero header with a glowing brand title: "MergeMinD".
  * Badge pills highlighting architecture ("Powered by Gemini 2.5 Flash", "GitLab MCP", etc.).
  * Mounts `<MRInput />`.
  * Active console loading logs block:
    * "Fetching MR diff from GitLab..."
    * "Reading past MRs for context..."
    * "Gemini is reviewing your code..."
  * Error warning boxes styled with shake animations.
  * Mounts `<ReviewPanel />` upon successful review resolution.
```

---

## Technical Features to Ensure During Re-generation

When you generate or review the codebase, confirm that the following architectural items are properly met:

### High-Fidelity Mock Database
The mock response inside `app/api/review/route.ts` must contain detailed, pre-configured evaluations for two scenarios to provide an immersive developer demo out of the box:
1. **User Authentication Scenario (`auth` or `user` in URL):** Returns high-fidelity criticisms on plain text password storage (Critical), missing duplicate validations (Warning), and loose comparison operators (Suggestion).
2. **Database Connection Scenario (Default URL):** Returns warnings on potential database connection leaks in `lib/db.ts` (Critical) and missing payload validations inside `route.ts` (Warning).

### CSS Micro-Animations
The CSS stylesheet must contain exact class implementations for `animate-shake`, `pulse-glow`, `text-glow-orange`, and the blurs `bg-radial-glow` / `bg-radial-purple-glow`. This guarantees that the UI feels premium and visually wows the user immediately.

### Secure Environment Management
Ensure that `.env.example` lists the client-side keys with the prefix `NEXT_PUBLIC_` so they are successfully passed down to the Firebase SDK by Next.js compilers.
