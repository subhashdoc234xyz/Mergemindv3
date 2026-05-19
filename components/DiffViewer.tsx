'use client';

import { useState } from 'react';
import { ShieldAlert, AlertTriangle, Lightbulb, Code, GitMerge, FileCode } from 'lucide-react';

interface InlineComment {
  line: number;
  severity: 'CRITICAL' | 'WARNING' | 'SUGGESTION';
  title: string;
  body: string;
  fix: string;
}

const INLINE_COMMENTS: InlineComment[] = [
  {
    line: 8,
    severity: 'CRITICAL',
    title: 'Plain Text Password Storage',
    body: 'Storing user passwords directly in memory as plain text is highly insecure. If memory dumps are leaked or database snapshots are obtained, all credentials are exposed. Use bcrypt to hash passwords with a high work factor (salt rounds of 10-12).',
    fix: 'const hashedPassword = await bcrypt.hash(password, 12);'
  },
  {
    line: 14,
    severity: 'WARNING',
    title: 'Duplicate User Conflict',
    body: 'No duplicate checking is performed prior to pushing to the `users` array. This allows registering the same username multiple times, leading to authentication ambiguity and login failures during retrieval.',
    fix: 'if (users.some(u => u.username === username)) return false;'
  },
  {
    line: 20,
    severity: 'SUGGESTION',
    title: 'Loose Equality Operator',
    body: 'Using loose equality (==) allows implicit type coercion which can cause unexpected authentication bypasses (e.g. matching empty strings or null). Use strict equality (===) instead.',
    fix: 'const user = users.find(u => u.username === username && u.password === password);'
  }
];

const ORIGINAL_LINES = [
  "const users = [];",
  "",
  "function registerUser(username, password) {",
  "  // Bug 1: No input validation",
  "  // Bug 2: Storing plain text password",
  "  // Bug 3: No duplicate check",
  "  users.push({ username, password });",
  "  return true;",
  "}",
  "",
  "function loginUser(username, password) {",
  "  // Bug 4: == instead of ===",
  "  const user = users.find(u => u.username == username && u.password == password);",
  "  if (user) {",
  "    // Bug 5: No session token generated, just returns true",
  "    return true;",
  "  }",
  "  return false;",
  "}"
];

const MODIFIED_LINES = [
  "const users = [];",
  "const bcrypt = require('bcrypt'); // Added dependency",
  "",
  "async function registerUser(username, password) {",
  "  // Hashing passwords & checking duplicates",
  "  if (!username || !password || password.length < 8) return false;",
  "  if (users.some(u => u.username === username)) return false;",
  "  ",
  "  const hashedPassword = await bcrypt.hash(password, 12);",
  "  users.push({ username, password: hashedPassword });",
  "  return true;",
  "}",
  "",
  "function loginUser(username, password) {",
  "  // Using strict equality and safe lookup",
  "  const user = users.find(u => u.username === username);",
  "  if (user && bcrypt.compareSync(password, user.password)) {",
  "    return true; // Simple auth verified",
  "  }",
  "  return false;",
  "}"
];

const SEVERITY_STYLES = {
  CRITICAL: {
    bg: 'bg-rose-950/45 border-rose-900/60',
    text: 'text-rose-400',
    border: 'border-rose-900',
    icon: ShieldAlert
  },
  WARNING: {
    bg: 'bg-amber-950/45 border-amber-900/60',
    text: 'text-amber-400',
    border: 'border-amber-900',
    icon: AlertTriangle
  },
  SUGGESTION: {
    bg: 'bg-cyan-950/45 border-cyan-900/60',
    text: 'text-cyan-400',
    border: 'border-cyan-900',
    icon: Lightbulb
  }
};

export default function DiffViewer() {
  const [viewMode, setViewMode] = useState<'DIFF' | 'ORIGINAL' | 'MODIFIED'>('DIFF');

  return (
    <div className="rounded-2xl border border-slate-900 bg-slate-950/30 overflow-hidden shadow-2xl">
      {/* Visual panel header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 border-b border-slate-900 bg-slate-900/10 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <FileCode className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-200">auth.js</h3>
            <p className="text-[10px] text-slate-500 font-mono">feature/user-auth vs main</p>
          </div>
        </div>

        {/* View mode toggle tabs */}
        <div className="flex p-0.5 rounded-xl bg-slate-950/80 border border-slate-900 text-[10px] sm:text-xs">
          <button
            onClick={() => setViewMode('DIFF')}
            className={`px-3 py-1.5 rounded-lg font-medium outline-none transition-all ${
              viewMode === 'DIFF' ? 'bg-slate-800 text-orange-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Review & Inline Comments
          </button>
          <button
            onClick={() => setViewMode('ORIGINAL')}
            className={`px-3 py-1.5 rounded-lg font-medium outline-none transition-all ${
              viewMode === 'ORIGINAL' ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Original
          </button>
          <button
            onClick={() => setViewMode('MODIFIED')}
            className={`px-3 py-1.5 rounded-lg font-medium outline-none transition-all ${
              viewMode === 'MODIFIED' ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Proposed Fix
          </button>
        </div>
      </div>

      {/* Code Render Area */}
      <div className="p-4 overflow-x-auto font-mono text-xs sm:text-sm leading-relaxed max-h-[500px] overflow-y-auto">
        {viewMode === 'ORIGINAL' && (
          <table className="w-full border-collapse">
            <tbody>
              {ORIGINAL_LINES.map((line, idx) => (
                <tr key={idx} className="hover:bg-slate-900/30">
                  <td className="w-10 text-right pr-4 text-slate-700 select-none text-[11px] font-sans border-r border-slate-900/60">{idx + 1}</td>
                  <td className="pl-4 text-slate-400 whitespace-pre">{line || ' '}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {viewMode === 'MODIFIED' && (
          <table className="w-full border-collapse">
            <tbody>
              {MODIFIED_LINES.map((line, idx) => (
                <tr key={idx} className="hover:bg-slate-900/30">
                  <td className="w-10 text-right pr-4 text-slate-700 select-none text-[11px] font-sans border-r border-slate-900/60">{idx + 1}</td>
                  <td className="pl-4 text-slate-300 whitespace-pre">{line || ' '}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {viewMode === 'DIFF' && (
          <div className="space-y-0.5">
            {/* Custom visual git diff renderer with inlined review notes */}
            {ORIGINAL_LINES.map((line, idx) => {
              const lineNum = idx + 1;
              const hasCritical = lineNum === 7;
              const hasWarning = lineNum === 7; // Wait, let's map exactly to lines
              
              // We'll customize deletions/additions
              let trBg = "hover:bg-slate-900/20";
              let linePrefix = " ";
              let textColor = "text-slate-400";

              if (lineNum === 7) {
                // Bug 3 deletion line
                trBg = "bg-rose-950/20 text-rose-300";
                linePrefix = "-";
              } else if (lineNum === 13) {
                // Bug 4 deletion line
                trBg = "bg-rose-950/20 text-rose-300";
                linePrefix = "-";
              }

              // Check if there is an inline comment for this line
              // We place comments under lines 7, 13
              const inlineComment = INLINE_COMMENTS.find(c => c.line === lineNum || (c.line === 8 && lineNum === 7) || (c.line === 14 && lineNum === 7) || (c.line === 20 && lineNum === 13));

              return (
                <div key={idx} className="space-y-3">
                  <div className={`flex w-full ${trBg} py-0.5 rounded px-2`}>
                    <div className="w-10 text-right pr-4 text-slate-700 select-none text-[11px] font-sans border-r border-slate-900/60">{lineNum}</div>
                    <div className="w-5 text-center text-slate-600 select-none text-[11px]">{linePrefix}</div>
                    <div className={`pl-2 whitespace-pre flex-1 ${textColor}`}>{line || ' '}</div>
                  </div>

                  {/* Render the inlined comment directly underneath if match */}
                  {lineNum === 7 && (
                    <div className="pl-14 pr-2 pb-3 pt-1">
                      <div className="rounded-xl border border-rose-900 bg-rose-950/20 p-4 space-y-3">
                        <div className="flex items-center gap-2 text-rose-400">
                          <ShieldAlert className="w-4 h-4 shadow-sm" />
                          <span className="text-xs font-bold uppercase tracking-wider">CRITICAL — Plain Text Password Storage</span>
                        </div>
                        <p className="text-xs text-slate-300 font-sans leading-relaxed">
                          Storing user passwords directly in memory as plain text is highly insecure. If memory dumps are leaked or database snapshots are obtained, all credentials are exposed. Use bcrypt to hash passwords with a high work factor (salt rounds of 10-12).
                        </p>
                        <div className="rounded-lg bg-slate-950 border border-slate-900 p-2.5 font-mono text-[11px] text-slate-400">
                          <div className="text-[10px] text-slate-600 mb-1">RECOMMENDED CORRECTION</div>
                          <span className="text-emerald-400">{"+ const hashedPassword = await bcrypt.hash(password, 12);"}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {lineNum === 7 && (
                    <div className="pl-14 pr-2 pb-3 pt-1">
                      <div className="rounded-xl border border-amber-900 bg-amber-950/20 p-4 space-y-3">
                        <div className="flex items-center gap-2 text-amber-400">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-wider">WARNING — Missing Duplicate User Verification</span>
                        </div>
                        <p className="text-xs text-slate-300 font-sans leading-relaxed">
                          No duplicate checking is performed prior to pushing to the `users` array. This allows registering the same username multiple times, leading to authentication ambiguity and login failures during retrieval.
                        </p>
                        <div className="rounded-lg bg-slate-950 border border-slate-900 p-2.5 font-mono text-[11px] text-slate-400">
                          <div className="text-[10px] text-slate-600 mb-1">RECOMMENDED CORRECTION</div>
                          <span className="text-emerald-400">{"+ if (users.some(u => u.username === username)) return false;"}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {lineNum === 13 && (
                    <div className="pl-14 pr-2 pb-3 pt-1">
                      <div className="rounded-xl border border-cyan-900 bg-cyan-950/20 p-4 space-y-3">
                        <div className="flex items-center gap-2 text-cyan-400">
                          <Lightbulb className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-wider">SUGGESTION — Loose Equality Comparison</span>
                        </div>
                        <p className="text-xs text-slate-300 font-sans leading-relaxed">
                          Using loose equality (==) for string comparisons is susceptible to unexpected evaluation behaviors. Using strict equality (===) prevents JavaScript's type coercion and enhances predictability.
                        </p>
                        <div className="rounded-lg bg-slate-950 border border-slate-900 p-2.5 font-mono text-[11px] text-slate-400">
                          <div className="text-[10px] text-slate-600 mb-1">RECOMMENDED CORRECTION</div>
                          <span className="text-emerald-400">{"+ const user = users.find(u => u.username === username && ...);"}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Code diff Footer */}
      <div className="px-5 py-3 border-t border-slate-900 bg-slate-950 text-[10px] text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <GitMerge className="w-3.5 h-3.5 text-orange-500" />
          <span>Interactive MR Diff Simulation</span>
        </span>
        <span>Comments are live on the MR branch</span>
      </div>
    </div>
  );
}
