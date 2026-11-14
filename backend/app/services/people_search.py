"""Automatic, bounded people discovery for a completed company search."""

from __future__ import annotations

import asyncio
import json
import re
from collections.abc import Awaitable, Callable, Sequence
from functools import lru_cache
from pathlib import Path
from typing import Any
from uuid import UUID, uuid5

from app.services.exa_provider import (
    ExaProvider,
    ProviderPerson,
    normalize_domain,
    normalize_website_url,
)
from app.services.people_ranking import rank_by_hiring_influence

PEOPLE_NAMESPACE = UUID("839f1d5f-f884-4e31-97a0-1a51c4fb2a89")
JOB_TITLES_PATH = Path(__file__).resolve().parents[2] / "job_titles.json"


@lru_cache
def job_title_presets() -> dict[str, tuple[str, ...]]:
    """Load the role presets shared with the frontend industry selector."""
    try:
        raw = json.loads(JOB_TITLES_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError("Could not load key-people role presets.") from error
    if not isinstance(raw, dict):
        raise ValueError("Key-people role presets must be an object.")

    presets: dict[str, tuple[str, ...]] = {}
    for key, titles in raw.items():
        if (
            not isinstance(key, str)
            or not isinstance(titles, list)
            or not titles
            or any(not isinstance(title, str) or not title.strip() for title in titles)
        ):
            raise ValueError("Key-people role presets are invalid.")
        presets[key] = tuple(title.strip() for title in titles)
    return presets


def preset_key(industry: str) -> str:
    """Convert the frontend's human-readable label to a job_titles.json key."""
    return re.sub(r"[^a-z0-9]+", "_", industry.casefold()).strip("_")


def titles_for(industry: str) -> tuple[str, ...]:
    key = preset_key(industry)
    try:
        return job_title_presets()[key]
    except KeyError as error:
        raise ValueError(
            "Key people are unavailable for this industry. Choose one of the suggested industries."
        ) from error


async def discover_key_people(
    provider: ExaProvider,
    *,
    companies: Sequence[dict[str, Any]],
    industry: str,
    concurrency: int = 1,
    on_company_complete: Callable[[list[dict[str, Any]], bool], Awaitable[None]] | None = None,
) -> list[dict[str, Any]]:
    """Discover lightweight, role-matched people for each company.

    Extended background research deliberately belongs to the later matching stage.
    """
    titles = titles_for(industry)
    people: list[dict[str, Any]] = []
    seen_profiles: set[str] = set()

    semaphore = asyncio.Semaphore(concurrency)

    async def discover_for_company(company: dict[str, Any]) -> list[dict[str, Any]]:
        company_id = company.get("id")
        company_name = company.get("name")
        company_url = company.get("url")
        if (
            not isinstance(company_id, str)
            or not company_id
            or not isinstance(company_name, str)
            or not company_name
            or not isinstance(company_url, str)
            or not company_url
        ):
            if on_company_complete is not None:
                await on_company_complete([], True)
            return []
        domain = normalize_domain(company_url)
        if domain is None:
            if on_company_complete is not None:
                await on_company_complete([], True)
            return []

        try:
            async with semaphore:
                discovery = await provider.discover_people(
                    company_name,
                    company_domain=domain,
                    job_titles=titles,
                    num_results=10,
                )
        except Exception:
            if on_company_complete is None:
                raise
            await on_company_complete([], True)
            return []

        discovered_people: list[dict[str, Any]] = []
        for candidate in rank_by_hiring_influence(discovery.output.people):
            normalized = normalize_person(
                candidate, company_id=company_id, company_name=company_name
            )
            if normalized is not None and normalized["profile_url"] not in seen_profiles:
                discovered_people.append(normalized)
                seen_profiles.add(normalized["profile_url"])
        if on_company_complete is not None:
            await on_company_complete(discovered_people, False)
        return discovered_people

    discovered_by_company = await asyncio.gather(
        *(discover_for_company(company) for company in companies)
    )
    for discovered_people in discovered_by_company:
        people.extend(discovered_people)
    return people


def normalize_person(
    person: ProviderPerson, *, company_id: str, company_name: str
) -> dict[str, Any] | None:
    profile_url = normalize_website_url(person.profile_url)
    evidence_url = normalize_website_url(person.evidence_url)
    if profile_url is None or evidence_url is None:
        return None

    return {
        "id": str(uuid5(PEOPLE_NAMESPACE, profile_url)),
        "company_id": company_id,
        "company_name": company_name,
        "name": person.name,
        "title": person.title,
        "matched_job_title": person.matched_job_title,
        "profile_url": profile_url,
        "evidence_url": evidence_url,
        "evidence_summary": person.evidence_summary,
    }
