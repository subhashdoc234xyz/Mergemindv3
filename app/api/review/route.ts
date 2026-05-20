import { NextRequest, NextResponse } from 'next/server';
import { parseMRUrl } from '@/lib/parseMRUrl';
import { getMRChanges, getRecentMRs, getMRNotes, postMRComment } from '@/lib/gitlabMcp';
import { callGemini } from '@/lib/gemini';

interface ReviewIssue {
  severity: 'CRITICAL' | 'WARNING' | 'SUGGESTION'
  title: string
  file: string
  explanation: string
  fix: string
  comment: string
}

interface ReviewResult {
  summary: string
  healthScore: number
  issues: ReviewIssue[]
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // STEP 1 — Parse request
    const { mrUrl } = await req.json()
    if (!mrUrl) return NextResponse.json({ error: 'mrUrl is required' }, { status: 400 })

    // STEP 2 — Parse MR URL
    const { projectPath, mrIid } = parseMRUrl(mrUrl)

    // STEP 3 — Fetch data from GitLab via MCP (run all three in parallel)
    const [mrData, pastMRs, notes] = await Promise.all([
      getMRChanges(projectPath, mrIid),
      getRecentMRs(projectPath),
      getMRNotes(projectPath, mrIid),
    ])

    // STEP 4 — Build the diff summary string
    const diffSummary = mrData.changes
      .slice(0, 10)
      .map(f => `FILE: ${f.new_path}\n${f.diff}`)
      .join('\n\n===\n\n')

    // STEP 5 — Build the past MRs string
    const pastMRSummary = pastMRs.map(mr => `- ${mr.title}`).join('\n')

    // STEP 6 — Build existing comments string
    const existingComments = notes
      .filter(n => !n.system)
      .map(n => n.body)
      .join('\n---\n') || 'none yet'

    // STEP 7 — Build the Gemini prompt using this exact template
    const prompt = `
You are MergeMinD — a senior software engineer with 10 years of experience reviewing production code.

## MERGE REQUEST BEING REVIEWED
Title: ${mrData.title}
Description: ${mrData.description || 'none'}
Author: ${mrData.author.name}

## CODE DIFF (changed files — max 10)
${diffSummary}

## RECENT MRS FROM THIS REPO (for codebase pattern context)
${pastMRSummary}

## EXISTING HUMAN COMMENTS (do not duplicate these)
${existingComments}

## YOUR TASK
Analyze the code diff carefully. Find real, specific problems.

Respond with ONLY a valid JSON object — no markdown fences, no explanation outside the JSON:

{
  "summary": "2-3 sentence overall assessment of code quality and main concerns",
  "healthScore": 7,
  "issues": [
    {
      "severity": "CRITICAL",
      "title": "Plain text password storage",
      "file": "auth/login.js",
      "explanation": "Passwords stored as plain strings. A database breach exposes every user account immediately.",
      "fix": "const hashed = await bcrypt.hash(password, 10);",
      "comment": "**[CRITICAL] Plain text password storage**\\n\\n**Problem:** Passwords are stored as plain strings. A database breach exposes every user account immediately.\\n\\n**Fix:**\\n\`\`\`js\\nconst hashed = await bcrypt.hash(password, 10);\\n\`\`\`\\n\\n*Reviewed by MergeMinD — Gemini 2.5 Flash + GitLab MCP*"
    }
  ]
}

Severity rules:
- CRITICAL: security holes (XSS, SQLi, auth bypass, plain text secrets), data loss bugs, broken logic that fails in production
- WARNING: missing error handling, unhandled edge cases, missing input validation, N+1 queries, performance issues
- SUGGESTION: naming improvements, refactoring, style consistency with rest of codebase

Rules:
- Maximum 8 issues
- Always include corrected code in the fix field
- Never be vague — reference the exact file and what goes wrong
- The comment field is posted directly to GitLab so format it with escaped newlines and proper markdown
- Do not flag things already mentioned in existing human comments
`

    // STEP 8 — Call Gemini
    const rawText = await callGemini(prompt)

    // STEP 9 — Extract and parse JSON
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Gemini did not return valid JSON')
    const review: ReviewResult = JSON.parse(jsonMatch[0])

    // STEP 10 — Post each issue comment to GitLab MR with 400ms delay between posts
    let commentsPosted = 0
    for (const issue of review.issues) {
      await postMRComment(projectPath, mrIid, issue.comment)
      commentsPosted++
      await new Promise(r => setTimeout(r, 400))
    }

    // STEP 11 — Post final summary comment
    const criticals = review.issues.filter(i => i.severity === 'CRITICAL').length
    const warnings = review.issues.filter(i => i.severity === 'WARNING').length
    const suggestions = review.issues.filter(i => i.severity === 'SUGGESTION').length

    const summaryComment = `## MergeMinD Review Complete

${review.summary}

**Code health score: ${review.healthScore}/10**
**Issues found:** ${criticals} critical · ${warnings} warnings · ${suggestions} suggestions

*Reviewed by MergeMinD — powered by Gemini 2.5 Flash + official GitLab MCP Server*
*Google Cloud Rapid Agent Hackathon 2026 — GitLab Partner Track*`

    await postMRComment(projectPath, mrIid, summaryComment)

    // STEP 12 — Return result
    return NextResponse.json({
      summary: review.summary,
      healthScore: review.healthScore,
      issues: review.issues,
      commentsPosted,
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('MergeMinD review error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
