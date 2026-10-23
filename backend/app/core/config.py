from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, read from the environment (and `.env` in development)."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Secure by default: development has to be asked for (see .env.example).
    env: Literal["development", "production", "test"] = "production"
    database_url: str = "sqlite:///./data/taraz.db"

    # Single user: the password is never stored, only its argon2 hash.
    # Generate one with `python -m app.cli hash-password`.
    auth_password_hash: str = ""
    secret_key: str = Field(default="dev-only-secret-change-me", min_length=16)
    session_days: int = 30
    cookie_secure: bool = True

    # The clinic's calendar; the container clock is UTC.
    timezone: str = "Asia/Tehran"

    # Built SPA. Absent in development, where Vite serves the frontend.
    static_dir: Path = Path(__file__).resolve().parents[2] / "static"

    @model_validator(mode="after")
    def _refuse_insecure_production(self) -> "Settings":
        if self.env == "production":
            if not self.auth_password_hash.startswith("$argon2"):
                raise ValueError("AUTH_PASSWORD_HASH must be an argon2 hash in production")
            if self.secret_key.startswith("dev-only") or len(self.secret_key) < 32:
                raise ValueError("SECRET_KEY must be a random value of at least 32 characters")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
