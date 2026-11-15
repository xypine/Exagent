from uuid import uuid4

from app.api.routes.searches import CompanyResponse, _authorized_person, _search_response
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
    assert response.can_load_more_companies is True


class SearchJobSession:
    def __init__(self, job: SearchJob) -> None:
        self.job = job

    def scalar(self, _statement: object) -> SearchJob:
        return self.job


def test_authorized_person_adds_derived_decision_power_score() -> None:
    client_id = uuid4()
    person_id = uuid4()
    job = SearchJob(
        id=uuid4(),
        client_id=client_id,
        cache_key="a" * 64,
        area="Helsinki",
        industry="SaaS company",
        company_size="small",
        status="done",
        companies=[],
        people=[
            {
                "id": str(person_id),
                "company_id": "company-1",
                "company_name": "Evli",
                "name": "Aino Example",
                "title": "Chief Technology Officer",
                "matched_job_title": "Chief Technology Officer",
                "profile_url": "https://www.linkedin.com/in/aino-example",
                "evidence_url": "https://example.com/team/aino-example",
                "evidence_summary": "Leads technology.",
            }
        ],
    )

    person = _authorized_person(  # type: ignore[arg-type]
        SearchJobSession(job), job_id=job.id, client_id=client_id, person_id=person_id
    )

    assert person.decision_power_score == 80
