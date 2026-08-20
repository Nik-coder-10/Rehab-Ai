"""Application settings loaded from environment variables (prefix REHABAI_).

All secrets (JWT secret key, database credentials) must be provided via the
environment or a backend/.env file - never hardcoded.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="REHABAI_",
        extra="ignore",
    )

    app_name: str = "RehabAI"
    version: str = "0.1.0"
    environment: str = "development"
    debug: bool = True

    api_v1_prefix: str = "/api/v1"

    # Required - no insecure defaults for secrets.
    secret_key: str
    database_url: str

    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    cors_origins: list[str] = ["http://localhost:5173"]
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()
