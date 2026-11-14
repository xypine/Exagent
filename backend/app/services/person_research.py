"""On-demand, cached public-background research for one discovered person."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Literal
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import PersonResearchCache
from app.db.session import SessionLocal
from app.services.exa_provider import (
    ExaProvider,
    ExaProviderError,
    ProviderPerson,
    normalize_website_url,
)

ResearchStatus = Literal["not_started", "queued", "researching", "done", "failed"]


@dataclass(frozen=True)
class PersonResearchSubject:
    person_id: UUID
    name: str
    company_name: str
    profile_url: str


def queue_person_research(
    session: Session,
    subject: PersonResearchSubject,
) -> tuple[PersonResearchCache, bool]:
    """Return the cache entry and whether this request must start a refresh.

    A fresh successful result is reused. In-flight work is shared, while failures
    and expired results are retried only after an explicit new POST.
    """
    now = datetime.now(UTC)
    cache = session.get(PersonResearchCache, subject.person_id)
    if cache is not None:
        if cache.status == "done" and cache.expires_at is not None and cache.expires_at > now:
            return cache, False
        if cache.status in {"queued", "researching"}:
            return cache, False

        cache.person_name = subject.name
        cache.company_name = subject.company_name
        cache.profile_url = subject.profile_url
        cache.status = "queued"
        cache.work_history = []
        cache.education = []
        cache.volunteer_experience = []
        cache.error = None
        cache.fetched_at = None
        cache.expires_at = None
    else:
        cache = PersonResearchCache(
            person_id=subject.person_id,
            person_name=subject.name,
            company_name=subject.company_name,
            profile_url=subject.profile_url,
            status="queued",
        )
        session.add(cache)
    session.commit()
    session.refresh(cache)
    return cache, True


async def refresh_person_research(person_id: UUID) -> None:
    """Background-task entry point; it owns its database session."""
    with SessionLocal() as session:
        cache = session.get(PersonResearchCache, person_id)
        if cache is None or cache.status != "queued":
            return

        cache.status = "researching"
        session.commit()

        provider = ExaProvider(get_settings())
        try:
            response = await provider.research_person(
                cache.person_name,
                company_name=cache.company_name,
                profile_url=cache.profile_url,
            )
            researched_person = _person_for_profile(response.output.people, cache.profile_url)
        except (ExaProviderError, ValueError):
            cache.status = "failed"
            cache.error = "Background research failed. Try again."
            cache.work_history = []
            cache.education = []
            cache.volunteer_experience = []
        except Exception:
            # Do not surface provider data or internal implementation details.
            cache.status = "failed"
            cache.error = "Background research failed. Try again."
            cache.work_history = []
            cache.education = []
            cache.volunteer_experience = []
        else:
            now = datetime.now(UTC)
            cache.status = "done"
            cache.work_history = [
                entry.model_dump() for entry in researched_person.previous_experience
            ]
            cache.education = [entry.model_dump() for entry in researched_person.education]
            cache.volunteer_experience = [
                entry.model_dump() for entry in researched_person.volunteer_experience
            ]
            cache.error = None
            cache.fetched_at = now
            cache.expires_at = now + timedelta(
                seconds=get_settings().people_research_cache_ttl_seconds
            )
        finally:
            await provider.close()
        session.commit()


def _person_for_profile(people: tuple[ProviderPerson, ...], profile_url: str) -> ProviderPerson:
    """Accept only the exact discovered profile; names alone are not safe identity."""
    normalized_profile = normalize_website_url(profile_url)
    if normalized_profile is None:
        raise ValueError("profile_url must be valid")

    matches = [
        person
        for person in people
        if normalize_website_url(person.profile_url) == normalized_profile
    ]
    if len(matches) != 1:
        raise ValueError("Research did not identify the requested profile")
    return matches[0]
