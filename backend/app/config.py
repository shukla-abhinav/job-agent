from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
import os
from dotenv import load_dotenv
load_dotenv()

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Gemini
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "")

    # SerpAPI
    serpapi_key: str = os.getenv("SERPAPI_KEY", "")

    # Local profile fallback (dev only)
    profile_path: str = "../data/profile.md"
    preferences_path: str = "../data/preferences.md"

    # MongoDB
    mongo_uri: str = os.getenv("MONGO_URI", "")
    mongo_db_name: str = "jobsense"

    # JWT Auth
    secret_key: str = os.getenv("SECRET_KEY", "change-me-in-production")
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 72

    # Rate limiting
    rate_limit_calls: int = 5
    rate_limit_window_hours: int = 1

    @property
    def profile_absolute_path(self) -> Path:
        """Resolve profile path relative to the backend directory."""
        base = Path(__file__).parent.parent  # backend/
        return (base / self.profile_path).resolve()

    @property
    def preferences_absolute_path(self) -> Path:
        """Resolve preferences path relative to the backend directory."""
        base = Path(__file__).parent.parent  # backend/
        return (base / self.preferences_path).resolve()


settings = Settings()
