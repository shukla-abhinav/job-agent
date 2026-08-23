import type {
  AuthResponse,
  BuildResumeRequest,
  JobListing,
  JobSearchResponse,
  MatchResult,
  ProfileInfo,
  RateLimitDetail,
  ResumeSuggestion,
  ResumeResult,
  ResumeHistoryItem,
  SessionStatus,
  UploadedProfile,
  UsageInfo,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const TOKEN_KEY = 'jsa_token';

// ── Token management ────────────────────────────────────────────────────────

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY);

function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Response handler ────────────────────────────────────────────────────────

export class RateLimitError extends Error {
  used: number;
  limit: number;
  resetsInMinutes: number;
  constructor(detail: RateLimitDetail) {
    super(detail.message);
    this.name = 'RateLimitError';
    this.used = detail.used;
    this.limit = detail.limit;
    this.resetsInMinutes = detail.resets_in_minutes;
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>;

  let body: { detail?: unknown } = {};
  try { body = await res.json(); } catch { /* ignore */ }

  if (res.status === 429) {
    const d = body.detail as RateLimitDetail | undefined;
    throw new RateLimitError(
      d ?? { message: 'Rate limit reached', used: 5, limit: 5, resets_in_minutes: 60 }
    );
  }

  if (res.status === 401) {
    clearToken(); // clear stale JWT
    throw new AuthError(
      typeof body.detail === 'string' ? body.detail : 'Session expired — please log in again.'
    );
  }

  const errorDetail =
    typeof body.detail === 'string'
      ? body.detail
      : JSON.stringify(body.detail ?? `HTTP ${res.status}`);

  const err = Object.assign(new Error(errorDetail), { status: res.status, detail: errorDetail });
  throw err;
}

// ── Auth ────────────────────────────────────────────────────────────────────

export async function signup(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<AuthResponse>(res);
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<AuthResponse>(res);
}

// ── Session ─────────────────────────────────────────────────────────────────

export async function getSessionStatus(): Promise<SessionStatus> {
  const res = await fetch(`${BASE_URL}/api/session/status`, {
    headers: authHeader(),
  });
  return handleResponse<SessionStatus>(res);
}

export async function clearSession(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/session`, {
    method: 'DELETE',
    headers: authHeader(),
  });
  await handleResponse<{ cleared: boolean }>(res);
}

export async function getResumes(): Promise<ResumeHistoryItem[]> {
  const res = await fetch(`${BASE_URL}/api/resumes`, { headers: authHeader() });
  return handleResponse<ResumeHistoryItem[]>(res);
}

export async function activateResume(resumeId: string): Promise<{ activated: boolean; name: string }> {
  const res = await fetch(`${BASE_URL}/api/resumes/${resumeId}/activate`, {
    method: 'POST',
    headers: authHeader(),
  });
  return handleResponse<{ activated: boolean; name: string }>(res);
}

// ── Upload ───────────────────────────────────────────────────────────────────

export async function uploadResume(
  resumeFile: File,
  prefsFile?: File
): Promise<UploadedProfile> {
  const form = new FormData();
  form.append('resume', resumeFile);
  if (prefsFile) form.append('preferences', prefsFile);
  const res = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: authHeader(),
    body: form,
  });
  return handleResponse<UploadedProfile>(res);
}

// ── Usage ────────────────────────────────────────────────────────────────────

export async function getUsage(): Promise<UsageInfo> {
  const res = await fetch(`${BASE_URL}/api/usage`, { headers: authHeader() });
  return handleResponse<UsageInfo>(res);
}

// ── Job analysis ──────────────────────────────────────────────────────────────

export async function analyzeMatch(jobDescription: string): Promise<MatchResult> {
  const res = await fetch(`${BASE_URL}/api/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ job_description: jobDescription }),
  });
  return handleResponse<MatchResult>(res);
}

export async function generateResume(jobDescription: string): Promise<ResumeResult> {
  const res = await fetch(`${BASE_URL}/api/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ job_description: jobDescription }),
  });
  return handleResponse<ResumeResult>(res);
}

// ── Job Discovery ─────────────────────────────────────────────────────────────

export interface SearchConfig {
  siteMode: 'trusted' | 'custom';
  selectedSites: string[];
  includeCareerPages: boolean;
}

export async function searchJobs(
  page = 1,
  perPage = 10,
  config: SearchConfig = { siteMode: 'trusted', selectedSites: [], includeCareerPages: false }
): Promise<JobSearchResponse> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    site_mode: config.siteMode,
    selected_sites: config.selectedSites.join(','),
    include_career_pages: String(config.includeCareerPages),
  });
  const res = await fetch(`${BASE_URL}/api/jobs?${params}`, { headers: authHeader() });
  return handleResponse<JobSearchResponse>(res);
}

export async function analyzeJobListing(job: JobListing): Promise<MatchResult> {
  const res = await fetch(`${BASE_URL}/api/jobs/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ job }),
  });
  return handleResponse<MatchResult>(res);
}

export async function getResumeSuggestions(jobDescription: string): Promise<ResumeSuggestion> {
  const res = await fetch(`${BASE_URL}/api/jobs/resume-suggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ job_description: jobDescription }),
  });
  return handleResponse<ResumeSuggestion>(res);
}

export async function buildTailoredResume(request: BuildResumeRequest): Promise<ResumeResult> {
  const res = await fetch(`${BASE_URL}/api/jobs/build-resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(request),
  });
  return handleResponse<ResumeResult>(res);
}

export async function getProfileInfo(): Promise<ProfileInfo> {
  const res = await fetch(`${BASE_URL}/api/profile`, { headers: authHeader() });
  return handleResponse<ProfileInfo>(res);
}
