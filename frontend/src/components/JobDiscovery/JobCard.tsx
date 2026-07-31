import type { JobListing, MatchResult } from '../../types';

interface JobCardProps {
  job: JobListing;
  matchResult?: MatchResult | null;
  onClick: (job: JobListing) => void;
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

export function JobCard({ job, matchResult, onClick }: JobCardProps) {
  const isRemote =
    job.location.toLowerCase().includes('remote') ||
    job.location.toLowerCase().includes('anywhere');

  return (
    <div
      onClick={() => onClick(job)}
      className="group relative bg-white border border-slate-200 rounded-2xl p-5 cursor-pointer
                 hover:border-blue-300 hover:shadow-md hover:shadow-blue-50
                 transition-all duration-200 ease-out"
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

        {/* Score badge if analyzed */}
        {matchResult && (
          <ScoreBadge score={matchResult.score} recommendation={matchResult.recommendation} />
        )}
      </div>

      {/* Description snippet */}
      <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-3">
        {job.description || 'Click to view job description and analyze fit.'}
      </p>

      {/* Bottom row */}
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

      {/* Hover indicator */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}
