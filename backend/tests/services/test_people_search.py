import asyncio

import pytest

from app.services.exa_provider import (
    ProviderPeopleSearchOutput,
    ProviderPerson,
    ProviderSearchResponse,
)
from app.services.people_search import discover_key_people, normalize_person, titles_for


def test_titles_for_maps_the_frontend_industry_label_to_a_preset() -> None:
    titles = titles_for("SaaS company")

    assert "Software Engineer" in titles


def test_titles_for_rejects_free_text_industries() -> None:
    with pytest.raises(ValueError, match="Key people are unavailable"):
        titles_for("Fintech")


def test_normalize_person_keeps_only_lightweight_discovery_fields() -> None:
    person = ProviderPerson(
        name="Aino Example",
        title="Engineering Manager",
        company_name="Example Oy",
        matched_job_title="Engineering Manager",
        profile_url="https://linkedin.com/in/aino-example",
        evidence_url="https://example.fi/team/aino",
        evidence_summary="Leads the engineering team.",
    )

    normalized = normalize_person(person, company_id="company-1", company_name="Example Oy")

    assert normalized == {
        "id": normalized["id"],
        "company_id": "company-1",
        "company_name": "Example Oy",
        "name": "Aino Example",
        "title": "Engineering Manager",
        "matched_job_title": "Engineering Manager",
        "profile_url": "https://linkedin.com/in/aino-example",
        "evidence_url": "https://example.fi/team/aino",
        "evidence_summary": "Leads the engineering team.",
    }


class ConcurrentPeopleProvider:
    def __init__(self) -> None:
        self.active = 0
        self.max_active = 0

    async def discover_people(
        self,
        _company_name: str,
        *,
        company_domain: str,
        job_titles: tuple[str, ...],
        num_results: int,
    ) -> ProviderSearchResponse[ProviderPeopleSearchOutput]:
        assert company_domain.endswith(".example")
        assert job_titles
        assert num_results == 10
        self.active += 1
        self.max_active = max(self.max_active, self.active)
        await asyncio.sleep(0)
        self.active -= 1
        return ProviderSearchResponse(results=(), output=ProviderPeopleSearchOutput(people=()))


async def test_people_search_runs_companies_concurrently_and_reports_each_completion() -> None:
    provider = ConcurrentPeopleProvider()
    completions: list[tuple[list[dict[str, object]], bool]] = []
    companies = [
        {"id": f"company-{index}", "name": f"Company {index}", "url": f"https://{index}.example"}
        for index in range(3)
    ]

    people = await discover_key_people(
        provider,  # type: ignore[arg-type]
        companies=companies,
        industry="SaaS company",
        concurrency=2,
        on_company_complete=lambda discovered, failed: _record_completion(
            completions, discovered, failed
        ),
    )

    assert people == []
    assert provider.max_active == 2
    assert completions == [([], False), ([], False), ([], False)]


async def _record_completion(
    completions: list[tuple[list[dict[str, object]], bool]],
    people: list[dict[str, object]],
    failed: bool,
) -> None:
    completions.append((people, failed))
