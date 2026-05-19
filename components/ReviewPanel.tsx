'use client';

import { ReviewResponse } from '@/app/api/review/route';

interface Props {
  review: ReviewResponse;
}

export default function ReviewPanel({ review }: Props) {
  const criticalCount = review.issues.filter((i) => i.severity === 'CRITICAL').length;
  const warningCount = review.issues.filter((i) => i.severity === 'WARNING').length;
  const suggestionCount = review.issues.filter((i) => i.severity === 'SUGGESTION').length;

  // Health score color scheme
  let scoreColorClass = 'text-emerald-400';
  if (review.healthScore < 5) {
    scoreColorClass = 'text-red-400';
  } else if (review.healthScore < 8) {
    scoreColorClass = 'text-yellow-400';
  }

  return (
    <div className="w-full space-y-8 animate-fade-in">
      {/* Summary Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800/60 pb-4">
          <div className="space-y-2">
            {/* Severity count breakdown pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-400/10 border border-red-400/20 text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {criticalCount} Critical{criticalCount !== 1 ? 's' : ''}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-400/10 border border-yellow-400/20 text-yellow-400">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                {warningCount} Warning{warningCount !== 1 ? 's' : ''}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-400/10 border border-blue-400/20 text-blue-400">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                {suggestionCount} Suggestion{suggestionCount !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Comments Posted + Live badge */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live on GitLab
              </span>
              <span className="text-xs text-gray-500">
                Posted {review.commentsPosted} comment{review.commentsPosted !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Health score badge */}
          <div className="flex flex-col items-center justify-center bg-gray-950/45 border border-gray-800/80 rounded-xl p-3 min-w-[90px] shadow-inner text-center">
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">HEALTH</span>
            <span className={`text-3xl font-extrabold tracking-tight ${scoreColorClass}`}>
              {review.healthScore}/10
            </span>
          </div>
        </div>

        {/* Overall summary explanation */}
        <p className="text-gray-400 text-sm leading-relaxed">
          {review.summary}
        </p>
      </div>

      {/* Issues list header */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">
          Review Findings ({review.issues.length})
        </h3>
        
        {review.issues.length === 0 ? (
          <div className="text-center py-10 border border-gray-800/50 rounded-xl bg-gray-900/10 text-gray-500 text-sm">
            No issues found. Your code is clean!
          </div>
        ) : (
          <div className="space-y-4">
            {review.issues.map((issue, index) => {
              // Custom styles depending on severity
              let severityBg = '';
              let severityDot = '';
              
              if (issue.severity === 'CRITICAL') {
                severityBg = 'bg-red-400/10 border-red-400/20 text-red-400';
                severityDot = 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]';
              } else if (issue.severity === 'WARNING') {
                severityBg = 'bg-yellow-400/10 border-yellow-400/20 text-yellow-400';
                severityDot = 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]';
              } else {
                severityBg = 'bg-blue-400/10 border-blue-400/20 text-blue-400';
                severityDot = 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]';
              }

              return (
                <div
                  key={index}
                  className={`border rounded-xl p-5 space-y-3.5 transition-all duration-300 hover:scale-[1.005] shadow-lg ${severityBg}`}
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${severityDot}`} />
                      <span className="text-[10px] font-extrabold uppercase tracking-widest border-r border-current pr-2 leading-none">
                        {issue.severity}
                      </span>
                      <h4 className="text-sm font-bold text-white tracking-wide">
                        {issue.title}
                      </h4>
                    </div>

                    {/* Monospace File Path */}
                    <span className="text-[11px] font-mono text-gray-500 self-start sm:self-center select-all bg-gray-950/65 px-2 py-0.5 rounded border border-gray-800/80 max-w-full truncate">
                      {issue.file}
                    </span>
                  </div>

                  {/* Explanation text */}
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {issue.explanation}
                  </p>

                  {/* Fix Code Block */}
                  {issue.fix && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 font-sans pl-0.5">
                        Suggested Correction:
                      </span>
                      <pre className="bg-gray-950/50 border border-gray-800/50 rounded-lg p-3.5 text-xs text-gray-200 font-mono overflow-x-auto whitespace-pre shadow-inner">
                        <code>{issue.fix}</code>
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
