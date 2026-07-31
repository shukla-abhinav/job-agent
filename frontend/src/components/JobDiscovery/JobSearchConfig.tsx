import { useState } from 'react';
import type { SearchConfig } from '../../hooks/useJobSearch';

// ─── Site registry (mirrors backend SITE_REGISTRY) ────────────────────────────

interface SiteEntry {
  id: string;
  label: string;
  domain: string;
  category: 'ATS Platform' | 'Job Board' | 'Remote' | 'Startup';
  description: string;
}

const SITES: SiteEntry[] = [
  // ATS Platforms — direct from company's own system
  { id: 'greenhouse',      label: 'Greenhouse',              domain: 'boards.greenhouse.io',         category: 'ATS Platform', description: 'Most popular ATS — Google, Airbnb, Stripe' },
  { id: 'lever',           label: 'Lever',                   domain: 'jobs.lever.co',                category: 'ATS Platform', description: 'Widely used by startups & mid-size companies' },
  { id: 'workday',         label: 'Workday',                 domain: 'myworkdayjobs.com',            category: 'ATS Platform', description: 'Used by Fortune 500 & large enterprises' },
  { id: 'jobvite',         label: 'Jobvite',                 domain: 'jobs.jobvite.com',             category: 'ATS Platform', description: 'HR software used by mid-market companies' },
  { id: 'smartrecruiters', label: 'SmartRecruiters',         domain: 'jobs.smartrecruiters.com',    category: 'ATS Platform', description: 'Enterprise recruiting platform' },
  { id: 'workable',        label: 'Workable',                domain: 'apply.workable.com',           category: 'ATS Platform', description: 'Popular among SMBs and fast-growing startups' },
  { id: 'bamboohr',        label: 'BambooHR',                domain: 'bamboohr.com',                 category: 'ATS Platform', description: 'HR & hiring for small-medium businesses' },
  // Job Boards
  { id: 'linkedin',        label: 'LinkedIn Jobs',           domain: 'linkedin.com/jobs',            category: 'Job Board',    description: 'World\'s largest professional network' },
  { id: 'indeed',          label: 'Indeed',                  domain: 'indeed.com',                   category: 'Job Board',    description: 'Largest job site globally' },
  { id: 'glassdoor',       label: 'Glassdoor',               domain: 'glassdoor.com',                category: 'Job Board',    description: 'Jobs + company reviews and salary data' },
  { id: 'wellfound',       label: 'Wellfound (AngelList)',   domain: 'wellfound.com',                category: 'Job Board',    description: 'Top platform for startup & tech roles' },
  { id: 'dice',            label: 'Dice',                    domain: 'dice.com',                     category: 'Job Board',    description: 'Focused on tech & engineering roles' },
  { id: 'builtin',         label: 'Built In',                domain: 'builtin.com',                  category: 'Job Board',    description: 'Curated tech jobs at startups & tech companies' },
  { id: 'ziprecruiter',    label: 'ZipRecruiter',            domain: 'ziprecruiter.com',             category: 'Job Board',    description: 'AI-powered job matching platform' },
  { id: 'monster',         label: 'Monster',                 domain: 'monster.com',                  category: 'Job Board',    description: 'Veteran global job board' },
  // Remote-focused
  { id: 'weworkremotely',  label: 'We Work Remotely',        domain: 'weworkremotely.com',           category: 'Remote',       description: 'Largest remote work community' },
  { id: 'remotive',        label: 'Remotive',                domain: 'remotive.com',                 category: 'Remote',       description: 'Curated remote tech jobs' },
  { id: 'remoteok',        label: 'Remote OK',               domain: 'remoteok.com',                 category: 'Remote',       description: 'Remote jobs with salary data' },
  // Startup / Community
  { id: 'ycombinator',     label: 'Y Combinator Jobs',       domain: 'ycombinator.com/jobs',         category: 'Startup',      description: 'Work at a YC-backed startup' },
  { id: 'hackernews',      label: 'HN: Who is Hiring',       domain: 'news.ycombinator.com',         category: 'Startup',      description: 'Monthly hiring threads from tech community' },
];

const CATEGORY_ORDER: SiteEntry['category'][] = ['ATS Platform', 'Job Board', 'Remote', 'Startup'];

const CATEGORY_ICONS: Record<SiteEntry['category'], string> = {
  'ATS Platform': '🏢',
  'Job Board':    '📋',
  'Remote':       '🌍',
  'Startup':      '🚀',
};

const CATEGORY_COLORS: Record<SiteEntry['category'], string> = {
  'ATS Platform': 'bg-blue-50 border-blue-200 text-blue-800',
  'Job Board':    'bg-slate-50 border-slate-200 text-slate-700',
  'Remote':       'bg-emerald-50 border-emerald-200 text-emerald-800',
  'Startup':      'bg-orange-50 border-orange-200 text-orange-800',
};

// ─── Component ────────────────────────────────────────────────────────────────

interface JobSearchConfigProps {
  config: SearchConfig;
  onConfigChange: (config: SearchConfig) => void;
  onSearch: () => void;
  loading: boolean;
}

export function JobSearchConfig({ config, onConfigChange, onSearch, loading }: JobSearchConfigProps) {
  const [expandedCategory, setExpandedCategory] = useState<SiteEntry['category'] | null>(null);

  const toggleSite = (siteId: string) => {
    const next = config.selectedSites.includes(siteId)
      ? config.selectedSites.filter(id => id !== siteId)
      : [...config.selectedSites, siteId];
    onConfigChange({ ...config, selectedSites: next });
  };

  const toggleCategory = (cat: SiteEntry['category']) => {
    const catSites = SITES.filter(s => s.category === cat).map(s => s.id);
    const allSelected = catSites.every(id => config.selectedSites.includes(id));
    let next: string[];
    if (allSelected) {
      next = config.selectedSites.filter(id => !catSites.includes(id));
    } else {
      next = [...new Set([...config.selectedSites, ...catSites])];
    }
    onConfigChange({ ...config, selectedSites: next });
  };

  const categorized = CATEGORY_ORDER.map(cat => ({
    cat,
    sites: SITES.filter(s => s.category === cat),
    allSelected: SITES.filter(s => s.category === cat).every(s => config.selectedSites.includes(s.id)),
    someSelected: SITES.filter(s => s.category === cat).some(s => config.selectedSites.includes(s.id)),
  }));

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-7">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Find Jobs</h2>
        <p className="text-sm text-slate-500 mt-1">Based on your <span className="font-medium text-slate-700">preferences.md</span> · Worldwide · Past week</p>
      </div>

      {/* Mode selector */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Search on</p>
        <div className="grid grid-cols-2 gap-3">
          {/* Trusted */}
          <button
            id="search-mode-trusted"
            onClick={() => onConfigChange({ ...config, siteMode: 'trusted' })}
            className={`flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
              config.siteMode === 'trusted'
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
              config.siteMode === 'trusted' ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
            }`}>
              {config.siteMode === 'trusted' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">Trusted Sites</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                Greenhouse, Lever, Workday, LinkedIn, Glassdoor, Indeed, Wellfound
              </p>
            </div>
          </button>

          {/* Custom */}
          <button
            id="search-mode-custom"
            onClick={() => onConfigChange({ ...config, siteMode: 'custom' })}
            className={`flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
              config.siteMode === 'custom'
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
              config.siteMode === 'custom' ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
            }`}>
              {config.siteMode === 'custom' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">Custom Selection</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                Choose exactly which platforms to search from 20 sites
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Custom site picker */}
      {config.siteMode === 'custom' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Platforms</p>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {config.selectedSites.length} selected
            </span>
          </div>

          {categorized.map(({ cat, sites, allSelected, someSelected }) => (
            <div key={cat} className="rounded-2xl border border-slate-200 overflow-hidden">
              {/* Category header */}
              <button
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedCategory(expandedCategory === cat ? null : cat)}
              >
                <div className="flex items-center gap-2.5">
                  {/* Category checkbox */}
                  <div
                    onClick={(e) => { e.stopPropagation(); toggleCategory(cat); }}
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors ${
                      allSelected ? 'bg-blue-500 border-blue-500'
                        : someSelected ? 'bg-blue-200 border-blue-300'
                        : 'border-slate-300 hover:border-blue-400'
                    }`}
                  >
                    {(allSelected || someSelected) && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={allSelected ? "M5 13l4 4L19 7" : "M20 12H4"} />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm">{CATEGORY_ICONS[cat]}</span>
                  <span className="text-sm font-semibold text-slate-800">{cat}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[cat]}`}>
                    {sites.filter(s => config.selectedSites.includes(s.id)).length}/{sites.length}
                  </span>
                </div>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform ${expandedCategory === cat ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Sites grid */}
              {expandedCategory === cat && (
                <div className="px-4 pb-4 grid grid-cols-1 gap-1.5 bg-slate-50/50 border-t border-slate-100">
                  {sites.map(site => {
                    const selected = config.selectedSites.includes(site.id);
                    return (
                      <label
                        key={site.id}
                        className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                          selected
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-white border-transparent hover:border-slate-200 hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={selected}
                          onChange={() => toggleSite(site.id)}
                          id={`site-${site.id}`}
                        />
                        <div className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                          selected ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
                        }`}>
                          {selected && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-slate-800">{site.label}</span>
                            <span className="text-xs text-slate-400 font-mono">{site.domain}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{site.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Include career pages toggle */}
      <div className={`flex items-start gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
        config.includeCareerPages
          ? 'border-violet-300 bg-violet-50'
          : 'border-slate-200 hover:border-slate-300'
      }`}
        onClick={() => onConfigChange({ ...config, includeCareerPages: !config.includeCareerPages })}
      >
        <div className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          config.includeCareerPages ? 'bg-violet-500 border-violet-500' : 'border-slate-300'
        }`}>
          {config.includeCareerPages && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Include Company Career Pages</p>
          <p className="text-xs text-slate-500 mt-0.5 leading-snug">
            Also search <span className="font-mono">careers.*</span> and <span className="font-mono">jobs.*</span> subdomains — finds postings directly on company websites
          </p>
        </div>
      </div>

      {/* Search button */}
      <button
        id="search-jobs-button"
        onClick={onSearch}
        disabled={loading || (config.siteMode === 'custom' && config.selectedSites.length === 0)}
        className="w-full flex items-center justify-center gap-3 py-3.5 px-6
                   bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800
                   disabled:opacity-50 disabled:cursor-not-allowed
                   text-white font-bold text-sm rounded-2xl transition-all
                   shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-300"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Searching…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search Jobs
            {config.siteMode === 'custom' && config.selectedSites.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-white/20 rounded-full">
                {config.selectedSites.length} sites
              </span>
            )}
          </>
        )}
      </button>

      {config.siteMode === 'custom' && config.selectedSites.length === 0 && (
        <p className="text-center text-xs text-amber-600">
          ⚠️ Select at least one platform to search
        </p>
      )}
    </div>
  );
}
