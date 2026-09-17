"""
app/config/settings.py

Loads all configuration from environment variables / .env file.
This is the SINGLE source of all thresholds, URLs, and secrets.

Rules:
- Secrets (API keys) are NEVER printed, logged, or included in Gemini prompts.
- Thresholds (confidence, retry limits) are read here and enforced in Python code.
  Gemini cannot override them.
- Access settings via get_settings() which is cached — one load per process.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---- Gemini API ----
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash-lite"

    # ---- ASP.NET Core Backend ----
    backend_api_url: str = "http://localhost:5000"
    ai_service_api_key: str = ""

    # ---- Document Processing ----
    ocr_enabled: bool = True
    max_document_size_mb: int = 10

    # ---- Confidence Thresholds ----
    # Enforced in Python (document_validation.py). Gemini cannot override these.
    high_confidence_threshold: float = 0.90
    medium_confidence_threshold: float = 0.70

    # ---- Safety Limits ----
    max_reupload_attempts_per_document: int = 3
    max_total_agent_iterations: int = 10

    @property
    def max_document_size_bytes(self) -> int:
        """Convenience: max upload size in bytes."""
        return self.max_document_size_mb * 1024 * 1024

    def __repr__(self) -> str:
        """Safe repr — never exposes secrets."""
        return (
            f"Settings("
            f"gemini_model={self.gemini_model!r}, "
            f"backend_api_url={self.backend_api_url!r}, "
            f"high_confidence_threshold={self.high_confidence_threshold}, "
            f"medium_confidence_threshold={self.medium_confidence_threshold}, "
            f"max_reupload_attempts={self.max_reupload_attempts_per_document}, "
            f"max_iterations={self.max_total_agent_iterations}"
            f")"
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Returns the singleton Settings instance.
    Cached after first call — reads .env only once per process.
    """
    return Settings()
