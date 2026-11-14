from uuid import uuid4

from app.db.models import SearchJob
from app.services.match_runs import ranked_people


def test_ranked_people_limits_to_top_five_and_keeps_company_order_for_ties() -> None:
    job = SearchJob(
        id=uuid4(),
        client_id=uuid4(),
        cache_key="a" * 64,
        area="Helsinki",
        industry="SaaS company",
        company_size="small",
        status="done",
        companies=[{"id": "first"}, {"id": "second"}],
        people=[
            {"id": "junior", "title": "Engineer", "company_id": "second"},
            {"id": "first-manager", "title": "Engineering Manager", "company_id": "first"},
            {"id": "second-manager", "title": "Engineering Manager", "company_id": "second"},
            {"id": "ceo", "title": "CEO", "company_id": "second"},
            {"id": "lead", "title": "Team Lead", "company_id": "first"},
            {"id": "recruiter", "title": "Recruiter", "company_id": "first"},
        ],
    )

    ranked = ranked_people(job, 5)

    assert [person["id"] for person in ranked] == [
        "ceo",
        "first-manager",
        "lead",
        "second-manager",
        "recruiter",
    ]
