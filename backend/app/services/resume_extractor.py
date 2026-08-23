"""
Resume extractor service.

Responsibilities:
- Extract raw text from an uploaded resume file (PDF or plain text).
- Call Gemini to parse that text into a structured Profile model.
"""

import io
import json
import logging
from pathlib import Path

from app.models.profile import (
    Profile,
    PersonalInfo,
    Experience,
    Project,
    Education,
    Certification,
    SalaryExpectations,
)
from app.utils.json_extractor import extract_json
from app.utils.prompt_loader import load_prompt

logger = logging.getLogger(__name__)


# ─── Text extraction ──────────────────────────────────────────────────────────

def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    """
    Extract raw text from an uploaded resume file.

    Supports:
    - PDF  → uses pypdf
    - .txt / .md → decoded as UTF-8

    Raises:
        ValueError: If the file type is unsupported or extraction fails.
    """
    suffix = Path(filename).suffix.lower()

    if suffix == ".pdf":
        return _extract_text_from_pdf(file_bytes)
    elif suffix in {".txt", ".md", ""}:
        try:
            return file_bytes.decode("utf-8", errors="replace")
        except Exception as e:
            raise ValueError(f"Could not decode text file: {e}") from e
    else:
        # Best-effort decode for unknown types
        try:
            return file_bytes.decode("utf-8", errors="replace")
        except Exception as e:
            raise ValueError(f"Unsupported file type '{suffix}' and could not decode: {e}") from e


def _extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF bytes using pypdf."""
    try:
        import pypdf  # type: ignore
    except ImportError:
        raise ValueError(
            "pypdf is required for PDF parsing. "
            "Install it with: pip install pypdf"
        )

    try:
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        pages = [page.extract_text() or "" for page in reader.pages]
        text = "\n".join(pages).strip()
        if not text:
            raise ValueError("PDF appears to have no extractable text (may be a scanned image).")
        return text
    except Exception as e:
        raise ValueError(f"Failed to extract text from PDF: {e}") from e


# ─── Profile extraction via Gemini ───────────────────────────────────────────

MAX_RETRIES = 2


async def extract_profile_from_text(raw_text: str, gemini_provider) -> Profile:
    """
    Use Gemini to extract a structured Profile from raw resume text.

    Args:
        raw_text: The plain-text content of the uploaded resume.
        gemini_provider: An instance of GeminiProvider (injected to avoid circular imports).

    Returns:
        A populated Profile Pydantic model.

    Raises:
        ValueError: If Gemini fails to return valid JSON after retries.
    """
    prompt = load_prompt("extract_profile", resume_text=raw_text)

    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            raw = await gemini_provider._generate(prompt)
            data = extract_json(raw)
            return _dict_to_profile(data)
        except (ValueError, KeyError, TypeError, json.JSONDecodeError) as e:
            last_error = e
            logger.warning("extract_profile_from_text attempt %d failed: %s", attempt + 1, e)

    raise ValueError(
        f"Gemini failed to extract a valid profile after {MAX_RETRIES + 1} attempts: {last_error}"
    )


def _dict_to_profile(data: dict) -> Profile:
    """Convert a raw Gemini JSON dict into a Profile model, tolerating missing fields."""

    def _personal_info(d: dict) -> PersonalInfo:
        return PersonalInfo(
            name=d.get("name", ""),
            email=d.get("email", ""),
            phone=d.get("phone", ""),
            location=d.get("location", ""),
            linkedin=d.get("linkedin", ""),
            github=d.get("github", ""),
            portfolio=d.get("portfolio", ""),
        )

    def _experience(items: list) -> list[Experience]:
        result = []
        for item in items:
            if not isinstance(item, dict):
                continue
            result.append(Experience(
                title=item.get("title", ""),
                company=item.get("company", ""),
                location=item.get("location", ""),
                period=item.get("period", ""),
                bullets=[str(b) for b in item.get("bullets", [])],
            ))
        return result

    def _projects(items: list) -> list[Project]:
        result = []
        for item in items:
            if not isinstance(item, dict):
                continue
            result.append(Project(
                name=item.get("name", ""),
                description=item.get("description", ""),
                tech=[str(t) for t in item.get("tech", [])],
                github=item.get("github", ""),
            ))
        return result

    def _education(items: list) -> list[Education]:
        result = []
        for item in items:
            if not isinstance(item, dict):
                continue
            result.append(Education(
                degree=item.get("degree", ""),
                institution=item.get("institution", ""),
                location=item.get("location", ""),
                period=item.get("period", ""),
                gpa=item.get("gpa"),
                coursework=[str(c) for c in item.get("coursework", [])],
            ))
        return result

    def _certifications(items: list) -> list[Certification]:
        result = []
        for item in items:
            if not isinstance(item, dict):
                continue
            result.append(Certification(
                name=item.get("name", ""),
                year=item.get("year"),
            ))
        return result

    def _salary(d: dict) -> SalaryExpectations:
        return SalaryExpectations(
            minimum=d.get("minimum", ""),
            target=d.get("target", ""),
            currency=d.get("currency", "USD"),
            open_to_equity=d.get("open_to_equity", True),
            open_to_contract=d.get("open_to_contract", False),
        )

    skills_raw = data.get("skills", {})
    if not isinstance(skills_raw, dict):
        skills_raw = {}

    # Ensure each category value is a list of strings
    skills: dict[str, list[str]] = {
        k: [str(s) for s in v] if isinstance(v, list) else []
        for k, v in skills_raw.items()
    }

    return Profile(
        personal_info=_personal_info(data.get("personal_info", {})),
        summary=data.get("summary", ""),
        skills=skills,
        experience=_experience(data.get("experience", [])),
        projects=_projects(data.get("projects", [])),
        education=_education(data.get("education", [])),
        certifications=_certifications(data.get("certifications", [])),
        preferred_roles=data.get("preferred_roles", []),
        preferred_countries=data.get("preferred_countries", []),
        salary_expectations=_salary(data.get("salary_expectations", {})),
    )
