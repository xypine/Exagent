import pytest

from app.services.exa_provider import (
    ProviderPerson,
)
from app.services.people_search import normalize_person, titles_for


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
