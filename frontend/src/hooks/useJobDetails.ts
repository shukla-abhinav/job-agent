import { useState, useCallback } from 'react';
import { analyzeJobListing, getResumeSuggestions, buildTailoredResume, RateLimitError } from '../api/client';
import type { JobListing, MatchResult, ResumeSuggestion, ResumeResult } from '../types';

export type { RateLimitError };

interface UseJobDetailsState {
  selectedJob: JobListing | null;
  matchResult: MatchResult | null;
  suggestions: ResumeSuggestion | null;
  builtResume: ResumeResult | null;
  analyzingMatch: boolean;
  analyzingSuggestions: boolean;
  buildingResume: boolean;
  matchError: string | null;
  suggestionsError: string | null;
  resumeBuildError: string | null;
  selectJob: (job: JobListing) => void;
  closeJob: () => void;
  /** Analyze fit for `job` (or the currently selected job if omitted). Throws RateLimitError. */
  runAnalysis: (job?: JobListing) => Promise<void>;
  /** Get resume suggestions for `job` (or the currently selected job if omitted). Throws RateLimitError. */
  runSuggestions: (job?: JobListing) => Promise<void>;
  runBuildResume: () => Promise<void>;
}

export function useJobDetails(): UseJobDetailsState {
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [suggestions, setSuggestions] = useState<ResumeSuggestion | null>(null);
  const [builtResume, setBuiltResume] = useState<ResumeResult | null>(null);
  const [analyzingMatch, setAnalyzingMatch] = useState(false);
  const [analyzingSuggestions, setAnalyzingSuggestions] = useState(false);
  const [buildingResume, setBuildingResume] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [resumeBuildError, setResumeBuildError] = useState<string | null>(null);

  // ── helpers ──────────────────────────────────────────────────────────────────

  /** Select a new job, clearing previous results. */
  const selectJob = useCallback((job: JobListing) => {
    setSelectedJob(job);
    setMatchResult(null);
    setSuggestions(null);
    setBuiltResume(null);
    setMatchError(null);
    setSuggestionsError(null);
    setResumeBuildError(null);
  }, []);

  const closeJob = useCallback(() => {
    setSelectedJob(null);
    setMatchResult(null);
    setSuggestions(null);
    setBuiltResume(null);
    setMatchError(null);
    setSuggestionsError(null);
    setResumeBuildError(null);
  }, []);

  // ── runAnalysis ───────────────────────────────────────────────────────────────

  const runAnalysis = useCallback(async (jobOverride?: JobListing) => {
    const job = jobOverride ?? selectedJob;
    if (!job) return;

    // If a different job was passed, select it (opens modal automatically)
    if (jobOverride && jobOverride !== selectedJob) {
      setSelectedJob(jobOverride);
      setMatchResult(null);
      setSuggestions(null);
      setBuiltResume(null);
      setMatchError(null);
      setSuggestionsError(null);
      setResumeBuildError(null);
    }

    setAnalyzingMatch(true);
    setMatchError(null);
    try {
      const result = await analyzeJobListing(job);
      setMatchResult(result);
    } catch (err) {
      if (err instanceof RateLimitError) {
        setMatchError(`Rate limit reached (${err.used}/${err.limit}). Resets in ${err.resetsInMinutes} min.`);
        throw err; // propagate to parent for banner
      }
      const detail = (err as { detail?: string })?.detail;
      setMatchError(detail ?? 'Analysis failed.');
    } finally {
      setAnalyzingMatch(false);
    }
  }, [selectedJob]);

  // ── runSuggestions ────────────────────────────────────────────────────────────

  const runSuggestions = useCallback(async (jobOverride?: JobListing) => {
    const job = jobOverride ?? selectedJob;
    if (!job) return;

    // If a different job was passed, select it
    if (jobOverride && jobOverride !== selectedJob) {
      setSelectedJob(jobOverride);
      setMatchResult(null);
      setSuggestions(null);
      setBuiltResume(null);
      setMatchError(null);
      setSuggestionsError(null);
      setResumeBuildError(null);
    }

    setAnalyzingSuggestions(true);
    setSuggestionsError(null);
    try {
      const jobText = `Title: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\n\n${job.description}`;
      const result = await getResumeSuggestions(jobText);
      setSuggestions(result);
      setBuiltResume(null);
      setResumeBuildError(null);
    } catch (err) {
      if (err instanceof RateLimitError) {
        setSuggestionsError(`Rate limit reached (${err.used}/${err.limit}). Resets in ${err.resetsInMinutes} min.`);
        throw err;
      }
      const detail = (err as { detail?: string })?.detail;
      setSuggestionsError(detail ?? 'Failed to get suggestions.');
    } finally {
      setAnalyzingSuggestions(false);
    }
  }, [selectedJob]);

  // ── runBuildResume ────────────────────────────────────────────────────────────

  const runBuildResume = useCallback(async () => {
    if (!selectedJob || !suggestions) return;
    setBuildingResume(true);
    setResumeBuildError(null);
    try {
      const result = await buildTailoredResume({ job: selectedJob, suggestions });
      setBuiltResume(result);
    } catch (err) {
      if (err instanceof RateLimitError) {
        setResumeBuildError(`Rate limit reached (${err.used}/${err.limit}). Resets in ${err.resetsInMinutes} min.`);
        throw err;
      }
      const detail = (err as { detail?: string })?.detail;
      setResumeBuildError(detail ?? 'Failed to build resume.');
    } finally {
      setBuildingResume(false);
    }
  }, [selectedJob, suggestions]);

  return {
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
  };
}
