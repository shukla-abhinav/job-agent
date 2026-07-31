import { useState, useCallback } from 'react';
import { searchJobs } from '../api/client';
import type { SearchConfig } from '../api/client';
import type { JobListing, JobSearchResponse, ApiError } from '../types';

export type { SearchConfig };

interface UseJobSearchState {
  jobs: JobListing[];
  loading: boolean;
  error: string | null;
  page: number;
  hasNext: boolean;
  total: number;
  searchConfig: SearchConfig;
  setSearchConfig: (config: SearchConfig) => void;
  fetchJobs: (page?: number, config?: SearchConfig) => Promise<void>;
  nextPage: () => void;
  prevPage: () => void;
}

const DEFAULT_CONFIG: SearchConfig = {
  siteMode: 'trusted',
  selectedSites: [],
  includeCareerPages: false,
};

export function useJobSearch(): UseJobSearchState {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [total, setTotal] = useState(0);
  const [searchConfig, setSearchConfig] = useState<SearchConfig>(DEFAULT_CONFIG);

  const fetchJobs = useCallback(
    async (targetPage: number = 1, configOverride?: SearchConfig) => {
      const config = configOverride ?? searchConfig;
      setLoading(true);
      setError(null);
      try {
        const data: JobSearchResponse = await searchJobs(targetPage, 10, config);
        setJobs(data.jobs);
        setPage(data.page);
        setHasNext(data.has_next);
        setTotal(data.total);
      } catch (err) {
        const apiErr = err as ApiError;
        setError(apiErr.detail ?? 'Failed to fetch jobs.');
        setJobs([]);
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

  return { jobs, loading, error, page, hasNext, total, searchConfig, setSearchConfig, fetchJobs, nextPage, prevPage };
}
