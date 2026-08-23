import type { JobListing, MatchResult } from '../../types';

interface JobCardProps {
  job: JobListing;
  matchResult?: MatchResult | null;
  /** Open the detail modal (card body click) */
  onClick: (job: JobListing) => void;
  /** Open modal and auto-run Analyze Fit */
  onAnalyze: (job: JobListing) => void;
  /** Open modal and auto-run Get Resume Update Suggestion */
  onSuggest: (job: JobListing) => void;
}

function ScoreBadge({ score, recommendation }: { score: number; recommendation: string }) {
  const color =
    recommendation === 'Apply'
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : recommendation === 'Consider'
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-red-100 text-red-700 border-red-200';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {score}% · {recommendation}
    </span>
  );
}

function RelativeTime({ posted }: { posted?: string }) {
  if (!posted) return null;
  return (
    <span className="text-xs text-slate-400 flex items-center gap-1">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {posted}
    </span>
  );
}

export function JobCard({ job, matchResult, onClick, onAnalyze, onSuggest }: JobCardProps) {
  const isRemote =
    job.location.toLowerCase().includes('remote') ||
    job.location.toLowerCase().includes('anywhere');

  const applyUrl = job.apply_link ?? (job as unknown as Record<string, string>)['apply_url'] ?? '';

  return (
    <div
      className="group relative bg-white border border-slate-200 rounded-2xl overflow-hidden
                 hover:border-blue-300 hover:shadow-md hover:shadow-blue-50
                 transition-all duration-200 ease-out"
    >
      {/* Clickable body */}
      <div
        onClick={() => onClick(job)}
        className="p-5 cursor-pointer"
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 text-base leading-snug truncate group-hover:text-blue-700 transition-colors">
              {job.title}
            </h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm text-slate-600 font-medium">{job.company}</span>
              <span className="text-slate-300">·</span>
              <span className="text-sm text-slate-500 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {job.location}
              </span>
            </div>
          </div>

          {matchResult && (
            <ScoreBadge score={matchResult.score} recommendation={matchResult.recommendation} />
          )}
        </div>

        {/* Description snippet */}
        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-3">
          {job.description || 'Click to view job description and analyze fit.'}
        </p>

        {/* Meta tags */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {isRemote && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                </svg>
                Remote
              </span>
            )}
            {job.job_type && (
              <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                {job.job_type}
              </span>
            )}
            {job.salary && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700">
                {job.salary}
              </span>
            )}
          </div>
          <RelativeTime posted={job.posted_at} />
        </div>
      </div>

      {/* ── Action bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0 border-t border-slate-100 divide-x divide-slate-100">

        {/* Apply */}
        {applyUrl ? (
          <a
            id={`job-apply-${job.id}`}
            href={applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold
                       text-emerald-700 hover:bg-emerald-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Apply
          </a>
        ) : (
          <button
            id={`job-apply-${job.id}`}
            onClick={(e) => { e.stopPropagation(); onClick(job); }}
            title="No direct link available — view listing for apply link"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold
                       text-slate-400 hover:bg-slate-50 transition-colors cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Apply
          </button>
        )}

        {/* Analyze Fit */}
        <button
          id={`job-analyze-${job.id}`}
          onClick={(e) => { e.stopPropagation(); onAnalyze(job); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold
                     text-blue-700 hover:bg-blue-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Analyze Fit
        </button>

        {/* Get Resume Update Suggestion */}
        <button
          id={`job-suggest-${job.id}`}
          onClick={(e) => { e.stopPropagation(); onSuggest(job); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold
                     text-violet-700 hover:bg-violet-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Resume Suggestion
        </button>
      </div>
    </div>
  );
}
