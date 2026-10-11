"""Application configuration powered by pydantic-settings."""

from __future__ import annotations

import os
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls,
        init_settings,
        env_settings,
        dotenv_settings,
        file_secret_settings,
    ):
        # Prioritize values from .env file over ambient/stale system environment variables
        return (init_settings, dotenv_settings, env_settings, file_secret_settings)

    # Core environment & Database
    ENV: str = Field(default="dev")
    DEBUG: bool = Field(default=False)
    APP_NAME: str = Field(default="GramUdyam AI")
    APP_VERSION: str = Field(default="1.0.0")
    DATABASE_URL: str = Field(default="sqlite:///./app.db")

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, v):
        if isinstance(v, str):
            return v.lower() in ("true", "1", "yes", "debug")
        return bool(v)

    # Firebase Auth configuration
    FIREBASE_PROJECT_ID: str = Field(default="gramudyog-d0862")
    FIREBASE_SERVICE_ACCOUNT_JSON: str | None = Field(default=None)
    FIREBASE_SERVICE_ACCOUNT_PATH: str | None = Field(default=None)

    # CORS
    CORS_ORIGINS: str = Field(default="http://localhost:5173,http://localhost:3000")

    # Rate limiting & Proxies
    TRUSTED_PROXY_COUNT: int = Field(default=1)
    RATE_LIMIT_MAX_REQUESTS: int = Field(default=60)
    RATE_LIMIT_WINDOW_SECONDS: int = Field(default=60)
    RATE_LIMIT_GENERAL: str = Field(default="60/minute")
    RATE_LIMIT_AI: str = Field(default="15/minute")
    DEMO_MODE: bool = Field(default=False)

    # Data lifecycle & Chat retention
    CHAT_MESSAGE_RETENTION_DAYS: int = Field(default=90)
    MAX_CHAT_MESSAGES_PER_SESSION: int = Field(default=50)

    # Caching
    CACHE_TTL_SECONDS: int = Field(default=86400)
    MAX_LOAN_AMOUNT: float = Field(default=50_000_000.0)

    # LLM Provider Configuration (OpenAI, Groq & fallback)
    OPENAI_API_KEY: str | None = Field(default=None)
    OPENAI_MODEL: str = Field(default="gpt-4o-mini")

    GROQ_API_KEY: str | None = Field(default=None)
    GROQ_MODEL: str = Field(default="llama-3.3-70b-versatile")

    ANTHROPIC_API_KEY: str | None = Field(default=None)

    # Primary LLM provider selection: 'groq' or 'openai'
    LLM_PROVIDER: str = Field(default="groq")
    LLM_MODEL: str = Field(default="llama-3.3-70b-versatile")
    LLM_TEMPERATURE: float = Field(default=0.3)
    LLM_MAX_TOKENS: int = Field(default=4096)
    LLM_TIMEOUT: int = Field(default=30)

    @property
    def cors_origins_list(self) -> list[str]:
        """Return CORS origins parsed as a list of strings."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
