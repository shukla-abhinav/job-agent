import { useState, useCallback } from 'react';
import { analyzeJobListing, getResumeSuggestions, buildTailoredResume } from '../api/client';
import type { JobListing, MatchResult, ResumeSuggestion, ResumeResult, ApiError } from '../types';

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
  runAnalysis: () => Promise<void>;
  runSuggestions: () => Promise<void>;
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

  const runAnalysis = useCallback(async () => {
    if (!selectedJob) return;
    setAnalyzingMatch(true);
    setMatchError(null);
    try {
      const result = await analyzeJobListing(selectedJob);
      setMatchResult(result);
    } catch (err) {
      const apiErr = err as ApiError;
      setMatchError(apiErr.detail ?? 'Analysis failed.');
    } finally {
      setAnalyzingMatch(false);
    }
  }, [selectedJob]);

  const runSuggestions = useCallback(async () => {
    if (!selectedJob) return;
    setAnalyzingSuggestions(true);
    setSuggestionsError(null);
    try {
      const jobText = `Title: ${selectedJob.title}\nCompany: ${selectedJob.company}\nLocation: ${selectedJob.location}\n\n${selectedJob.description}`;
      const result = await getResumeSuggestions(jobText);
      setSuggestions(result);
      // Reset any previously built resume when new suggestions come in
      setBuiltResume(null);
      setResumeBuildError(null);
    } catch (err) {
      const apiErr = err as ApiError;
      setSuggestionsError(apiErr.detail ?? 'Failed to get suggestions.');
    } finally {
      setAnalyzingSuggestions(false);
    }
  }, [selectedJob]);

  const runBuildResume = useCallback(async () => {
    if (!selectedJob || !suggestions) return;
    setBuildingResume(true);
    setResumeBuildError(null);
    try {
      const result = await buildTailoredResume({ job: selectedJob, suggestions });
      setBuiltResume(result);
    } catch (err) {
      const apiErr = err as ApiError;
      setResumeBuildError(apiErr.detail ?? 'Failed to build resume.');
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
