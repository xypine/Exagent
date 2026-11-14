from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg://prospecting:prospecting@localhost:5432/prospecting"
    frontend_origin: str = "http://localhost:5173"
    rate_limit_requests: int = 30
    rate_limit_window_seconds: int = 60
    exa_api_key: str | None = None
    gemini_api_key: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
