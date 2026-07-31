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
