"""Application configuration powered by pydantic-settings."""

from __future__ import annotations

import os
from pydantic import Field
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
    DATABASE_URL: str = Field(default="sqlite:///./app.db")

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
    DEMO_MODE: bool = Field(default=False)

    # Data lifecycle & Chat retention
    CHAT_MESSAGE_RETENTION_DAYS: int = Field(default=90)
    MAX_CHAT_MESSAGES_PER_SESSION: int = Field(default=50)

    # Caching
    CACHE_TTL_SECONDS: int = Field(default=86400)
    MAX_LOAN_AMOUNT: float = Field(default=50_000_000.0)

    # LLM Provider Configuration (OpenAI & Groq)
    OPENAI_API_KEY: str | None = Field(default=None)
    OPENAI_MODEL: str = Field(default="gpt-4o-mini")

    GROQ_API_KEY: str | None = Field(default=None)
    GROQ_MODEL: str = Field(default="llama-3.3-70b-versatile")

    # Primary LLM provider selection: 'groq' or 'openai'
    LLM_PROVIDER: str = Field(default="groq")
    LLM_MODEL: str = Field(default="llama-3.3-70b-versatile")


settings = Settings()

