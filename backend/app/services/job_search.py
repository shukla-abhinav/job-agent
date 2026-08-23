"""
Job search service using SerpAPI.

Supports:
- Google Jobs engine (fast, aggregated) for 'trusted' mode
- Regular Google search with site: filters for 'custom' site selection
- Company career page inclusion via career page patterns
"""

import hashlib
import logging
import re
from pathlib import Path
from typing import Optional

import httpx

from app.config import settings
from app.models.job import JobListing, JobSearchResponse
from app.models.profile import Profile

logger = logging.getLogger(__name__)

SERPAPI_BASE = "https://serpapi.com/search"

# ─── Recruitment site registry ────────────────────────────────────────────────

# Ordered list of the 20 largest recruitment platforms with their search domains.
SITE_REGISTRY: dict[str, str] = {
    "greenhouse":      "boards.greenhouse.io",
    "lever":           "jobs.lever.co",
    "workday":         "myworkdayjobs.com",
    "jobvite":         "jobs.jobvite.com",
    "smartrecruiters": "jobs.smartrecruiters.com",
    "workable":        "apply.workable.com",
    "bamboohr":        "bamboohr.com",
    "linkedin":        "linkedin.com/jobs",
    "indeed":          "indeed.com",
    "glassdoor":       "glassdoor.com",
    "wellfound":       "wellfound.com",
    "dice":            "dice.com",
    "builtin":         "builtin.com",
    "ziprecruiter":    "ziprecruiter.com",
    "monster":         "monster.com",
    "weworkremotely":  "weworkremotely.com",
    "remotive":        "remotive.com",
    "remoteok":        "remoteok.com",
    "ycombinator":     "ycombinator.com/jobs",
    "hackernews":      "news.ycombinator.com",
}

# "Trusted" curated defaults — authoritative ATS platforms + major job boards
TRUSTED_SITES = [
    "greenhouse", "lever", "workday", "linkedin",
    "wellfound", "glassdoor", "indeed",
]


# ─── Preference parsing ───────────────────────────────────────────────────────

def _parse_preferences(preferences_path: Path) -> dict:
    """Parse preferences.md into a structured dict for building search queries."""
    try:
        text = preferences_path.read_text(encoding="utf-8")
    except FileNotFoundError:
        logger.warning("preferences.md not found at %s — using defaults", preferences_path)
        return {"roles": ["Senior Software Engineer"], "remote": True, "countries": ["United States"]}

    return _parse_preferences_text(text)


def _parse_preferences_text(text: str) -> dict:
    """Parse raw preferences markdown text into a structured dict."""
    roles: list[str] = []
    roles_match = re.search(r"## Roles I'm Targeting\n(.*?)(?=\n##|\Z)", text, re.DOTALL)
    if roles_match:
        for line in roles_match.group(1).splitlines():
            line = line.strip().lstrip("- ").strip()
            if line:
                roles.append(line)

    remote = "Remote (Worldwide)" in text or "Remote" in text

    countries: list[str] = []
    countries_match = re.search(r"## Preferred Countries.*?\n(.*?)(?=\n##|\Z)", text, re.DOTALL)
    if countries_match:
        for line in countries_match.group(1).splitlines():
            line = line.strip().lstrip("- ").strip()
            if line and "Remote" not in line and "Worldwide" not in line:
                country = re.sub(r"\(.*?\)", "", line).strip()
                if country:
                    countries.append(country)

    return {
        "roles": roles or ["Senior Software Engineer"],
        "remote": remote,
        "countries": countries or ["United States"],
    }


def _build_base_query(prefs: dict) -> str:
    """Build the core role, resume-skill, and location part of the search query."""
    roles = prefs.get("roles", ["Senior Software Engineer"])[:2]
    role_query = " OR ".join(f'"{r}"' for r in roles)
    skills = prefs.get("skills", [])[:3]
    skill_query = " OR ".join(f'"{skill}"' for skill in skills)
    query = f"({role_query})"
    if skill_query:
        query += f" ({skill_query})"
    if prefs.get("remote"):
        return f"{query} remote"
    countries = prefs.get("countries", [])[:2]
    location = " OR ".join(countries) if countries else "worldwide"
    return f"{query} {location}"


def _preferences_from_resume(profile: Profile) -> dict:
    """Build a sensible job-search baseline from the active resume."""
    roles = profile.preferred_roles[:]
    if not roles:
        roles = [entry.title for entry in profile.experience if entry.title]

    # Domain expertise is usually more useful for job discovery than generic tools.
    domain_skills: list[str] = []
    other_skills: list[str] = []
    for category, values in profile.skills.items():
        target = domain_skills if any(word in category.lower() for word in ("domain", "expertise", "special")) else other_skills
        target.extend(skill for skill in values if skill)

    location = profile.personal_info.location.strip()
    return {
        "roles": roles or ["Professional"],
        "skills": domain_skills or other_skills,
        "remote": False,
        "countries": profile.preferred_countries or ([location] if location else []),
    }


def _merge_resume_and_preferences(profile: Profile | None, preferences_text: str | None) -> dict:
    """Use resume data as the baseline and let explicit preferences refine it."""
    prefs = _preferences_from_resume(profile) if profile else {
        "roles": ["Senior Software Engineer"],
        "skills": [],
        "remote": True,
        "countries": ["United States"],
    }

    if preferences_text is None:
        return prefs

    explicit = _parse_preferences_text(preferences_text)
    # A preference file expresses intent, so it supersedes inferred resume roles
    # and location only when it contains the relevant section. Resume expertise
    # remains in the query as matching context.
    if re.search(r"## Roles I'm Targeting\n", preferences_text):
        prefs["roles"] = explicit["roles"]
    if "Remote" in preferences_text:
        prefs["remote"] = explicit["remote"]
    if re.search(r"## Preferred Countries", preferences_text):
        prefs["countries"] = explicit["countries"]
    return prefs


def _build_site_filter(selected_sites: list[str], include_career_pages: bool) -> str:
    """Build site: filter string from selected site IDs."""
    parts: list[str] = []
    for site_id in selected_sites:
        domain = SITE_REGISTRY.get(site_id)
        if domain:
            parts.append(f"site:{domain}")
    if include_career_pages:
        # Common career page subdomain/path patterns
        parts.extend(["site:careers.*", "site:jobs.*"])
    return " OR ".join(parts)


def _make_job_id(title: str, company: str, location: str) -> str:
    raw = f"{title}|{company}|{location}"
    return hashlib.md5(raw.encode()).hexdigest()[:12]


# ─── Job result parser (shared between engines) ───────────────────────────────

def _parse_job_item(item: dict) -> Optional[JobListing]:
    """Parse a raw SerpAPI result dict into a JobListing."""
    title = item.get("title", "")
    company = item.get("company_name", "") or item.get("company", "")
    location = item.get("location", "")
    if not title or not company:
        return None

    # Best apply link
    apply_link: Optional[str] = None
    for opt in item.get("apply_options", []):
        link = opt.get("link", "")
        opt_title = opt.get("title", "").lower()
        if link and not any(b in opt_title for b in ("linkedin", "indeed", "glassdoor", "ziprecruiter")):
            apply_link = link
            break
    if not apply_link:
        opts = item.get("apply_options", [])
        if opts:
            apply_link = opts[0].get("link")

    # Description — use highlights if full unavailable
    description = item.get("description") or item.get("snippet", "")
    if not description:
        highlights = item.get("job_highlights", [])
        parts = []
        for h in highlights:
            parts.append(h.get("title", ""))
            for t in h.get("items", []):
                parts.append(f"• {t}")
        description = "\n".join(parts)

    extensions = item.get("detected_extensions", {})
    posted_at = extensions.get("posted_at")
    if not posted_at and item.get("extensions"):
        posted_at = item["extensions"][0]
    salary = extensions.get("salary")
    job_type = extensions.get("schedule_type")

    # Source: prefer via field from SerpAPI
    source = item.get("via", item.get("source", "Google Jobs"))
    if source and source.startswith("via "):
        source = source[4:]

    return JobListing(
        id=_make_job_id(title, company, location),
        title=title,
        company=company,
        location=location,
        description=description,
        apply_link=apply_link,
        posted_at=posted_at,
        job_type=job_type,
        salary=salary,
        source=source,
    )


# ─── Google Jobs engine (trusted / all-sites mode) ────────────────────────────

async def _search_google_jobs(
    query: str, page: int, per_page: int
) -> tuple[list[JobListing], int]:
    """Use SerpAPI Google Jobs engine — best for trusted/aggregated results."""
    start = (page - 1) * per_page
    params = {
        "engine": "google_jobs",
        "q": query,
        "api_key": settings.serpapi_key,
        "num": per_page,
        "start": start,
        "hl": "en",
        "gl": "us",
        "chips": "date_posted:week",
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.get(SERPAPI_BASE, params=params)
        resp.raise_for_status()
        data = resp.json()

    jobs = [j for item in data.get("jobs_results", []) if (j := _parse_job_item(item))]
    total = len(jobs) + (per_page if len(jobs) == per_page else 0)
    return jobs, total


# ─── Regular Google search engine (custom-site mode) ─────────────────────────

async def _search_google_regular(
    query: str, site_filter: str, page: int, per_page: int
) -> tuple[list[JobListing], int]:
    """Use SerpAPI regular Google engine with site: operators for exact source control."""
    start = (page - 1) * 10  # regular Google uses 10 results per page

    full_query = f"{query} ({site_filter})" if site_filter else query

    params = {
        "engine": "google",
        "q": full_query,
        "api_key": settings.serpapi_key,
        "num": min(per_page, 10),
        "start": start,
        "hl": "en",
        "gl": "us",
        "tbs": "qdr:w",  # past week
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.get(SERPAPI_BASE, params=params)
        resp.raise_for_status()
        data = resp.json()

    jobs: list[JobListing] = []
    for result in data.get("organic_results", []):
        title = result.get("title", "")
        snippet = result.get("snippet", "")
        link = result.get("link", "")
        displayed = result.get("displayed_link", "")
        # Heuristic: extract company from displayed URL
        company = displayed.split("/")[0].replace("www.", "").replace(".com", "").replace(".io", "").title()

        # Only include if the title looks like a job posting
        job_keywords = ("engineer", "developer", "manager", "analyst", "designer", "scientist",
                        "architect", "lead", "senior", "staff", "principal", "director")
        if not any(kw in title.lower() for kw in job_keywords):
            continue

        jobs.append(
            JobListing(
                id=_make_job_id(title, company, link),
                title=title,
                company=company,
                location="Remote / Various",
                description=snippet,
                apply_link=link,
                posted_at=None,
                job_type=None,
                salary=None,
                source=displayed.split("/")[0].replace("www.", ""),
            )
        )

    total = len(jobs) + (per_page if len(jobs) == per_page else 0)
    return jobs, total


# ─── Main entry point ─────────────────────────────────────────────────────────

async def search_jobs(
    page: int = 1,
    per_page: int = 10,
    site_mode: str = "trusted",           # "trusted" | "custom"
    selected_sites: list[str] | None = None,
    include_career_pages: bool = False,
    preferences_text: str | None = None,  # In-session preferences (overrides file)
    profile: Profile | None = None,
) -> JobSearchResponse:
    """Build a job search from the active resume, refined by preferences."""
    if not settings.serpapi_key:
        raise ValueError(
            "SERPAPI_KEY is not configured. Add SERPAPI_KEY=your_key to backend/.env. "
            "Get a free key at https://serpapi.com"
        )

    # The active resume is the baseline. An uploaded preference file refines it.
    # Keep the legacy on-disk preferences only for local development with no resume.
    if profile is not None or preferences_text is not None:
        prefs = _merge_resume_and_preferences(profile, preferences_text)
    else:
        prefs = _parse_preferences(settings.preferences_absolute_path)

    base_query = _build_base_query(prefs)
    logger.info("Job search base query: %r (mode=%s, page=%d)", base_query, site_mode, page)

    if site_mode == "custom" and selected_sites:
        # Build site: filter and use regular Google search
        site_filter = _build_site_filter(selected_sites, include_career_pages)
        jobs, total = await _search_google_regular(base_query, site_filter, page, per_page)
    else:
        # Trusted mode — use Google Jobs engine (aggregated, high quality)
        if site_mode == "trusted":
            # Bias query toward trusted ATS platforms by mentioning them
            trusted_query = f"{base_query} (greenhouse OR lever OR workday OR linkedin)"
            query = trusted_query
        else:
            query = base_query

        if include_career_pages:
            query += " careers jobs"

        jobs, total = await _search_google_jobs(query, page, per_page)

    return JobSearchResponse(
        jobs=jobs,
        total=total,
        page=page,
        per_page=per_page,
        has_next=len(jobs) == per_page,
    )
