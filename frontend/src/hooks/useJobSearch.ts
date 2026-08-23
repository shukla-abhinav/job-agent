import { useState, useCallback } from 'react';
import { searchJobs, RateLimitError } from '../api/client';
import type { SearchConfig } from '../api/client';
import type { JobListing, JobSearchResponse } from '../types';

export type { SearchConfig };

const SESSION_KEY = 'jsa_jobs_state';

interface CachedJobState {
  jobs: JobListing[];
  page: number;
  hasNext: boolean;
  total: number;
  hasSearched: boolean;
  searchConfig: SearchConfig;
}

function loadFromSession(): Partial<CachedJobState> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveToSession(state: CachedJobState) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    // SessionStorage not available — silently ignore
  }
}

const DEFAULT_CONFIG: SearchConfig = {
  siteMode: 'trusted',
  selectedSites: [],
  includeCareerPages: false,
};

interface UseJobSearchState {
  jobs: JobListing[];
  loading: boolean;
  error: string | null;
  rateLimitError: RateLimitError | null;
  page: number;
  hasNext: boolean;
  total: number;
  hasSearched: boolean;
  searchConfig: SearchConfig;
  setSearchConfig: (config: SearchConfig) => void;
  fetchJobs: (page?: number, config?: SearchConfig) => Promise<void>;
  nextPage: () => void;
  prevPage: () => void;
  clearRateLimitError: () => void;
}

export function useJobSearch(): UseJobSearchState {
  const cached = loadFromSession();

  const [jobs, setJobs] = useState<JobListing[]>(cached.jobs ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState<RateLimitError | null>(null);
  const [page, setPage] = useState(cached.page ?? 1);
  const [hasNext, setHasNext] = useState(cached.hasNext ?? false);
  const [total, setTotal] = useState(cached.total ?? 0);
  const [hasSearched, setHasSearched] = useState(cached.hasSearched ?? false);
  const [searchConfig, setSearchConfigState] = useState<SearchConfig>(
    cached.searchConfig ?? DEFAULT_CONFIG
  );

  const setSearchConfig = useCallback((config: SearchConfig) => {
    setSearchConfigState(config);
  }, []);

  const fetchJobs = useCallback(
    async (targetPage = 1, configOverride?: SearchConfig) => {
      const config = configOverride ?? searchConfig;
      setLoading(true);
      setError(null);
      setRateLimitError(null);
      try {
        const data: JobSearchResponse = await searchJobs(targetPage, 10, config);
        setJobs(data.jobs);
        setPage(data.page);
        setHasNext(data.has_next);
        setTotal(data.total);
        setHasSearched(true);

        // Persist to sessionStorage so refresh restores listing
        saveToSession({
          jobs: data.jobs,
          page: data.page,
          hasNext: data.has_next,
          total: data.total,
          hasSearched: true,
          searchConfig: config,
        });
      } catch (err) {
        if (err instanceof RateLimitError) {
          setRateLimitError(err);
          setError(`Rate limit: ${err.used}/${err.limit} requests used this hour. Resets in ${err.resetsInMinutes} min.`);
        } else {
          const detail = (err as { detail?: string })?.detail;
          setError(detail ?? 'Failed to fetch jobs.');
          setJobs([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [searchConfig]
  );

  const nextPage = useCallback(() => {
    if (hasNext) fetchJobs(page + 1);
  }, [hasNext, page, fetchJobs]);

  const prevPage = useCallback(() => {
    if (page > 1) fetchJobs(page - 1);
  }, [page, fetchJobs]);

  const clearRateLimitError = useCallback(() => setRateLimitError(null), []);

  return {
    jobs,
    loading,
    error,
    rateLimitError,
    page,
    hasNext,
    total,
    hasSearched,
    searchConfig,
    setSearchConfig,
    fetchJobs,
    nextPage,
    prevPage,
    clearRateLimitError,
  };
}
