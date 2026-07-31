"""
Abstract LLM provider interface.
All concrete providers must implement this interface.
"""

from abc import ABC, abstractmethod
from app.models.profile import Profile
from app.models.job import MatchResponse, ResumeResponse


class LLMProvider(ABC):
    """
    Abstract base class for LLM providers.

    Implementations: GeminiProvider
    Future: OpenAIProvider, AnthropicProvider, etc.
    """

    @abstractmethod
    async def analyze_job(self, profile: Profile, job_description: str) -> MatchResponse:
        """
        Analyze how well the candidate profile matches the job description.

        Args:
            profile: Parsed candidate profile.
            job_description: Raw job posting text.

        Returns:
            MatchResponse with score, strengths, missing skills, recommendation, and reasoning.
        """
        ...

    @abstractmethod
    async def generate_resume(self, profile: Profile, job_description: str) -> ResumeResponse:
        """
        Generate an ATS-optimized resume tailored to the job description.

        Rules enforced by prompt:
        - Never invent information, projects, or skills.
        - Never change years of experience.
        - Only reorder, rewrite, and emphasize relevant information.

        Args:
            profile: Parsed candidate profile (source of truth).
            job_description: Raw job posting text.

        Returns:
            ResumeResponse with structured resume data.
        """
        ...
