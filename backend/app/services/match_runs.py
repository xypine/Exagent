"""Top-N person research and Gemini matching runs."""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.models import MatchRun, PersonResearchCache, SearchJob
from app.db.session import SessionLocal
from app.services.gemini_matching import GeminiMatchingError, GeminiMatchingService
from app.services.matching import Breakdown, MatchEvidence, ScoredMatch
from app.services.people_ranking import decision_power_score, hiring_influence_score
from app.services.person_research import (
    PersonResearchSubject,
    queue_person_research,
    refresh_person_research,
)

MatchRunStatus = str
_TERMINAL_STATUSES = {"done", "failed"}
logger = logging.getLogger(__name__)


def ranked_people(job: SearchJob, limit: int) -> list[dict[str, Any]]:
    """Rank by deterministic hiring influence; preserve Exa company order for ties."""
    company_positions = {company.get("id"): index for index, company in enumerate(job.companies)}
    indexed = [
        (index, person)
        for index, person in enumerate(job.people)
        if person.get("employer_verified", True) is True
    ]
    ranked = sorted(
        indexed,
        key=lambda item: (
            -hiring_influence_score(str(item[1].get("title", ""))),
            company_positions.get(item[1].get("company_id"), len(job.companies)),
            item[0],
        ),
    )
    return [person for _, person in ranked[:limit]]


def create_match_run(
    session: Session,
    *,
    job: SearchJob,
    client_id: UUID,
    profile: str,
    settings: Settings | None = None,
) -> tuple[MatchRun, bool]:
    """Create an independent run. Its profile is never used as a cache key."""
    active = session.scalar(
        select(MatchRun).where(
            MatchRun.job_id == job.id,
            MatchRun.client_id == client_id,
            MatchRun.status.not_in(_TERMINAL_STATUSES),
        )
    )
    if active is not None:
        return active, False

    config = settings or get_settings()
    people = ranked_people(job, config.matching_top_n)
    run = MatchRun(
        job_id=job.id,
        client_id=client_id,
        profile=profile.strip() or None,
        candidate_ids=[str(person["id"]) for person in people if isinstance(person.get("id"), str)],
        status="queued",
    )
    session.add(run)
    session.commit()
    session.refresh(run)
    return run, True


async def refresh_match_run(run_id: UUID) -> None:
    """Research and score the run's bounded candidates sequentially for free-tier safety."""
    with SessionLocal() as session:
        run = session.get(MatchRun, run_id)
        if run is None or run.status in _TERMINAL_STATUSES:
            return
        profile = run.profile or ""
        job = session.scalar(
            select(SearchJob).where(
                SearchJob.id == run.job_id, SearchJob.client_id == run.client_id
            )
        )
        if job is None:
            _finish_failed(session, run, "The original search is no longer available.")
            return

        people_by_id = {str(person.get("id")): person for person in job.people}
        if not profile.strip():
            _finish_influence_only_run(session, run, people_by_id)
            return

        run.status = "researching"
        session.commit()
        had_failure = False
        failure_messages: list[str] = []

        for person_id in run.candidate_ids:
            person = people_by_id.get(person_id)
            if person is None:
                had_failure = True
                failure_messages.append("A selected person is no longer available.")
                _record_progress(session, run)
                continue
            try:
                research = await _ensure_research(session, person)
                if research is None:
                    had_failure = True
                    failure_messages.append("Background research failed. Try again.")
                    _record_progress(session, run)
                    continue
                run.status = "matching"
                session.commit()
                payload = _match_payload(job, person, research)
                scored = await asyncio.to_thread(
                    GeminiMatchingService().score,
                    profile=profile,
                    people=[payload],
                )
                run.results = [*run.results, scored[0].model_dump(mode="json")]
            except GeminiMatchingError as error:
                had_failure = True
                logger.warning("Match scoring failed for person %s: %s", person_id, error)
                failure_messages.append(str(error))
            except Exception:
                had_failure = True
                logger.exception("Unexpected match-run failure for person %s", person_id)
                failure_messages.append("Match scoring failed unexpectedly. Try again.")
            _record_progress(session, run)

        run.status = "failed" if had_failure and not run.results else "done"
        run.error = _failure_message(failure_messages) if had_failure else None
        run.completed_at = datetime.now(UTC)
        # The profile was task input, not a stored user profile or a cache key.
        run.profile = None
        session.commit()


async def _ensure_research(session: Session, person: dict[str, Any]) -> PersonResearchCache | None:
    try:
        person_id = UUID(str(person["id"]))
        subject = PersonResearchSubject(
            person_id=person_id,
            name=str(person["name"]),
            company_name=str(person["company_name"]),
            profile_url=str(person["profile_url"]),
        )
    except (KeyError, ValueError):
        return None

    cache, should_start = queue_person_research(session, subject)
    if should_start:
        await refresh_person_research(person_id)
        session.expire_all()
        refreshed_cache = session.get(PersonResearchCache, person_id)
        return (
            refreshed_cache
            if refreshed_cache is not None and refreshed_cache.status == "done"
            else None
        )
    return cache if cache is not None and cache.status == "done" else None


def _match_payload(
    job: SearchJob, person: dict[str, Any], research: PersonResearchCache
) -> dict[str, Any]:
    company = next(
        (item for item in job.companies if item.get("id") == person.get("company_id")),
        {},
    )
    return {
        "id": person["id"],
        "name": person.get("name"),
        "current_role": {
            "title": person.get("title"),
            "matched_job_title": person.get("matched_job_title"),
            "profile_url": person.get("profile_url"),
            "evidence_url": person.get("evidence_url"),
            "evidence_summary": person.get("evidence_summary"),
        },
        "company": {
            "name": company.get("name", person.get("company_name")),
            "summary": company.get("summary"),
            "sources": company.get("sources", []),
        },
        "research": {
            "work_history": research.work_history,
            "education": research.education,
            "volunteer_experience": research.volunteer_experience,
        },
    }


def _finish_influence_only_run(
    session: Session, run: MatchRun, people_by_id: dict[str, dict[str, Any]]
) -> None:
    """Avoid provider work when there is no profile to assess against."""
    for person_id in run.candidate_ids:
        person = people_by_id.get(person_id)
        if person is not None:
            run.results = [*run.results, _influence_only_match(person).model_dump(mode="json")]
        _record_progress(session, run)
    run.status = "done"
    run.profile = None
    run.completed_at = datetime.now(UTC)
    session.commit()


def _influence_only_match(person: dict[str, Any]) -> ScoredMatch:
    influence = decision_power_score(str(person.get("title", "")))
    title = str(person.get("title", "their current role"))
    company = str(person.get("company_name", "their company"))
    return ScoredMatch(
        id=str(person["id"]),
        confidence="medium",
        breakdown=Breakdown(
            decision_power=round(influence / 100 * 40),
            background_fit=None,
            shared_ground=None,
        ),
        reasoning=f"Hiring influence is based on the {title} role at {company}.",
        outreach_approaches=[],
        missing_info=[
            "Background fit and shared ground could not be assessed without your profile."
        ],
        evidence=[
            MatchEvidence(
                factor="decision_power",
                fact=f"Current role: {title} at {company}.",
                source_label="Current-role evidence",
                source_url=(
                    str(person.get("evidence_url") or person.get("profile_url") or "") or None
                ),
            )
        ],
        score=influence,
    )


def _record_progress(session: Session, run: MatchRun) -> None:
    run.completed_count += 1
    session.commit()


def _finish_failed(session: Session, run: MatchRun, message: str) -> None:
    run.status = "failed"
    run.error = message
    run.profile = None
    run.completed_at = datetime.now(UTC)
    session.commit()


def _failure_message(messages: list[str]) -> str:
    """Expose the safe provider failure instead of masking it with a generic summary."""
    unique_messages = list(dict.fromkeys(message for message in messages if message))
    if not unique_messages:
        return "Some people could not be researched or scored. Try a new run to retry them."
    detail = " ".join(unique_messages)
    return f"{detail} Try a new run to retry failed people."[:500]
