from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest

from app.db.models import PersonResearchCache
from app.services.exa_provider import ProviderPerson
from app.services.person_research import (
    PersonResearchSubject,
    _person_for_profile,
    queue_person_research,
)


class FakeSession:
    def __init__(self) -> None:
        self.records: dict[UUID, PersonResearchCache] = {}
        self.commits = 0

    def get(self, _model: type[PersonResearchCache], person_id: UUID) -> PersonResearchCache | None:
        return self.records.get(person_id)

    def add(self, cache: PersonResearchCache) -> None:
        self.records[cache.person_id] = cache

    def commit(self) -> None:
        self.commits += 1

    def refresh(self, _cache: PersonResearchCache) -> None:
        pass


def _subject() -> PersonResearchSubject:
    return PersonResearchSubject(
        person_id=uuid4(),
        name="Aino Example",
        company_name="Example Oy",
        profile_url="https://linkedin.com/in/aino-example",
    )


def _person(profile_url: str = "https://linkedin.com/in/aino-example") -> ProviderPerson:
    return ProviderPerson(
        name="Aino Example",
        title="Engineering Manager",
        company_name="Example Oy",
        matched_job_title="Engineering Manager",
        profile_url=profile_url,
        evidence_url="https://example.fi/team/aino",
        evidence_summary="Leads engineering.",
    )


def test_queue_person_research_creates_one_shared_in_flight_entry() -> None:
    session = FakeSession()
    subject = _subject()

    created, should_start = queue_person_research(session, subject)  # type: ignore[arg-type]
    repeated, repeated_should_start = queue_person_research(session, subject)  # type: ignore[arg-type]

    assert created is repeated
    assert created.status == "queued"
    assert should_start is True
    assert repeated_should_start is False
    assert session.commits == 1


def test_queue_person_research_reuses_a_fresh_completed_result() -> None:
    session = FakeSession()
    subject = _subject()
    session.records[subject.person_id] = PersonResearchCache(
        person_id=subject.person_id,
        person_name=subject.name,
        company_name=subject.company_name,
        profile_url=subject.profile_url,
        status="done",
        expires_at=datetime.now(UTC) + timedelta(days=1),
    )

    cache, should_start = queue_person_research(session, subject)  # type: ignore[arg-type]

    assert cache.status == "done"
    assert should_start is False
    assert session.commits == 0


def test_queue_person_research_retries_an_expired_result_with_empty_facts() -> None:
    session = FakeSession()
    subject = _subject()
    session.records[subject.person_id] = PersonResearchCache(
        person_id=subject.person_id,
        person_name="Old name",
        company_name="Old company",
        profile_url=subject.profile_url,
        status="done",
        work_history=[{"company_name": "Old company", "role": "Old role", "source_url": "x"}],
        expires_at=datetime.now(UTC) - timedelta(seconds=1),
    )

    cache, should_start = queue_person_research(session, subject)  # type: ignore[arg-type]

    assert cache.status == "queued"
    assert cache.person_name == subject.name
    assert cache.company_name == subject.company_name
    assert cache.work_history == []
    assert should_start is True


def test_research_accepts_only_the_exact_discovered_profile() -> None:
    selected = _person()

    result = _person_for_profile((selected,), "https://linkedin.com/in/aino-example")

    assert result is selected


def test_research_rejects_a_same_named_but_different_profile() -> None:
    with pytest.raises(ValueError, match="requested profile"):
        _person_for_profile(
            (_person("https://linkedin.com/in/another-aino"),), _subject().profile_url
        )
