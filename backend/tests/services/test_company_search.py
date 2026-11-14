from datetime import UTC, datetime, timedelta
from uuid import uuid4

from app.core.config import Settings
from app.db.models import CompanySearchCache
from app.services.company_search import (
    JOB_DONE,
    CompanySearchService,
    cache_key_for,
    company_query,
    normalize_companies,
)
from app.services.exa_provider import (
    ProviderCompany,
    ProviderDocument,
    ProviderSearchOutput,
    ProviderSearchResponse,
)


class CacheHitSession:
    def __init__(self, cache: CompanySearchCache) -> None:
        self.cache = cache
        self.added: list[object] = []
        self.commits = 0

    def get(self, model: type[CompanySearchCache], key: str) -> CompanySearchCache | None:
        assert model is CompanySearchCache
        assert key == self.cache.cache_key
        return self.cache

    def add(self, value: object) -> None:
        self.added.append(value)

    def commit(self) -> None:
        self.commits += 1

    def refresh(self, _value: object) -> None:
        pass


def test_cache_key_ignores_casing_and_repeated_whitespace() -> None:
    assert cache_key_for(" Helsinki ", "AI   / ML") == cache_key_for("helsinki", "ai / ml")


def test_company_query_requires_local_presence() -> None:
    query = company_query("Helsinki", "Fintech")

    assert "Official websites of Fintech companies" in query
    assert "headquarters, office, or other substantial business operations in Helsinki" in query
    assert "only connection to Helsinki is selling products or services" in query


def test_fresh_cache_creates_completed_job_without_scheduling_refresh() -> None:
    key = cache_key_for("Helsinki", "Fintech")
    companies = [{"id": "company-1", "name": "Example", "sources": []}]
    cache = CompanySearchCache(
        cache_key=key,
        companies=companies,
        expires_at=datetime.now(UTC) + timedelta(minutes=5),
    )
    session = CacheHitSession(cache)
    service = CompanySearchService(session, Settings())  # type: ignore[arg-type]

    job, should_start_refresh = service.create_job(
        client_id=uuid4(), area="Helsinki", industry="Fintech"
    )

    assert should_start_refresh is False
    assert job.status == JOB_DONE
    assert job.companies == companies
    assert len(session.added) == 1
    assert session.commits == 1


def test_normalized_companies_keep_only_claims_with_a_recorded_source() -> None:
    response = ProviderSearchResponse(
        results=(
            ProviderDocument(
                url="https://www.example.fi/about?utm_source=exa",
                title="About Example",
                score=0.9,
            ),
        ),
        output=ProviderSearchOutput(
            companies=(
                ProviderCompany(
                    name="Example",
                    website_url="https://example.fi/",
                    summary="A Finnish fintech company.",
                    highlights=(),
                ),
                ProviderCompany(
                    name="Unsupported",
                    website_url="https://unsupported.example/",
                    summary="This has no matching document.",
                    highlights=(),
                ),
            )
        ),
    )

    companies = normalize_companies(response, max_results=50)

    assert len(companies) == 1
    assert companies[0]["name"] == "Example"
    assert companies[0]["url"] == "https://example.fi/"
    assert companies[0]["sources"] == [
        {
            "provider": "exa",
            "url": "https://example.fi/about",
            "title": "About Example",
            "retrieved_at": companies[0]["sources"][0]["retrieved_at"],
        }
    ]
