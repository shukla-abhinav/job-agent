import { useState } from 'react';
import { useJobSearch } from '../../hooks/useJobSearch';
import { useJobDetails } from '../../hooks/useJobDetails';
import { JobCard } from './JobCard';
import { JobDetailModal } from './JobDetailModal';
import { JobSearchConfig } from './JobSearchConfig';
import type { SearchConfig } from '../../hooks/useJobSearch';

export function JobDiscoveryView() {
  const {
    jobs,
    loading,
    error,
    page,
    hasNext,
    total,
    searchConfig,
    setSearchConfig,
    fetchJobs,
    nextPage,
    prevPage,
  } = useJobSearch();

  const {
    selectedJob,
    matchResult,
    suggestions,
    builtResume,
    analyzingMatch,
    analyzingSuggestions,
    buildingResume,
    matchError,
    suggestionsError,
    resumeBuildError,
    selectJob,
    closeJob,
    runAnalysis,
    runSuggestions,
    runBuildResume,
  } = useJobDetails();

  // Whether we've already done a search (show config panel before first search)
  const [hasSearched, setHasSearched] = useState(false);

  const handleConfigChange = (config: SearchConfig) => {
    setSearchConfig(config);
  };

  const handleSearch = () => {
    setHasSearched(true);
    fetchJobs(1, searchConfig);
  };

  const hasJobs = jobs.length > 0;

  return (
    <div className="space-y-6">

      {/* Config panel — always visible before first search, collapsible after */}
      {!hasSearched ? (
        <JobSearchConfig
          config={searchConfig}
          onConfigChange={handleConfigChange}
          onSearch={handleSearch}
          loading={loading}
        />
      ) : (
        /* Compact search bar after first search */
        <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-white rounded-2xl border border-slate-200">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-slate-700">
              {searchConfig.siteMode === 'trusted' ? 'Trusted Sites' : `${searchConfig.selectedSites.length} custom sites`}
            </span>
            {searchConfig.includeCareerPages && (
              <span className="px-2 py-0.5 text-xs font-medium bg-violet-50 text-violet-700 border border-violet-100 rounded-full">
                + career pages
              </span>
            )}
            <button
              onClick={() => setHasSearched(false)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium underline underline-offset-2"
            >
              Change settings
            </button>
          </div>
          <button
            id="find-jobs-search-button"
            onClick={handleSearch}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700
                       disabled:opacity-60 disabled:cursor-not-allowed
                       text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-blue-200"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Searching…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-semibold text-red-800 text-sm">Failed to load jobs</p>
            <p className="text-red-700 text-sm mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Skeleton loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-5/6" />
              </div>
              <div className="mt-3 flex gap-2">
                <div className="h-5 bg-slate-100 rounded-full w-16" />
                <div className="h-5 bg-slate-100 rounded-full w-24" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Job list */}
      {!loading && hasJobs && (
        <>
          {/* Results count */}
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              Showing page <strong className="text-slate-700">{page}</strong>
              {total > 0 && <> · ~{total} results</>}
            </span>
          </div>

          {/* Cards */}
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                matchResult={null}
                onClick={selectJob}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">
            <button
              id="jobs-prev-page"
              onClick={prevPage}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600
                         bg-white border border-slate-200 rounded-xl hover:bg-slate-50
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <span className="text-sm font-semibold text-slate-700 px-3 py-1.5 bg-slate-100 rounded-lg">
              Page {page}
            </span>

            <button
              id="jobs-next-page"
              onClick={nextPage}
              disabled={!hasNext || loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600
                         bg-white border border-slate-200 rounded-xl hover:bg-slate-50
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </>
      )}

      {/* Job detail modal */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          matchResult={matchResult}
          suggestions={suggestions}
          builtResume={builtResume}
          analyzingMatch={analyzingMatch}
          analyzingSuggestions={analyzingSuggestions}
          buildingResume={buildingResume}
          matchError={matchError}
          suggestionsError={suggestionsError}
          resumeBuildError={resumeBuildError}
          onClose={closeJob}
          onAnalyze={runAnalysis}
          onSuggest={runSuggestions}
          onBuildResume={runBuildResume}
        />
      )}
    </div>
  );
}
