import { useState, useCallback } from 'react';
import { generateResume } from '../api/client';
import type { ResumeResult, ApiError } from '../types';

interface UseResumeGeneratorState {
  result: ResumeResult | null;
  loading: boolean;
  error: string | null;
  generate: (jobDescription: string) => Promise<void>;
  reset: () => void;
}

export function useResumeGenerator(): UseResumeGeneratorState {
  const [result, setResult] = useState<ResumeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (jobDescription: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await generateResume(jobDescription);
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

  return { result, loading, error, generate, reset };
}
