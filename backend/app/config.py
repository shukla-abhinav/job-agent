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

    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "")
    profile_path: str = "../data/profile.md"
    preferences_path: str = "../data/preferences.md"
    serpapi_key: str = os.getenv("SERPAPI_KEY", "")

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
