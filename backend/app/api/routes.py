"""
API routes — all protected by JWT auth + per-user rate limiting.

Rate-limited endpoints (5 calls/user/hour, LLM or DB alike):
  POST /api/upload
  POST /api/match
  POST /api/resume
  GET  /api/jobs
  POST /api/jobs/analyze
  POST /api/jobs/resume-suggestions
  POST /api/jobs/build-resume

Free endpoints (no rate limit):
  GET  /api/session/status
  DELETE /api/session
  GET  /api/usage
  GET  /api/profile
  All /api/auth/* routes
"""

import hashlib
import logging
from datetime import datetime, timezone
from pathlib import Path

from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.auth.auth import get_current_user
from app.config import settings
from app.db.mongo import get_db
from app.models.job import (
    BuildResumeRequest,
    EducationEntry,
    ExperienceEntry,
    JobAnalyzeRequest,
    JobListing,
    JobSearchResponse,
    MatchRequest,
    MatchResponse,
    ResumeSuggestion,
    ResumeSuggestionRequest,
    ResumeHistoryItem,
    ResumeRequest,
    ResumeResponse,
    SessionStatusResponse,
    UploadResponse,
    UsageResponse,
)
from app.models.profile import PersonalInfo, Profile
from app.services.gemini_provider import get_gemini_provider
from app.services.job_search import _parse_preferences_text, search_jobs
from app.services.profile_parser import parse_profile
from app.services.rate_limiter import check_rate_limit, get_usage, record_event
from app.services.resume_extractor import (
    _dict_to_profile,
    extract_profile_from_text,
    extract_text_from_file,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _load_profile_for_user(request: Request, user_id: str) -> Profile:
    """
    Load profile for the given user.
    Priority: in-memory session → disk fallback (dev only).
    """
    sessions: dict = getattr(request.app.state, "user_sessions", {})
    session = sessions.get(user_id)
    if session and session.get("profile"):
        return session["profile"]

    # Dev fallback: data/profile.md
    try:
        return parse_profile(settings.profile_absolute_path)
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="No profile loaded. Please upload your resume first.",
        )
    except Exception as e:
        logger.exception("Failed to load profile from disk")
        raise HTTPException(status_code=500, detail=f"Failed to load profile: {e}")


def _build_upload_response(
    profile: Profile,
    has_preferences: bool,
    preferences_text: str | None,
    from_cache: bool,
    processed_by: str,
) -> UploadResponse:
    """Build a rich UploadResponse from a Profile object."""
    all_skills: list[str] = []
    for skill_list in profile.skills.values():
        all_skills.extend(skill_list)

    prefs_roles: list[str] = []
    prefs_locations: list[str] = []
    if preferences_text:
        prefs = _parse_preferences_text(preferences_text)
        prefs_roles = prefs.get("roles", [])
        prefs_locations = prefs.get("countries", [])

    return UploadResponse(
        name=profile.personal_info.name,
        email=profile.personal_info.email,
        skills_summary=all_skills[:12],
        skills_by_category=profile.skills,
        roles=profile.preferred_roles,
        experience_count=len(profile.experience),
        education_count=len(profile.education),
        experience_entries=[
            ExperienceEntry(
                title=e.title,
                company=e.company,
                period=e.period,
                bullets=e.bullets[:4],
            )
            for e in profile.experience
        ],
        education_entries=[
            EducationEntry(
                degree=e.degree,
                institution=e.institution,
                period=e.period,
            )
            for e in profile.education
        ],
        has_preferences=has_preferences,
        preferences_roles=prefs_roles,
        preferences_locations=prefs_locations,
        from_cache=from_cache,
        processed_by=processed_by,
    )


# ---------------------------------------------------------------------------
# Session / Upload
# ---------------------------------------------------------------------------

@router.post("/upload", response_model=UploadResponse)
async def upload_resume(
    request: Request,
    resume: UploadFile = File(..., description="Resume file (PDF or plain text)"),
    preferences: UploadFile | None = File(default=None, description="Optional preference.md file"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> UploadResponse:
    """
    Upload a resume and optionally a preference.md file.

    Flow:
    1. Rate-limit check.
    2. Extract raw text from file.
    3. SHA-256 hash the text.
    4. Query MongoDB resume_cache (user_id + hash).
       - Hit  → load stored Profile (processed_by='db').
       - Miss → call Gemini LLM → store in cache (processed_by='llm').
    5. If preferences uploaded → upsert user_preferences collection.
    6. Store profile in per-user in-memory session.
    7. Record rate-limit event.
    8. Return enriched UploadResponse.
    """
    user_id: str = current_user["_id"]

    # ── 1. Rate limit ────────────────────────────────────────────────────────
    await check_rate_limit(db, user_id)

    # ── 2. Read file ─────────────────────────────────────────────────────────
    resume_bytes = await resume.read()
    if not resume_bytes:
        raise HTTPException(status_code=422, detail="Uploaded resume file is empty.")

    filename = resume.filename or "resume.txt"
    logger.info("Resume upload: user=%s file=%s size=%d", user_id, filename, len(resume_bytes))

    try:
        raw_text = extract_text_from_file(resume_bytes, filename)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if not raw_text.strip():
        raise HTTPException(
            status_code=422,
            detail="Could not extract any text. Please upload a readable PDF or plain-text file.",
        )

    # ── 3. Hash ──────────────────────────────────────────────────────────────
    resume_hash = hashlib.sha256(raw_text.encode("utf-8")).hexdigest()

    # ── 4. DB cache lookup ───────────────────────────────────────────────────
    cached = await db.resume_cache.find_one({
        "user_id": ObjectId(user_id),
        "resume_hash": resume_hash,
    })

    if cached:
        logger.info("Resume cache HIT for user=%s hash=%s…", user_id, resume_hash[:12])
        profile = _dict_to_profile(cached["profile_json"])
        active_cache_oid = cached["_id"]
        processed_by = "db"
        from_cache = True
    else:
        logger.info("Resume cache MISS for user=%s — calling LLM", user_id)
        provider = get_gemini_provider()
        try:
            profile = await extract_profile_from_text(raw_text, provider)
        except ValueError as e:
            logger.exception("Profile extraction failed")
            raise HTTPException(status_code=502, detail=f"Profile extraction failed: {e}")
        except Exception as e:
            logger.exception("Unexpected LLM error")
            raise HTTPException(status_code=500, detail=f"Internal error: {e}")

        # Store in cache (include filename for history display)
        insert_result = await db.resume_cache.insert_one({
            "user_id": ObjectId(user_id),
            "resume_hash": resume_hash,
            "profile_json": profile.model_dump(),
            "processed_by": "llm",
            "filename": filename,
            "created_at": datetime.now(timezone.utc),
        })
        active_cache_oid = insert_result.inserted_id
        processed_by = "llm"
        from_cache = False

    # Mark this resume as the user's active selection (persists across refreshes)
    await db.user_preferences.update_one(
        {"user_id": ObjectId(user_id)},
        {"$set": {"active_resume_id": active_cache_oid, "updated_at": datetime.now(timezone.utc)}},
        upsert=True,
    )

    # ── 5. Preferences ────────────────────────────────────────────────────────
    has_preferences = False
    preferences_text: str | None = None

    if preferences is not None:
        pref_bytes = await preferences.read()
        if pref_bytes:
            try:
                pref_text = pref_bytes.decode("utf-8", errors="replace")
                await db.user_preferences.update_one(
                    {"user_id": ObjectId(user_id)},
                    {
                        "$set": {
                            "preferences_text": pref_text,
                            "updated_at": datetime.now(timezone.utc),
                        }
                    },
                    upsert=True,
                )
                preferences_text = pref_text
                has_preferences = True
                logger.info("Preferences stored for user=%s (%d chars)", user_id, len(pref_text))
            except Exception as e:
                logger.warning("Could not store preferences: %s", e)
    else:
        # Load existing preferences from DB if not uploading new ones
        pref_doc = await db.user_preferences.find_one({"user_id": ObjectId(user_id)})
        if pref_doc:
            preferences_text = pref_doc.get("preferences_text")
            has_preferences = preferences_text is not None

    # ── 6. Store in per-user session ──────────────────────────────────────────
    user_sessions: dict = getattr(request.app.state, "user_sessions", {})
    user_sessions[user_id] = {
        "profile": profile,
        "preferences_text": preferences_text,
    }

    # ── 7. Record rate-limit event ────────────────────────────────────────────
    await record_event(db, user_id, "upload")

    logger.info(
        "Upload complete: user=%s name='%s' cache=%s prefs=%s",
        user_id, profile.personal_info.name, from_cache, has_preferences,
    )

    return _build_upload_response(profile, has_preferences, preferences_text, from_cache, processed_by)


@router.get("/session/status", response_model=SessionStatusResponse)
async def get_session_status(
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> SessionStatusResponse:
    """
    Check whether the user has an active profile.

    Auto-loads the most recent cached profile from MongoDB if not already
    in the in-memory session — so page refreshes don't force re-upload.

    Also returns current rate-limit usage.
    """
    user_id: str = current_user["_id"]
    user_sessions: dict = getattr(request.app.state, "user_sessions", {})
    session = user_sessions.get(user_id)

    # Auto-load from MongoDB cache if session is empty
    if session is None:
        # Prefer the user's explicitly active resume; fall back to most recent
        pref_doc = await db.user_preferences.find_one({"user_id": ObjectId(user_id)})
        active_resume_oid = pref_doc.get("active_resume_id") if pref_doc else None

        if active_resume_oid:
            cached = await db.resume_cache.find_one(
                {"_id": active_resume_oid, "user_id": ObjectId(user_id)},
            )
        else:
            cached = await db.resume_cache.find_one(
                {"user_id": ObjectId(user_id)},
                sort=[("created_at", -1)],
            )

        if cached:
            logger.info("Auto-loading cached profile for user=%s from MongoDB", user_id)
            profile = _dict_to_profile(cached["profile_json"])
            pref_text = pref_doc.get("preferences_text") if pref_doc else None

            session = {"profile": profile, "preferences_text": pref_text}
            user_sessions[user_id] = session

    usage_data = await get_usage(db, user_id)
    usage = UsageResponse(**usage_data)

    if session is None:
        return SessionStatusResponse(
            has_profile=False,
            has_preferences=False,
            usage=usage,
        )

    profile: Profile = session["profile"]
    pref_text: str | None = session.get("preferences_text")

    profile_data = _build_upload_response(
        profile=profile,
        has_preferences=pref_text is not None,
        preferences_text=pref_text,
        from_cache=True,
        processed_by="db",
    )

    return SessionStatusResponse(
        has_profile=True,
        name=profile.personal_info.name,
        has_preferences=pref_text is not None,
        usage=usage,
        profile_data=profile_data,
    )


@router.delete("/session")
async def clear_session(
    request: Request,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Clear the in-memory session for the current user (Change Profile)."""
    user_id: str = current_user["_id"]
    user_sessions: dict = getattr(request.app.state, "user_sessions", {})
    user_sessions.pop(user_id, None)
    logger.info("Session cleared for user=%s", user_id)
    return {"cleared": True}


@router.get("/resumes", response_model=list[ResumeHistoryItem])
async def list_resumes(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> list[ResumeHistoryItem]:
    """
    List all previously uploaded resumes for the current user.
    No rate limit — DB read only.
    """
    user_id: str = current_user["_id"]

    # Get active resume id from preferences
    pref_doc = await db.user_preferences.find_one({"user_id": ObjectId(user_id)})
    active_resume_id = str(pref_doc.get("active_resume_id", "")) if pref_doc else ""

    cursor = db.resume_cache.find(
        {"user_id": ObjectId(user_id)},
        sort=[("created_at", -1)],
    )
    items: list[ResumeHistoryItem] = []
    async for doc in cursor:
        profile = _dict_to_profile(doc["profile_json"])
        all_skills = [s for lst in profile.skills.values() for s in lst]
        rid = str(doc["_id"])
        created = doc.get("created_at")
        items.append(ResumeHistoryItem(
            resume_id=rid,
            filename=doc.get("filename", "resume"),
            name=profile.personal_info.name,
            roles=profile.preferred_roles[:3],
            skills_count=len(all_skills),
            experience_count=len(profile.experience),
            created_at=created.isoformat() if created else "",
            is_active=rid == active_resume_id,
        ))
    return items


@router.post("/resumes/{resume_id}/activate")
async def activate_resume(
    request: Request,
    resume_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> dict:
    """
    Load a previously cached resume into the user's active session.
    No LLM call. No rate limit (free DB read).
    Sets active_resume_id so the selection persists across refreshes.
    """
    user_id: str = current_user["_id"]

    try:
        oid = ObjectId(resume_id)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid resume ID")

    cached = await db.resume_cache.find_one(
        {"_id": oid, "user_id": ObjectId(user_id)},
    )
    if not cached:
        raise HTTPException(status_code=404, detail="Resume not found")

    profile = _dict_to_profile(cached["profile_json"])

    # Load existing preferences
    pref_doc = await db.user_preferences.find_one({"user_id": ObjectId(user_id)})
    pref_text = pref_doc.get("preferences_text") if pref_doc else None

    # Update active_resume_id in preferences doc (persists across refreshes)
    await db.user_preferences.update_one(
        {"user_id": ObjectId(user_id)},
        {"$set": {"active_resume_id": oid, "updated_at": datetime.now(timezone.utc)}},
        upsert=True,
    )

    # Update in-memory session
    user_sessions: dict = getattr(request.app.state, "user_sessions", {})
    user_sessions[user_id] = {
        "profile": profile,
        "preferences_text": pref_text,
    }

    logger.info("Resume activated from DB: user=%s resume_id=%s", user_id, resume_id)
    return {"activated": True, "name": profile.personal_info.name}


@router.get("/usage", response_model=UsageResponse)
async def get_usage_endpoint(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> UsageResponse:
    """Return current rate-limit usage for the authenticated user."""
    user_id: str = current_user["_id"]
    data = await get_usage(db, user_id)
    return UsageResponse(**data)


# ---------------------------------------------------------------------------
# Core Analysis & Resume
# ---------------------------------------------------------------------------

@router.post("/match", response_model=MatchResponse)
async def match_job(
    request: Request,
    body: MatchRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> MatchResponse:
    """Analyze how well the user's profile matches a job description."""
    if not body.job_description.strip():
        raise HTTPException(status_code=422, detail="job_description cannot be empty")

    user_id: str = current_user["_id"]
    await check_rate_limit(db, user_id)

    profile = _load_profile_for_user(request, user_id)
    provider = get_gemini_provider()

    try:
        result = await provider.analyze_job(profile, body.job_description)
        await record_event(db, user_id, "match")
        return result
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except TimeoutError:
        raise HTTPException(status_code=504, detail="LLM request timed out.")
    except Exception as e:
        logger.exception("Unexpected error during job analysis")
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")


@router.post("/resume", response_model=ResumeResponse)
async def generate_resume(
    request: Request,
    body: ResumeRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> ResumeResponse:
    """Generate an ATS-optimized resume tailored to a job description."""
    if not body.job_description.strip():
        raise HTTPException(status_code=422, detail="job_description cannot be empty")

    user_id: str = current_user["_id"]
    await check_rate_limit(db, user_id)

    profile = _load_profile_for_user(request, user_id)
    provider = get_gemini_provider()

    try:
        result = await provider.generate_resume(profile, body.job_description)
        await record_event(db, user_id, "resume_gen")
        return result
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except TimeoutError:
        raise HTTPException(status_code=504, detail="LLM request timed out.")
    except Exception as e:
        logger.exception("Unexpected error during resume generation")
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")


# ---------------------------------------------------------------------------
# Job Discovery
# ---------------------------------------------------------------------------

@router.get("/jobs", response_model=JobSearchResponse)
async def get_jobs(
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=10, ge=1, le=50),
    site_mode: str = Query(default="trusted"),
    selected_sites: str = Query(default=""),
    include_career_pages: bool = Query(default=False),
) -> JobSearchResponse:
    """Fetch job listings using the user's preferences (session → MongoDB → defaults)."""
    user_id: str = current_user["_id"]
    await check_rate_limit(db, user_id)

    # Resolve preferences: session → MongoDB → None
    user_sessions: dict = getattr(request.app.state, "user_sessions", {})
    session = user_sessions.get(user_id, {})
    prefs_text: str | None = session.get("preferences_text")
    profile: Profile | None = session.get("profile")

    if prefs_text is None:
        pref_doc = await db.user_preferences.find_one({"user_id": ObjectId(user_id)})
        if pref_doc:
            prefs_text = pref_doc.get("preferences_text")

    sites_list = [s.strip() for s in selected_sites.split(",") if s.strip()] if selected_sites else []

    try:
        result = await search_jobs(
            page=page,
            per_page=per_page,
            site_mode=site_mode,
            selected_sites=sites_list,
            include_career_pages=include_career_pages,
            preferences_text=prefs_text,
            profile=profile,
        )
        await record_event(db, user_id, "jobs")
        return result
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.exception("Job search error")
        raise HTTPException(status_code=500, detail=f"Job search failed: {e}")


@router.post("/jobs/analyze", response_model=MatchResponse)
async def analyze_job_listing(
    request: Request,
    body: JobAnalyzeRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> MatchResponse:
    """Analyze a specific job listing against the user's profile."""
    job = body.job
    if not job.description.strip():
        raise HTTPException(status_code=422, detail="Job listing has no description to analyze")

    user_id: str = current_user["_id"]
    await check_rate_limit(db, user_id)

    profile = _load_profile_for_user(request, user_id)
    provider = get_gemini_provider()
    job_text = f"Title: {job.title}\nCompany: {job.company}\nLocation: {job.location}\n\n{job.description}"

    try:
        result = await provider.analyze_job(profile, job_text)
        await record_event(db, user_id, "analyze")
        return result
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except TimeoutError:
        raise HTTPException(status_code=504, detail="LLM request timed out.")
    except Exception as e:
        logger.exception("Job listing analysis error")
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")


@router.post("/jobs/resume-suggestions", response_model=ResumeSuggestion)
async def get_resume_suggestions(
    request: Request,
    body: ResumeSuggestionRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> ResumeSuggestion:
    """Get tailored resume improvement suggestions for a job."""
    if not body.job_description.strip():
        raise HTTPException(status_code=422, detail="job_description cannot be empty")

    user_id: str = current_user["_id"]
    await check_rate_limit(db, user_id)

    profile = _load_profile_for_user(request, user_id)
    provider = get_gemini_provider()

    try:
        result = await provider.suggest_resume_improvements(profile, body.job_description)
        await record_event(db, user_id, "suggestions")
        return result
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except TimeoutError:
        raise HTTPException(status_code=504, detail="LLM request timed out.")
    except Exception as e:
        logger.exception("Resume suggestions error")
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")


@router.post("/jobs/build-resume", response_model=ResumeResponse)
async def build_tailored_resume(
    request: Request,
    body: BuildResumeRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> ResumeResponse:
    """Build a tailored resume applying specific suggestions."""
    user_id: str = current_user["_id"]
    await check_rate_limit(db, user_id)

    job = body.job
    job_text = f"Title: {job.title}\nCompany: {job.company}\nLocation: {job.location}\n\n{job.description}"

    profile = _load_profile_for_user(request, user_id)
    provider = get_gemini_provider()

    try:
        result = await provider.build_tailored_resume(profile, job_text, body.suggestions)
        await record_event(db, user_id, "build_resume")
        return result
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except TimeoutError:
        raise HTTPException(status_code=504, detail="LLM request timed out.")
    except Exception as e:
        logger.exception("Tailored resume build error")
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------

@router.get("/profile", response_model=PersonalInfo)
async def get_profile_info(
    request: Request,
    current_user: dict = Depends(get_current_user),
) -> PersonalInfo:
    """Return the user's personal information."""
    user_id: str = current_user["_id"]
    profile = _load_profile_for_user(request, user_id)
    return profile.personal_info
