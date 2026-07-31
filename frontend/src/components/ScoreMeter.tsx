import type { Recommendation } from '../types';

interface ScoreMeterProps {
  score: number;
  recommendation: Recommendation;
}

function getScoreColor(score: number): { stroke: string; text: string; bg: string } {
  if (score >= 75) return { stroke: '#22c55e', text: 'text-green-600', bg: 'bg-green-50' };
  if (score >= 50) return { stroke: '#f59e0b', text: 'text-amber-600', bg: 'bg-amber-50' };
  return { stroke: '#ef4444', text: 'text-red-500', bg: 'bg-red-50' };
}

const recommendationConfig: Record<Recommendation, { label: string; className: string }> = {
  Apply: {
    label: '✓ Apply',
    className: 'bg-green-100 text-green-800 border border-green-200',
  },
  Consider: {
    label: '~ Consider',
    className: 'bg-amber-100 text-amber-800 border border-amber-200',
  },
  Skip: {
    label: '✕ Skip',
    className: 'bg-red-100 text-red-700 border border-red-200',
  },
};

export function ScoreMeter({ score, recommendation }: ScoreMeterProps) {
  const { stroke, text, bg } = getScoreColor(score);
  const config = recommendationConfig[recommendation];

  // SVG circle parameters
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={`flex flex-col items-center gap-4 p-6 rounded-2xl ${bg}`}>
      {/* Circular score indicator */}
      <div className="relative">
        <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
          {/* Track */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="10"
          />
          {/* Progress */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-bold ${text}`}>{score}</span>
          <span className="text-xs text-slate-500 font-medium">/ 100</span>
        </div>
      </div>

      {/* Recommendation badge */}
      <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${config.className}`}>
        {config.label}
      </span>
    </div>
  );
}
