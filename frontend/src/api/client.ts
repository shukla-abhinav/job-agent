import type { MatchResult, ResumeResult, ApiError, JobListing, JobSearchResponse, ResumeSuggestion, BuildResumeRequest, ProfileInfo } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      errorDetail = body.detail ?? errorDetail;
    } catch {
      // ignore parse error
    }
    const error: ApiError = { detail: errorDetail, status: res.status };
    throw error;
  }
  return res.json() as Promise<T>;
}

export async function analyzeMatch(jobDescription: string): Promise<MatchResult> {
  const res = await fetch(`${BASE_URL}/api/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_description: jobDescription }),
  });
  return handleResponse<MatchResult>(res);
}

export async function generateResume(jobDescription: string): Promise<ResumeResult> {
  const res = await fetch(`${BASE_URL}/api/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_description: jobDescription }),
  });
  return handleResponse<ResumeResult>(res);
}

// --- Job Discovery ---

export interface SearchConfig {
  siteMode: 'trusted' | 'custom';
  selectedSites: string[];
  includeCareerPages: boolean;
}

export async function searchJobs(
  page: number = 1,
  perPage: number = 10,
  config: SearchConfig = { siteMode: 'trusted', selectedSites: [], includeCareerPages: false }
): Promise<JobSearchResponse> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    site_mode: config.siteMode,
    selected_sites: config.selectedSites.join(','),
    include_career_pages: String(config.includeCareerPages),
  });
  const res = await fetch(`${BASE_URL}/api/jobs?${params}`);
  return handleResponse<JobSearchResponse>(res);
}

export async function analyzeJobListing(job: JobListing): Promise<MatchResult> {
  const res = await fetch(`${BASE_URL}/api/jobs/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job }),
  });
  return handleResponse<MatchResult>(res);
}

export async function getResumeSuggestions(jobDescription: string): Promise<ResumeSuggestion> {
  const res = await fetch(`${BASE_URL}/api/jobs/resume-suggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_description: jobDescription }),
  });
  return handleResponse<ResumeSuggestion>(res);
}

export async function buildTailoredResume(request: BuildResumeRequest): Promise<ResumeResult> {
  const res = await fetch(`${BASE_URL}/api/jobs/build-resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return handleResponse<ResumeResult>(res);
}

export async function getProfileInfo(): Promise<ProfileInfo> {
  const res = await fetch(`${BASE_URL}/api/profile`);
  return handleResponse<ProfileInfo>(res);
}
