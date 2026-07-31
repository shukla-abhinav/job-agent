"""
API routes for /api/match, /api/resume, /api/jobs, and /api/profile.
"""

import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.models.job import (
    MatchRequest, MatchResponse,
    ResumeRequest, ResumeResponse,
    JobListing, JobSearchResponse,
    JobAnalyzeRequest,
    ResumeSuggestion, ResumeSuggestionRequest,
    BuildResumeRequest,
)
from app.models.profile import PersonalInfo
from app.services.gemini_provider import get_gemini_provider
from app.services.profile_parser import parse_profile
from app.services.job_search import search_jobs

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


def _load_profile():
    """Load and parse the profile. Raises HTTPException on failure."""
    profile_path: Path = settings.profile_absolute_path
    try:
        return parse_profile(profile_path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail=f"Profile file not found at '{profile_path}'. "
                   f"Please create data/profile.md before using the API.",
        )
    except Exception as e:
        logger.exception("Failed to parse profile")
        raise HTTPException(status_code=500, detail=f"Failed to parse profile: {e}")


@router.post("/match", response_model=MatchResponse)
async def match_job(request: MatchRequest) -> MatchResponse:
    """
    Analyze how well the candidate profile matches the provided job description.

    - Loads profile.md automatically.
    - Calls Gemini via LLMProvider interface.
    - Returns structured match analysis.
    """
    if not request.job_description.strip():
        raise HTTPException(status_code=422, detail="job_description cannot be empty")

    profile = _load_profile()
    provider = get_gemini_provider()

    try:
        return await provider.analyze_job(profile, request.job_description)
    except ValueError as e:
        logger.exception("LLM analysis failed")
        raise HTTPException(status_code=502, detail=str(e))
    except TimeoutError:
        raise HTTPException(status_code=504, detail="LLM request timed out. Please try again.")
    except Exception as e:
        logger.exception("Unexpected error during job analysis")
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")


@router.post("/resume", response_model=ResumeResponse)
async def generate_resume(request: ResumeRequest) -> ResumeResponse:
    """
    Generate an ATS-optimized resume tailored to the provided job description.

    - Loads profile.md automatically (source of truth).
    - Calls Gemini via LLMProvider interface.
    - Never invents information — only uses data from profile.md.
    """
    if not request.job_description.strip():
        raise HTTPException(status_code=422, detail="job_description cannot be empty")

    profile = _load_profile()
    provider = get_gemini_provider()

    try:
        return await provider.generate_resume(profile, request.job_description)
    except ValueError as e:
        logger.exception("LLM resume generation failed")
        raise HTTPException(status_code=502, detail=str(e))
    except TimeoutError:
        raise HTTPException(status_code=504, detail="LLM request timed out. Please try again.")
    except Exception as e:
        logger.exception("Unexpected error during resume generation")
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")


# ---------------------------------------------------------------------------
# Job Discovery Endpoints
# ---------------------------------------------------------------------------

@router.get("/jobs", response_model=JobSearchResponse)
async def get_jobs(
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    per_page: int = Query(default=10, ge=1, le=50, description="Results per page"),
    site_mode: str = Query(default="trusted", description="'trusted' for curated sites or 'custom' for user-selected sites"),
    selected_sites: str = Query(default="", description="Comma-separated site IDs when site_mode=custom"),
    include_career_pages: bool = Query(default=False, description="Also search company career pages"),
) -> JobSearchResponse:
    """
    Fetch worldwide job listings matching the user's preferences.md.

    - Builds search query from preferences.md (roles, location, remote).
    - 'trusted' mode: uses Google Jobs engine (aggregated, curated).
    - 'custom' mode: uses regular Google search with exact site: filters for selected platforms.
    - include_career_pages: adds company career page patterns to the site filter.
    """
    sites_list = [s.strip() for s in selected_sites.split(",") if s.strip()] if selected_sites else []
    try:
        return await search_jobs(
            page=page,
            per_page=per_page,
            site_mode=site_mode,
            selected_sites=sites_list,
            include_career_pages=include_career_pages,
        )
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error during job search")
        raise HTTPException(status_code=500, detail=f"Job search failed: {e}")


@router.post("/jobs/analyze", response_model=MatchResponse)
async def analyze_job_listing(request: JobAnalyzeRequest) -> MatchResponse:
    """
    Analyze how well the candidate's profile matches a specific job listing.

    Reuses the same Gemini analysis as /api/match but accepts a JobListing object.
    """
    job = request.job
    if not job.description.strip():
        raise HTTPException(status_code=422, detail="Job listing has no description to analyze")

    profile = _load_profile()
    provider = get_gemini_provider()

    # Build a rich job description text from the listing fields
    job_text = f"Title: {job.title}\nCompany: {job.company}\nLocation: {job.location}\n\n{job.description}"

    try:
        return await provider.analyze_job(profile, job_text)
    except ValueError as e:
        logger.exception("LLM job listing analysis failed")
        raise HTTPException(status_code=502, detail=str(e))
    except TimeoutError:
        raise HTTPException(status_code=504, detail="LLM request timed out. Please try again.")
    except Exception as e:
        logger.exception("Unexpected error during job listing analysis")
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")


@router.post("/jobs/resume-suggestions", response_model=ResumeSuggestion)
async def get_resume_suggestions(request: ResumeSuggestionRequest) -> ResumeSuggestion:
    """
    Get tailored resume improvement suggestions for a specific job description.

    Returns missing keywords, skills to highlight, sections to update, and overall advice.
    """
    if not request.job_description.strip():
        raise HTTPException(status_code=422, detail="job_description cannot be empty")

    profile = _load_profile()
    provider = get_gemini_provider()

    try:
        return await provider.suggest_resume_improvements(profile, request.job_description)
    except ValueError as e:
        logger.exception("LLM resume suggestions failed")
        raise HTTPException(status_code=502, detail=str(e))
    except TimeoutError:
        raise HTTPException(status_code=504, detail="LLM request timed out. Please try again.")
    except Exception as e:
        logger.exception("Unexpected error during resume suggestions")
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")


@router.post("/jobs/build-resume", response_model=ResumeResponse)
async def build_tailored_resume(request: BuildResumeRequest) -> ResumeResponse:
    """
    Generate a tailored resume that explicitly applies the provided suggestions.

    Takes a job listing + its suggestion analysis and builds a resume that:
    - Weaves in missing keywords naturally
    - Highlights the suggested skills
    - Applies the section and summary improvements
    - Remains 100% grounded in profile.md (never invents information)
    """
    job = request.job
    job_text = f"Title: {job.title}\nCompany: {job.company}\nLocation: {job.location}\n\n{job.description}"

    profile = _load_profile()
    provider = get_gemini_provider()

    try:
        return await provider.build_tailored_resume(profile, job_text, request.suggestions)
    except ValueError as e:
        logger.exception("LLM tailored resume build failed")
        raise HTTPException(status_code=502, detail=str(e))
    except TimeoutError:
        raise HTTPException(status_code=504, detail="LLM request timed out. Please try again.")
    except Exception as e:
        logger.exception("Unexpected error during tailored resume build")
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")


# ---------------------------------------------------------------------------
# Profile Info Endpoint (for PDF header)
# ---------------------------------------------------------------------------

@router.get("/profile", response_model=PersonalInfo)
async def get_profile_info() -> PersonalInfo:
    """
    Return the user's personal information from profile.md.
    Used by the frontend to populate the PDF resume header.
    """
    profile = _load_profile()
    return profile.personal_info
