from pydantic import BaseModel, Field
from typing import Literal, Optional


class MatchRequest(BaseModel):
    job_description: str = Field(..., min_length=1, description="The full job description text")


class MatchResponse(BaseModel):
    score: int = Field(..., ge=0, le=100)
    strengths: list[str]
    missing_skills: list[str]
    recommendation: Literal["Apply", "Consider", "Skip"]
    reasoning: str


class ResumeRequest(BaseModel):
    job_description: str = Field(..., min_length=1, description="The full job description text")


class ResumeExperience(BaseModel):
    title: str
    company: str
    period: str
    bullets: list[str]


class ResumeProject(BaseModel):
    name: str
    description: str
    tech: list[str]


class ResumeResponse(BaseModel):
    summary: str
    skills: list[str]
    experience: list[ResumeExperience]
    projects: list[ResumeProject]


# --- Job Discovery Models ---

class JobListing(BaseModel):
    id: str = Field(..., description="Unique identifier for this job listing")
    title: str
    company: str
    location: str
    description: str
    apply_link: Optional[str] = None
    posted_at: Optional[str] = None
    job_type: Optional[str] = None
    salary: Optional[str] = None
    source: Optional[str] = None


class JobSearchRequest(BaseModel):
    page: int = Field(default=1, ge=1)
    per_page: int = Field(default=10, ge=1, le=50)


class JobSearchResponse(BaseModel):
    jobs: list[JobListing]
    total: int
    page: int
    per_page: int
    has_next: bool


class JobAnalyzeRequest(BaseModel):
    job: JobListing


class ResumeSuggestion(BaseModel):
    missing_keywords: list[str] = Field(default_factory=list, description="Keywords from job description missing in resume")
    skills_to_add: list[str] = Field(default_factory=list, description="Specific skills to add or highlight")
    sections_to_update: list[str] = Field(default_factory=list, description="Resume sections that should be updated")
    summary_tips: list[str] = Field(default_factory=list, description="Tips for improving the resume summary")
    overall_advice: str = Field(default="", description="High-level tailoring advice for this specific job")


class ResumeSuggestionRequest(BaseModel):
    job_description: str = Field(..., min_length=1)


class BuildResumeRequest(BaseModel):
    """Request to build a tailored resume that explicitly applies the given suggestions."""
    job: JobListing
    suggestions: ResumeSuggestion

