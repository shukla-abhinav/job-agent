import type { UsageInfo } from '../types';

interface UsageMeterProps {
  usage: UsageInfo;
}

function colorClass(used: number, limit: number): string {
  const pct = used / limit;
  if (pct >= 1) return 'text-red-600';
  if (pct >= 0.8) return 'text-amber-600';
  return 'text-emerald-600';
}

function barColor(used: number, limit: number): string {
  const pct = used / limit;
  if (pct >= 1) return 'bg-red-500';
  if (pct >= 0.8) return 'bg-amber-500';
  return 'bg-emerald-500';
}

export function UsageMeter({ usage }: UsageMeterProps) {
  const { used, limit, remaining, resets_in_minutes } = usage;
  const pct = Math.min(1, used / limit);
  const isExhausted = remaining === 0;

  return (
    <div id="usage-meter" className="flex items-center gap-2.5 group relative">
      {/* Text label */}
      <div className="flex items-center gap-1.5">
        <svg className={`w-3.5 h-3.5 ${colorClass(used, limit)}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className={`text-xs font-semibold tabular-nums ${colorClass(used, limit)}`}>
          {used} / {limit}
        </span>
        <span className="text-xs text-slate-400 hidden sm:inline">requests this hour</span>
      </div>

      {/* Progress bar */}
      <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor(used, limit)}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>

      {/* Tooltip */}
      <div className="absolute top-full right-0 mt-2 z-50 hidden group-hover:block pointer-events-none">
        <div className="bg-slate-900 text-white text-xs rounded-xl px-3 py-2.5 whitespace-nowrap shadow-xl border border-slate-700 min-w-[200px]">
          {isExhausted ? (
            <>
              <p className="font-semibold text-red-400">Rate limit reached</p>
              <p className="text-slate-400 mt-0.5">Resets in {resets_in_minutes} min</p>
            </>
          ) : (
            <>
              <p className="font-semibold">{remaining} request{remaining !== 1 ? 's' : ''} remaining</p>
              <p className="text-slate-400 mt-0.5">Resets in {resets_in_minutes} min</p>
            </>
          )}
          <div className="mt-2 w-full h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${barColor(used, limit)}`}
              style={{ width: `${pct * 100}%` }}
            />
          </div>
          <p className="text-slate-500 mt-1">{used} of {limit} used</p>
        </div>
      </div>
    </div>
  );
}

/** Shown as a full-page overlay when the rate limit is reached during an action. */
export function RateLimitBanner({ usage, onDismiss }: { usage: UsageInfo; onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-red-100 max-w-sm w-full p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Hourly limit reached</h2>
          <p className="text-sm text-slate-500 mt-1">
            You've used all {usage.limit} requests for this hour.
          </p>
          <p className="text-sm font-medium text-slate-700 mt-1">
            Resets in <strong>{usage.resets_in_minutes} minutes</strong>.
          </p>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-red-500 rounded-full w-full" />
        </div>
        <p className="text-xs text-slate-400">{usage.used} / {usage.limit} requests used this hour</p>
        <button
          onClick={onDismiss}
          className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
