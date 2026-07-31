import { useState, useCallback } from 'react';
import { analyzeMatch } from '../api/client';
import type { MatchResult, ApiError } from '../types';

interface UseJobAnalysisState {
  result: MatchResult | null;
  loading: boolean;
  error: string | null;
  analyze: (jobDescription: string) => Promise<void>;
  reset: () => void;
}

export function useJobAnalysis(): UseJobAnalysisState {
  const [result, setResult] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (jobDescription: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await analyzeMatch(jobDescription);
      setResult(data);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.detail ?? 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, loading, error, analyze, reset };
}
