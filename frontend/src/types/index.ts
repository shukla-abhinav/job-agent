// Mirrors backend Pydantic models

export type Recommendation = 'Apply' | 'Consider' | 'Skip';

export interface ProfileInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
}

export interface MatchResult {
  score: number;
  strengths: string[];
  missing_skills: string[];
  recommendation: Recommendation;
  reasoning: string;
}

export interface ResumeExperience {
  title: string;
  company: string;
  period: string;
  bullets: string[];
}

export interface ResumeProject {
  name: string;
  description: string;
  tech: string[];
}

export interface ResumeResult {
  summary: string;
  skills: string[];
  experience: ResumeExperience[];
  projects: ResumeProject[];
}

export interface ApiError {
  detail: string;
  status: number;
}

// --- Job Discovery ---

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  apply_link?: string;
  posted_at?: string;
  job_type?: string;
  salary?: string;
  source?: string;
}

export interface JobSearchResponse {
  jobs: JobListing[];
  total: number;
  page: number;
  per_page: number;
  has_next: boolean;
}

export interface ResumeSuggestion {
  missing_keywords: string[];
  skills_to_add: string[];
  sections_to_update: string[];
  summary_tips: string[];
  overall_advice: string;
}

export interface BuildResumeRequest {
  job: JobListing;
  suggestions: ResumeSuggestion;
}

// --- Auth ---

export interface AuthUser {
  user_id: string;
  email: string;
  token: string;
}

export interface AuthResponse {
  token: string;
  email: string;
  user_id: string;
}

// --- Upload & Profile ---

export interface ExperienceEntry {
  title: string;
  company: string;
  period: string;
  bullets: string[];
}

export interface EducationEntry {
  degree: string;
  institution: string;
  period: string;
}

export interface UploadedProfile {
  name: string;
  email: string;
  skills_summary: string[];
  skills_by_category: Record<string, string[]>;
  roles: string[];
  has_preferences: boolean;
  preferences_roles: string[];
  preferences_locations: string[];
  experience_count: number;
  education_count: number;
  experience_entries: ExperienceEntry[];
  education_entries: EducationEntry[];
  from_cache: boolean;
  processed_by: 'llm' | 'db';
}

// --- Usage / Rate Limit ---

export interface UsageInfo {
  used: number;
  limit: number;
  remaining: number;
  resets_in_minutes: number;
}

// --- Session ---

export interface SessionStatus {
  has_profile: boolean;
  name?: string;
  has_preferences: boolean;
  usage: UsageInfo;
  profile_data?: UploadedProfile;
}

// --- Resume History ---

export interface ResumeHistoryItem {
  resume_id: string;
  filename: string;
  name: string;
  roles: string[];
  skills_count: number;
  experience_count: number;
  created_at: string;     // ISO datetime
  is_active: boolean;
}

// --- Rate Limit Error ---

export interface RateLimitDetail {
  message: string;
  used: number;
  limit: number;
  resets_in_minutes: number;
}
