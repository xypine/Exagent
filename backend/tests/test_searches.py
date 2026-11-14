from uuid import uuid4

from app.api.routes.searches import CompanyResponse, _search_response
from app.db.models import SearchJob


def company_response(summary: str) -> CompanyResponse:
    return CompanyResponse(
        id="company-1",
        name="Evli",
        url="https://evli.com/",
        summary=summary,
        sources=[],
    )


def test_company_response_removes_numeric_citation_markers() -> None:
    response = company_response(
        "Evli is a Nordic investment management company serving institutions. [2]"
    )

    assert response.summary == (
        "Evli is a Nordic investment management company serving institutions."
    )


def test_company_response_preserves_non_citation_brackets() -> None:
    response = company_response("A [family-owned] company with a [2024] strategy. [1, 2–3]")

    assert response.summary == "A [family-owned] company with a [2024] strategy."


def test_search_response_exposes_criteria_and_live_request_progress() -> None:
    job = SearchJob(
        id=uuid4(),
        client_id=uuid4(),
        cache_key="a" * 64,
        area="Helsinki",
        industry="SaaS company",
        company_size="small",
        status="finding_people",
        companies=[],
        people=[],
        people_companies_searched=2,
        people_request_count=5,
        people_requests_completed=3,
        people_requests_failed=1,
    )

    response = _search_response(job, batch_size=20)

    assert (response.area, response.industry, response.company_size) == (
        "Helsinki",
        "SaaS company",
        "small",
    )
    assert response.people_search_stats.requests_in_flight == 2
    assert response.people_search_stats.requests_completed == 3
    assert response.people_search_stats.requests_failed == 1
