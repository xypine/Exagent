from datetime import UTC, datetime, timedelta
from uuid import uuid4

from app.core.config import Settings
from app.db.models import CompanySearchCache
from app.services.company_search import (
    JOB_DONE,
    CompanySearchService,
    cache_key_for,
    company_query,
    discover_companies_with_fallback,
    normalize_companies,
)
from app.services.exa_provider import (
    ProviderCompany,
    ProviderDocument,
    ProviderSearchOutput,
    ProviderSearchResponse,
)


def empty_company_response() -> ProviderSearchResponse[ProviderSearchOutput]:
    return ProviderSearchResponse(results=(), output=ProviderSearchOutput(companies=()))


def populated_company_response() -> ProviderSearchResponse[ProviderSearchOutput]:
    return ProviderSearchResponse(
        results=(
            ProviderDocument(url="https://example.fi/about", title="About Example", score=0.9),
        ),
        output=ProviderSearchOutput(
            companies=(
                ProviderCompany(
                    name="Example",
                    website_url="https://example.fi/",
                    summary="An example marketing agency.",
                    highlights=(),
                ),
            )
        ),
    )


class FallbackProvider:
    def __init__(self, responses: list[ProviderSearchResponse[ProviderSearchOutput]]) -> None:
        self.responses = iter(responses)
        self.queries: list[str] = []

    async def discover_companies(
        self, query: str, *, num_results: int
    ) -> ProviderSearchResponse[ProviderSearchOutput]:
        assert num_results == 50
        self.queries.append(query)
        return next(self.responses)


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
    assert cache_key_for(" Helsinki ", "AI   / ML", "startup") == cache_key_for(
        "helsinki", "ai / ml", "startup"
    )


def test_cache_key_separates_company_sizes() -> None:
    assert cache_key_for("Helsinki", "Fintech", "startup") != cache_key_for(
        "Helsinki", "Fintech", "large"
    )


def test_company_query_requires_local_presence() -> None:
    query = company_query("Helsinki", "Fintech")

    assert "Official websites of Fintech companies" in query
    assert "headquarters, office, or other substantial business operations in Helsinki" in query
    assert "only connection to Helsinki is selling products or services" in query


def test_company_query_includes_selected_company_size() -> None:
    sme_query = company_query("Helsinki", "Fintech", "sme")

    assert "early-stage startup companies" in company_query("Helsinki", "Fintech", "startup")
    assert "small and medium-sized enterprises" in sme_query
    assert "prioritize firms closest" not in sme_query
    assert "large companies and enterprises" in company_query("Helsinki", "Fintech", "large")


async def test_company_search_does_not_fall_back_when_matches_exist() -> None:
    provider = FallbackProvider([populated_company_response()])

    companies = await discover_companies_with_fallback(
        provider,  # type: ignore[arg-type]
        area="Helsinki",
        industry="Marketing agency",
        company_size="large",
        max_results=50,
    )

    assert len(companies) == 1
    assert len(provider.queries) == 1
    assert "large companies and enterprises" in provider.queries[0]


async def test_company_search_falls_down_to_sme_after_no_large_company_matches() -> None:
    provider = FallbackProvider([empty_company_response(), populated_company_response()])

    companies = await discover_companies_with_fallback(
        provider,  # type: ignore[arg-type]
        area="Helsinki",
        industry="Marketing agency",
        company_size="large",
        max_results=50,
    )

    assert len(companies) == 1
    assert len(provider.queries) == 2
    assert "large companies and enterprises" in provider.queries[0]
    assert "small and medium-sized enterprises" in provider.queries[1]
    assert "prioritize firms closest to the 250-employee" in provider.queries[1]
    assert "not a hard requirement" in provider.queries[1]


async def test_company_search_tries_startup_after_all_larger_sizes_return_no_matches() -> None:
    provider = FallbackProvider([empty_company_response()] * 3)

    companies = await discover_companies_with_fallback(
        provider,  # type: ignore[arg-type]
        area="Helsinki",
        industry="Marketing agency",
        company_size="large",
        max_results=50,
    )

    assert companies == []
    assert len(provider.queries) == 3
    assert "large companies and enterprises" in provider.queries[0]
    assert "small and medium-sized enterprises" in provider.queries[1]
    assert "early-stage startup companies" in provider.queries[2]


def test_fresh_cache_creates_completed_job_without_scheduling_refresh() -> None:
    key = cache_key_for("Helsinki", "Fintech", "startup")
    companies = [{"id": "company-1", "name": "Example", "sources": []}]
    cache = CompanySearchCache(
        cache_key=key,
        companies=companies,
        expires_at=datetime.now(UTC) + timedelta(minutes=5),
    )
    session = CacheHitSession(cache)
    service = CompanySearchService(session, Settings())  # type: ignore[arg-type]

    job, should_start_refresh = service.create_job(
        client_id=uuid4(), area="Helsinki", industry="Fintech", company_size="startup"
    )

    assert should_start_refresh is False
    assert job.status == JOB_DONE
    assert job.company_size == "startup"
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
