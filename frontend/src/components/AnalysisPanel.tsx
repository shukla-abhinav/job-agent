import { ScoreMeter } from './ScoreMeter';
import { LoadingSpinner } from './LoadingSpinner';
import type { MatchResult } from '../types';

interface AnalysisPanelProps {
  result: MatchResult | null;
  loading: boolean;
  error: string | null;
}

function TagList({ items, variant }: { items: string[]; variant: 'success' | 'danger' }) {
  const styles = {
    success: 'bg-green-50 text-green-700 border border-green-100',
    danger: 'bg-red-50 text-red-600 border border-red-100',
  };
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${styles[variant]}`}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export function AnalysisPanel({ result, loading, error }: AnalysisPanelProps) {
  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 py-16">
        <LoadingSpinner size="lg" label="Analyzing job match with AI…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center py-16">
        <div
          id="analysis-error"
          className="w-full max-w-sm rounded-xl bg-red-50 border border-red-200 p-5 text-center"
        >
          <div className="text-3xl mb-2">⚠️</div>
          <p className="text-sm font-semibold text-red-700">Analysis Failed</p>
          <p className="text-xs text-red-600 mt-1 leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col h-full items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-600">No analysis yet</p>
        <p className="text-xs text-slate-400 mt-1">Paste a job description and click "Analyze Match"</p>
      </div>
    );
  }

  return (
    <div id="analysis-result" className="flex flex-col gap-5 h-full overflow-y-auto">
      {/* Score + Recommendation */}
      <ScoreMeter score={result.score} recommendation={result.recommendation} />

      {/* Strengths */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
          <span className="text-green-500">✓</span> Strengths
        </h3>
        {result.strengths.length > 0 ? (
          <TagList items={result.strengths} variant="success" />
        ) : (
          <p className="text-xs text-slate-400">None identified.</p>
        )}
      </div>

      {/* Missing Skills */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
          <span className="text-red-500">✕</span> Missing Skills
        </h3>
        {result.missing_skills.length > 0 ? (
          <TagList items={result.missing_skills} variant="danger" />
        ) : (
          <p className="text-xs text-slate-400">No gaps identified — great fit!</p>
        )}
      </div>

      {/* Reasoning */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Reasoning</h3>
        <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">
          {result.reasoning}
        </p>
      </div>
    </div>
  );
}
