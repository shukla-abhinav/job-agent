"""
Gemini LLM provider implementation using the google-genai SDK.
"""

import asyncio
import json
import logging
from datetime import datetime
from functools import lru_cache
from pathlib import Path

from google import genai
from google.genai import types as genai_types

from app.config import settings
from app.models.job import MatchResponse, ResumeResponse, ResumeSuggestion, BuildResumeRequest
from app.models.profile import Profile
from app.services.llm_provider import LLMProvider
from app.utils.json_extractor import extract_json
from app.utils.prompt_loader import load_prompt

logger = logging.getLogger(__name__)

MAX_RETRIES = 2


def _profile_to_text(profile: Profile) -> str:
    """Convert a Profile model into a readable text representation for the prompt."""
    lines: list[str] = []

    # Personal info
    pi = profile.personal_info
    lines.append(f"Name: {pi.name}")
    lines.append(f"Email: {pi.email}")
    lines.append(f"Location: {pi.location}")
    if pi.linkedin:
        lines.append(f"LinkedIn: {pi.linkedin}")
    if pi.github:
        lines.append(f"GitHub: {pi.github}")
    lines.append("")

    # Summary
    if profile.summary:
        lines.append("## Summary")
        lines.append(profile.summary)
        lines.append("")

    # Skills
    if profile.skills:
        lines.append("## Skills")
        for category, skills in profile.skills.items():
            lines.append(f"  {category}: {', '.join(skills)}")
        lines.append("")

    # Experience
    if profile.experience:
        lines.append("## Experience")
        for exp in profile.experience:
            lines.append(f"  {exp.title} at {exp.company} ({exp.period})")
            for bullet in exp.bullets:
                lines.append(f"    - {bullet}")
        lines.append("")

    # Projects
    if profile.projects:
        lines.append("## Projects")
        for proj in profile.projects:
            lines.append(f"  {proj.name}: {proj.description}")
            if proj.tech:
                lines.append(f"    Tech: {', '.join(proj.tech)}")
        lines.append("")

    # Education
    if profile.education:
        lines.append("## Education")
        for edu in profile.education:
            lines.append(f"  {edu.degree} — {edu.institution} ({edu.period})")
        lines.append("")

    # Certifications
    if profile.certifications:
        lines.append("## Certifications")
        for cert in profile.certifications:
            year = f" ({cert.year})" if cert.year else ""
            lines.append(f"  - {cert.name}{year}")
        lines.append("")

    # Preferred roles & countries
    if profile.preferred_roles:
        lines.append(f"Preferred Roles: {', '.join(profile.preferred_roles)}")
    if profile.preferred_countries:
        lines.append(f"Preferred Countries: {', '.join(profile.preferred_countries)}")

    # Salary
    sal = profile.salary_expectations
    lines.append(f"Salary Target: {sal.target} (min: {sal.minimum}) {sal.currency}")

    return "\n".join(lines)


class GeminiProvider(LLMProvider):
    """Concrete LLM provider using Google Gemini (google-genai SDK)."""

    def __init__(self) -> None:
        if not settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY is not set. Add it to backend/.env")
        self._client = genai.Client(api_key=settings.gemini_api_key)
        self._model = settings.gemini_model

    async def _generate(self, prompt: str) -> str:
        """Send a prompt to Gemini and return the text response."""
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: self._client.models.generate_content(
                model=self._model,
                contents=prompt,
                config=genai_types.GenerateContentConfig(
                    temperature=0.2,
                    max_output_tokens=4096,
                ),
            ),
        )
        return response.text

    async def analyze_job(self, profile: Profile, job_description: str) -> MatchResponse:
        profile_text = _profile_to_text(profile)
        prompt = load_prompt("match_job", profile=profile_text, job_description=job_description)

        last_error: Exception | None = None
        for attempt in range(MAX_RETRIES + 1):
            try:
                raw = await self._generate(prompt)
                data = extract_json(raw)
                return MatchResponse(**data)
            except (ValueError, KeyError, TypeError, json.JSONDecodeError) as e:
                last_error = e
                logger.warning("Gemini analyze_job attempt %d failed: %s", attempt + 1, e)

        raise ValueError(
            f"Gemini failed to return valid JSON after {MAX_RETRIES + 1} attempts: {last_error}"
        )

    async def generate_resume(self, profile: Profile, job_description: str) -> ResumeResponse:
        profile_text = _profile_to_text(profile)
        prompt = load_prompt("generate_resume", profile=profile_text, job_description=job_description)

        last_error: Exception | None = None
        for attempt in range(MAX_RETRIES + 1):
            try:
                raw = await self._generate(prompt)
                data = extract_json(raw)
                resume = ResumeResponse(**data)
                self._save_resume_json(data)
                return resume
            except (ValueError, KeyError, TypeError, json.JSONDecodeError) as e:
                last_error = e
                logger.warning("Gemini generate_resume attempt %d failed: %s", attempt + 1, e)

        raise ValueError(
            f"Gemini failed to return valid JSON after {MAX_RETRIES + 1} attempts: {last_error}"
        )

    def _save_resume_json(self, data: dict) -> None:
        """Persist generated resume data to a datetime-stamped JSON file in the generated/ folder."""
        generated_dir = Path(__file__).resolve().parents[3] / "generated"
        generated_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = generated_dir / f"resume_{timestamp}.json"
        with output_file.open("w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        logger.info("Resume saved to %s", output_file)

    async def suggest_resume_improvements(
        self, profile: Profile, job_description: str
    ) -> ResumeSuggestion:
        """Analyze the gap between the candidate profile and a job description.

        Returns actionable keyword, skill, and section suggestions to tailor the resume.
        """
        profile_text = _profile_to_text(profile)
        prompt = load_prompt(
            "resume_suggestions",
            profile=profile_text,
            job_description=job_description,
        )

        last_error: Exception | None = None
        for attempt in range(MAX_RETRIES + 1):
            try:
                raw = await self._generate(prompt)
                data = extract_json(raw)
                return ResumeSuggestion(**data)
            except (ValueError, KeyError, TypeError, json.JSONDecodeError) as e:
                last_error = e
                logger.warning(
                    "Gemini suggest_resume_improvements attempt %d failed: %s",
                    attempt + 1,
                    e,
                )

        raise ValueError(
            f"Gemini failed to return valid JSON after {MAX_RETRIES + 1} attempts: {last_error}"
        )

    async def build_tailored_resume(
        self, profile: Profile, job_description: str, suggestions: ResumeSuggestion
    ) -> ResumeResponse:
        """Generate a resume that explicitly applies resume suggestions.

        Passes missing keywords, skills to highlight, section tips, and summary advice
        directly into the prompt so Gemini weaves them in precisely.
        """
        profile_text = _profile_to_text(profile)

        # Format suggestion lists for the prompt
        fmt_list = lambda items: "\n".join(f"  - {i}" for i in items) if items else "  (none)"

        prompt = load_prompt(
            "build_tailored_resume",
            profile=profile_text,
            job_description=job_description,
            missing_keywords=fmt_list(suggestions.missing_keywords),
            skills_to_add=fmt_list(suggestions.skills_to_add),
            sections_to_update=fmt_list(suggestions.sections_to_update),
            summary_tips=fmt_list(suggestions.summary_tips),
            overall_advice=suggestions.overall_advice or "Apply all suggestions above.",
        )

        last_error: Exception | None = None
        for attempt in range(MAX_RETRIES + 1):
            try:
                raw = await self._generate(prompt)
                data = extract_json(raw)
                resume = ResumeResponse(**data)
                self._save_resume_json(data)
                return resume
            except (ValueError, KeyError, TypeError, json.JSONDecodeError) as e:
                last_error = e
                logger.warning(
                    "Gemini build_tailored_resume attempt %d failed: %s",
                    attempt + 1,
                    e,
                )

        raise ValueError(
            f"Gemini failed to return valid JSON after {MAX_RETRIES + 1} attempts: {last_error}"
        )


@lru_cache(maxsize=1)
def get_gemini_provider() -> GeminiProvider:
    """Singleton factory for GeminiProvider (cached for the process lifetime)."""
    return GeminiProvider()
