from app.core.config import Settings


def test_legacy_postgres_url_uses_psycopg_driver() -> None:
    settings = Settings(database_url="postgres://user:password@db.example:5432/app")

    assert settings.database_url == "postgresql+psycopg://user:password@db.example:5432/app"


def test_explicit_psycopg_url_is_unchanged() -> None:
    database_url = "postgresql+psycopg://user:password@db.example:5432/app?sslmode=require"

    settings = Settings(database_url=database_url)

    assert settings.database_url == database_url
