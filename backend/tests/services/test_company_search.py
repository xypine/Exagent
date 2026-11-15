from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from app.core.config import Settings
from app.db.models import CompanySearchCache, PeopleSearchCache, SearchJob
from app.services.company_search import (
    JOB_DONE,
    JOB_FINDING_COMPANIES,
    CompanySearchService,
    cache_key_for,
    company_query,
    discover_companies_with_fallback,
    merge_companies,
    next_company_result_limit,
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
    def __init__(self, cache: CompanySearchCache, people_cache: PeopleSearchCache) -> None:
        self.cache = cache
        self.people_cache = people_cache
        self.added: list[object] = []
        self.commits = 0

    def get(
        self, model: type[CompanySearchCache] | type[PeopleSearchCache], key: str
    ) -> CompanySearchCache | PeopleSearchCache:
        assert key == self.cache.cache_key
        if model is CompanySearchCache:
            return self.cache
        assert model is PeopleSearchCache
        return self.people_cache

    def add(self, value: object) -> None:
        self.added.append(value)

    def commit(self) -> None:
        self.commits += 1

    def refresh(self, _value: object) -> None:
        pass


class MoreCompaniesSession:
    def __init__(self, job: SearchJob, cache: CompanySearchCache) -> None:
        self.job = job
        self.cache = cache
        self.commits = 0

    def get(self, model: object, _key: object) -> SearchJob | CompanySearchCache:
        if model is SearchJob:
            return self.job
        assert model is CompanySearchCache
        return self.cache

    def commit(self) -> None:
        self.commits += 1

    def refresh(self, _value: object) -> None:
        pass


def test_cache_key_ignores_casing_and_repeated_whitespace() -> None:
    assert cache_key_for(" Helsinki ", "AI   / ML", "small") == cache_key_for(
        "helsinki", "ai / ml", "small"
    )


def test_cache_key_separates_company_sizes() -> None:
    assert cache_key_for("Helsinki", "Fintech", "small") != cache_key_for(
        "Helsinki", "Fintech", "large"
    )


def test_company_query_requires_local_presence() -> None:
    query = company_query("Helsinki", "Fintech")

    assert "Official websites of Fintech companies" in query
    assert "headquarters, office, or other substantial business operations in Helsinki" in query
    assert "only connection to Helsinki is selling products or services" in query


def test_company_query_includes_selected_headcount_range() -> None:
    small_query = company_query("Helsinki", "Fintech", "small")
    medium_query = company_query("Helsinki", "Fintech", "medium")
    large_query = company_query("Helsinki", "Fintech", "large")

    assert "fewer than 25 employees" in small_query
    assert "25–150 employees" in medium_query
    assert "prioritize firms closest" not in medium_query
    assert "150 or more employees" in large_query
    assert "startup" not in small_query.casefold()


def test_company_query_uses_company_sector_terms_for_recruiters() -> None:
    query = company_query("Helsinki, Finland", "Recruiters", "small")

    assert "recruitment agencies, executive-search firms, and staffing companies" in query
    assert "Recruiters companies" not in query
    assert "fewer than 25 employees" in query


def test_next_company_result_limit_expands_in_user_sized_batches() -> None:
    assert next_company_result_limit(15, initial_results=15, max_results=50) == 30
    assert next_company_result_limit(31, initial_results=15, max_results=50) == 46
    assert next_company_result_limit(46, initial_results=15, max_results=50) == 50


def test_merge_companies_keeps_existing_order_and_deduplicates() -> None:
    existing = [{"id": "first", "name": "First"}, {"id": "second", "name": "Second"}]
    discovered = [{"id": "second", "name": "Updated"}, {"id": "third", "name": "Third"}]

    assert merge_companies(existing, discovered) == [
        {"id": "first", "name": "First"},
        {"id": "second", "name": "Second"},
        {"id": "third", "name": "Third"},
    ]


async def test_more_companies_merges_results_without_starting_people_research(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    job = SearchJob(
        id=uuid4(),
        client_id=uuid4(),
        cache_key="a" * 64,
        area="Helsinki",
        industry="Fintech",
        company_size="small",
        status=JOB_DONE,
        companies=[{"id": "first", "name": "First"}],
    )
    cache = CompanySearchCache(cache_key=job.cache_key, companies=list(job.companies))
    session = MoreCompaniesSession(job, cache)
    service = CompanySearchService(
        session,  # type: ignore[arg-type]
        Settings(company_search_initial_results=15, company_search_max_results=50),
    )

    class FakeProvider:
        def __init__(self, _settings: Settings) -> None:
            pass

        async def close(self) -> None:
            pass

    async def discover(*_args: object, **kwargs: object) -> list[dict[str, str]]:
        assert kwargs["max_results"] == 30
        return [
            {"id": "first", "name": "First"},
            {"id": "second", "name": "Second"},
        ]

    monkeypatch.setattr("app.services.company_search.ExaProvider", FakeProvider)
    monkeypatch.setattr("app.services.company_search.discover_companies_with_fallback", discover)

    assert service.search_more_companies(job) is True
    assert job.status == JOB_FINDING_COMPANIES

    await service.refresh_more_companies(job.id)

    assert job.status == JOB_DONE
    assert job.companies == [
        {"id": "first", "name": "First"},
        {"id": "second", "name": "Second"},
    ]
    assert cache.companies == job.companies


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
    assert "150 or more employees" in provider.queries[0]


async def test_company_search_falls_down_to_medium_after_no_large_company_matches() -> None:
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
    assert "150 or more employees" in provider.queries[0]
    assert "25–150 employees" in provider.queries[1]
    assert "prioritize firms closest to the 150-employee" in provider.queries[1]
    assert "not a hard requirement" in provider.queries[1]


async def test_company_search_tries_small_after_all_larger_sizes_return_no_matches() -> None:
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
    assert "150 or more employees" in provider.queries[0]
    assert "25–150 employees" in provider.queries[1]
    assert "fewer than 25 employees" in provider.queries[2]


def test_fresh_cache_reuses_completed_key_people_without_scheduling_refresh() -> None:
    key = cache_key_for("Helsinki", "Fintech", "small")
    companies = [{"id": "company-1", "name": "Example", "sources": []}]
    cache = CompanySearchCache(
        cache_key=key,
        companies=companies,
        expires_at=datetime.now(UTC) + timedelta(minutes=5),
    )
    people_cache = PeopleSearchCache(
        cache_key=key,
        people=[{"id": "person-1", "name": "Aino"}],
        companies_searched=1,
        request_count=1,
        expires_at=datetime.now(UTC) + timedelta(minutes=5),
    )
    session = CacheHitSession(cache, people_cache)
    service = CompanySearchService(session, Settings())  # type: ignore[arg-type]

    job, should_start_refresh = service.create_job(
        client_id=uuid4(), area="Helsinki", industry="Fintech", company_size="small"
    )

    assert should_start_refresh is False
    assert job.status == JOB_DONE
    assert job.company_size == "small"
    assert job.companies == companies
    assert job.people == people_cache.people
    assert job.people_companies_searched == 1
    assert job.people_request_count == 1
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
