from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg://prospecting:prospecting@localhost:5432/prospecting"
    frontend_origin: str = "http://localhost:5173"
    rate_limit_requests: int = 30
    rate_limit_window_seconds: int = 60
    exa_api_key: str | None = None
    exa_qps: float = 10
    exa_max_concurrency: int = 5
    exa_timeout_seconds: float = 30
    exa_max_retries: int = 3
    exa_retry_base_seconds: float = 0.5
    exa_retry_max_seconds: float = 10
    exa_max_queue_wait_seconds: float = 30
    exa_max_pending_requests: int = 25
    company_search_initial_results: int = Field(default=15, ge=1, le=50)
    company_search_cache_ttl_seconds: int = Field(default=86400, gt=0)
    people_search_batch_size: int = Field(default=20, ge=1, le=50)
    people_search_concurrency: int = Field(default=4, ge=1, le=10)
    people_research_cache_ttl_seconds: int = Field(default=604800, gt=0)
    gemini_api_key: str | None = None
    # Intentionally fixed to a current free-tier model: never fall back to paid inference.
    gemini_model: Literal["gemini-3.5-flash-lite"] = "gemini-3.5-flash-lite"
    matching_top_n: int = Field(default=5, ge=3, le=5)

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_legacy_postgres_url(cls, value: object) -> object:
        """Use the installed psycopg 3 dialect for legacy PostgreSQL URLs."""
        if isinstance(value, str) and value.startswith("postgres://"):
            return f"postgresql+psycopg://{value.removeprefix('postgres://')}"
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
