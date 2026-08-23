from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field


# ─── Job listing models ────────────────────────────────────────────────────────

class JobListing(BaseModel):
    id: str = ""
    title: str
    company: str
    location: str
    description: str = ""
    apply_url: str = ""
    posted_date: Optional[str] = None
    salary: Optional[str] = None
    job_type: Optional[str] = None
    source: str = ""


class JobSearchResponse(BaseModel):
    jobs: list[JobListing]
    total: int
    page: int
    per_page: int
    has_next: bool


# ─── Analysis & resume models ──────────────────────────────────────────────────

class MatchRequest(BaseModel):
    job_description: str


class MatchResponse(BaseModel):
    score: int = Field(..., ge=0, le=100)
    summary: str
    strengths: list[str]
    gaps: list[str]
    recommendations: list[str]


class ResumeRequest(BaseModel):
    job_description: str


class ResumeResponse(BaseModel):
    resume_markdown: str
    tips: list[str] = []


class ResumeSuggestion(BaseModel):
    missing_keywords: list[str]
    skills_to_highlight: list[str]
    sections_to_update: list[str]
    overall_advice: str


class ResumeSuggestionRequest(BaseModel):
    job_description: str


class JobAnalyzeRequest(BaseModel):
    job: JobListing


class BuildResumeRequest(BaseModel):
    """Request to build a tailored resume that explicitly applies the given suggestions."""
    job: JobListing
    suggestions: ResumeSuggestion


# ─── Upload / Profile response models ─────────────────────────────────────────

class ExperienceEntry(BaseModel):
    title: str = ""
    company: str = ""
    period: str = ""
    bullets: list[str] = Field(default_factory=list)


class EducationEntry(BaseModel):
    degree: str = ""
    institution: str = ""
    period: str = ""


class UploadResponse(BaseModel):
    """Returned after a successful resume upload (and in session/status when a profile is loaded)."""
    name: str
    email: str

    # Skills
    skills_summary: list[str] = Field(default_factory=list, description="Top 12 skills (flat)")
    skills_by_category: dict[str, list[str]] = Field(default_factory=dict)

    # Experience & education
    roles: list[str] = Field(default_factory=list, description="Preferred / extracted roles")
    experience_count: int = 0
    education_count: int = 0
    experience_entries: list[ExperienceEntry] = Field(default_factory=list)
    education_entries: list[EducationEntry] = Field(default_factory=list)

    # Preferences
    has_preferences: bool = False
    preferences_roles: list[str] = Field(default_factory=list)
    preferences_locations: list[str] = Field(default_factory=list)

    # Source metadata
    from_cache: bool = False
    processed_by: str = "llm"   # 'llm' | 'db'


class ResumeHistoryItem(BaseModel):
    """One entry in the user's resume history (from resume_cache)."""
    resume_id: str          # MongoDB _id as string
    filename: str = "resume"
    name: str = ""           # Extracted person name
    roles: list[str] = Field(default_factory=list)
    skills_count: int = 0
    experience_count: int = 0
    created_at: str = ""    # ISO datetime string
    is_active: bool = False  # Whether this is the currently active resume


# ─── Auth models ───────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    token: str
    email: str
    user_id: str


# ─── Usage / Rate limit models ─────────────────────────────────────────────────

class UsageResponse(BaseModel):
    used: int
    limit: int
    remaining: int
    resets_in_minutes: int


# ─── Session status response ───────────────────────────────────────────────────

class SessionStatusResponse(BaseModel):
    has_profile: bool
    name: Optional[str] = None
    has_preferences: bool = False
    usage: UsageResponse
    # Full profile data when has_profile=True — avoids a second API round-trip on page refresh
    profile_data: Optional[UploadResponse] = None
