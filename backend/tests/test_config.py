import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_legacy_postgres_url_uses_psycopg_driver() -> None:
    settings = Settings(database_url="postgres://user:password@db.example:5432/app")

    assert settings.database_url == "postgresql+psycopg://user:password@db.example:5432/app"


def test_explicit_psycopg_url_is_unchanged() -> None:
    database_url = "postgresql+psycopg://user:password@db.example:5432/app?sslmode=require"

    settings = Settings(database_url=database_url)

    assert settings.database_url == database_url


def test_company_search_initial_result_cap_cannot_exceed_fifty() -> None:
    with pytest.raises(ValidationError):
        Settings(company_search_initial_results=51)


def test_matching_top_n_stays_between_three_and_five() -> None:
    with pytest.raises(ValidationError):
        Settings(matching_top_n=2)
    with pytest.raises(ValidationError):
        Settings(matching_top_n=6)


def test_matching_model_cannot_be_changed_to_a_paid_model() -> None:
    with pytest.raises(ValidationError):
        Settings(gemini_model="gemini-4-carbon")  # type: ignore[arg-type]
