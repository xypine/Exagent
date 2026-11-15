from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, Literal
from uuid import UUID, uuid5

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.models import CompanySearchCache, CompanySize, PeopleSearchCache, SearchJob
from app.db.session import SessionLocal
from app.services.exa_provider import (
    ExaProvider,
    ProviderDocument,
    ProviderSearchOutput,
    ProviderSearchResponse,
    normalize_domain,
    normalize_website_url,
)
from app.services.people_search import discover_key_people

JOB_QUEUED = "queued"
JOB_FINDING_COMPANIES = "finding_companies"
JOB_FINDING_PEOPLE = "finding_people"
JOB_DONE = "done"
JOB_FAILED = "failed"
JOB_TERMINAL_STATUSES = (JOB_DONE, JOB_FAILED)
COMPANY_NAMESPACE = UUID("2fb99d3a-73b9-4b46-89f0-85d6a450850d")
COMPANY_SIZE_QUERY: dict[CompanySize, str] = {
    "small": "companies with fewer than 25 employees",
    "medium": "companies with 25–150 employees",
    "large": "companies with 150 or more employees",
}
COMPANY_INDUSTRY_QUERY: dict[str, str] = {
    # "Recruiters" is the UI label for a role preset, not a natural company-sector
    # phrase. Keep the label for people discovery while using terms that identify
    # the kinds of companies a recruiter is likely to work for.
    "recruiters": "recruitment agencies, executive-search firms, and staffing companies",
}


@dataclass(frozen=True)
class SearchRecovery:
    """One interrupted refresh that should be resumed after application startup."""

    job_id: UUID
    phase: Literal["companies", "people"]


def normalize_criteria(value: str) -> str:
    return " ".join(value.casefold().split())


def cache_key_for(area: str, industry: str, company_size: CompanySize) -> str:
    criteria = (
        f"{normalize_criteria(area)}\n{normalize_criteria(industry)}\n"
        f"{company_size}\n{COMPANY_SIZE_QUERY[company_size]}"
    )
    return hashlib.sha256(criteria.encode()).hexdigest()


def company_query(area: str, industry: str, company_size: CompanySize | None = None) -> str:
    industry_query = COMPANY_INDUSTRY_QUERY.get(normalize_criteria(industry))
    company_subject = industry_query or f"{industry} companies"
    query = (
        f"Official websites of {company_subject} with a headquarters, office, or other "
        f"substantial business operations in {area}."
    )
    if company_size is not None:
        query += f" Only include {COMPANY_SIZE_QUERY[company_size]}."
    return query + (
        f" Exclude companies whose only connection to {area} is selling products or services "
        "to customers there."
    )


def company_size_attempts(company_size: CompanySize | None) -> tuple[CompanySize | None, ...]:
    """Return the selected size followed by progressively broader fallback sizes."""
    if company_size is None:
        return (None,)
    sizes: tuple[CompanySize, ...] = ("small", "medium", "large")
    selected_index = sizes.index(company_size)
    return tuple(reversed(sizes[: selected_index + 1]))


def next_company_result_limit(
    current_company_count: int, *, initial_results: int, max_results: int
) -> int:
    """Return the expanded Exa result cap for one user-requested company batch."""
    initial_batch = min(initial_results, max_results)
    return min(max_results, max(initial_batch, current_company_count) + initial_batch)


def merge_companies(
    existing: list[dict[str, Any]], discovered: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Append newly discovered companies without changing the established result order."""
    merged = list(existing)
    seen_ids = {
        company_id
        for company in existing
        if isinstance(company_id := company.get("id"), str) and company_id
    }
    for company in discovered:
        company_id = company.get("id")
        if not isinstance(company_id, str) or not company_id or company_id in seen_ids:
            continue
        merged.append(company)
        seen_ids.add(company_id)
    return merged


async def discover_companies_with_fallback(
    provider: ExaProvider,
    *,
    area: str,
    industry: str,
    company_size: CompanySize | None,
    max_results: int,
) -> list[dict[str, Any]]:
    """Try smaller company categories only when a search yields no usable companies."""
    for attempted_size in company_size_attempts(company_size):
        query = company_query(area, industry, attempted_size)
        if company_size == "large" and attempted_size == "medium":
            query += (
                " Within the 25–150 employee results, prioritize firms closest to the "
                "150-employee threshold over smaller firms. Treat employee count as a ranking "
                "signal, not a hard requirement, and include otherwise relevant firms whose "
                "headcount is unpublished."
            )
        response = await provider.discover_companies(query, num_results=max_results)
        companies = normalize_companies(response, max_results=max_results)
        if companies:
            return companies
    return []


class CompanySearchService:
    def __init__(self, session: Session, settings: Settings | None = None) -> None:
        self._session = session
        self._settings = settings or get_settings()

    @property
    def settings(self) -> Settings:
        return self._settings

    def create_job(
        self, *, client_id: UUID, area: str, industry: str, company_size: CompanySize
    ) -> tuple[SearchJob, bool]:
        """Create a job and automatically start its first key-people batch."""
        now = datetime.now(UTC)
        key = cache_key_for(area, industry, company_size)
        cache = self._session.get(CompanySearchCache, key)
        if cache is not None and cache.expires_at is not None and cache.expires_at > now:
            job = self._new_job(
                client_id, area, industry, company_size, key, status=JOB_FINDING_PEOPLE
            )
            job.companies = cache.companies
            people_cache = self._session.get(PeopleSearchCache, key)
            if self._people_cache_is_fresh(people_cache, now, len(cache.companies)):
                assert people_cache is not None
                self._apply_people_cache(job, people_cache, status=JOB_DONE, completed_at=now)
                should_start_refresh = False
            else:
                should_start_refresh = self._claim_people_refresh(
                    job, people_cache, cache.expires_at
                )
            self._session.add(job)
            self._session.commit()
            self._session.refresh(job)
            return job, should_start_refresh

        # Cache misses are serialized in PostgreSQL. It prevents an expired key
        # from launching multiple identical provider searches concurrently.
        self._session.execute(select(func.pg_advisory_xact_lock(func.hashtext(key))))
        cache = self._session.get(CompanySearchCache, key)
        if cache is not None and cache.expires_at is not None and cache.expires_at > now:
            job = self._new_job(
                client_id, area, industry, company_size, key, status=JOB_FINDING_PEOPLE
            )
            job.companies = cache.companies
            people_cache = self._session.get(PeopleSearchCache, key)
            if self._people_cache_is_fresh(people_cache, now, len(cache.companies)):
                assert people_cache is not None
                self._apply_people_cache(job, people_cache, status=JOB_DONE, completed_at=now)
                should_start_refresh = False
            else:
                should_start_refresh = self._claim_people_refresh(
                    job, people_cache, cache.expires_at
                )
            self._session.add(job)
            self._session.commit()
            self._session.refresh(job)
            return job, should_start_refresh

        job = self._new_job(client_id, area, industry, company_size, key, status=JOB_QUEUED)
        self._session.add(job)
        self._session.flush()
        if cache is None:
            cache = CompanySearchCache(cache_key=key, refreshing_job_id=job.id)
            self._session.add(cache)
            should_start_refresh = True
        else:
            should_start_refresh = cache.refreshing_job_id is None
            if should_start_refresh:
                cache.refreshing_job_id = job.id
        self._session.commit()
        self._session.refresh(job)
        return job, should_start_refresh

    def recover_interrupted_searches(self) -> list[SearchRecovery]:
        """Reclaim incomplete in-process work after a restart.

        FastAPI background tasks do not survive a reload or process restart.  The
        cache's ``refreshing_job_id`` is a lease rather than durable execution,
        so select one nonterminal job per cache key and requeue it here.
        """
        jobs = list(
            self._session.scalars(
                select(SearchJob)
                .where(
                    SearchJob.status.in_((JOB_QUEUED, JOB_FINDING_COMPANIES, JOB_FINDING_PEOPLE))
                )
                .order_by(SearchJob.created_at, SearchJob.id)
            )
        )
        selected: dict[str, SearchRecovery] = {}
        for job in jobs:
            phase: Literal["companies", "people"] = (
                "people" if job.status == JOB_FINDING_PEOPLE else "companies"
            )
            current = selected.get(job.cache_key)
            # Resuming people work preserves completed company discovery and is
            # therefore preferred if a cache has jobs in both phases.
            if current is None or phase == "people":
                selected[job.cache_key] = SearchRecovery(job.id, phase)

        recoveries = list(selected.values())
        for recovery in recoveries:
            recovery_job = self._session.get(SearchJob, recovery.job_id)
            if recovery_job is None:
                continue
            if recovery.phase == "companies":
                company_cache = self._session.get(CompanySearchCache, recovery_job.cache_key)
                if company_cache is None:
                    company_cache = CompanySearchCache(cache_key=recovery_job.cache_key)
                    self._session.add(company_cache)
                company_cache.refreshing_job_id = recovery_job.id
                # refresh() starts the company phase only from queued.
                recovery_job.status = JOB_QUEUED
            else:
                company_cache = self._session.get(CompanySearchCache, recovery_job.cache_key)
                people_cache = self._session.get(PeopleSearchCache, recovery_job.cache_key)
                if people_cache is None:
                    people_cache = PeopleSearchCache(
                        cache_key=recovery_job.cache_key,
                        expires_at=company_cache.expires_at if company_cache is not None else None,
                    )
                    self._session.add(people_cache)
                people_cache.refreshing_job_id = recovery_job.id
                recovery_job.status = JOB_FINDING_PEOPLE
            recovery_job.completed_at = None

        if recoveries:
            self._session.commit()
        return recoveries

    def _new_job(
        self,
        client_id: UUID,
        area: str,
        industry: str,
        company_size: CompanySize,
        cache_key: str,
        *,
        status: str,
    ) -> SearchJob:
        return SearchJob(
            client_id=client_id,
            cache_key=cache_key,
            area=area,
            industry=industry,
            company_size=company_size,
            status=status,
            companies=[],
        )

    async def refresh(self, job_id: UUID) -> None:
        job = self._session.get(SearchJob, job_id)
        if job is None:
            return
        if job.status == JOB_FINDING_PEOPLE:
            await self._refresh_people(job)
            return
        if job.status != JOB_QUEUED:
            return

        self._set_jobs_status(job.cache_key, JOB_FINDING_COMPANIES)
        self._session.commit()

        try:
            provider = ExaProvider(self._settings)
            try:
                companies = await discover_companies_with_fallback(
                    provider,
                    area=job.area,
                    industry=job.industry,
                    company_size=job.company_size,
                    max_results=self._settings.company_search_initial_results,
                )
            finally:
                await provider.close()
        except Exception:
            self._mark_failed(job.cache_key)
            self._session.commit()
            return

        now = datetime.now(UTC)
        cache = self._session.get(CompanySearchCache, job.cache_key)
        if cache is None:
            self._mark_failed(job.cache_key)
            self._session.commit()
            return

        cache.companies = companies
        cache.fetched_at = now
        cache.expires_at = now + timedelta(seconds=self._settings.company_search_cache_ttl_seconds)
        cache.refreshing_job_id = None
        for waiting_job in self._jobs_for_cache(job.cache_key):
            if waiting_job.status not in JOB_TERMINAL_STATUSES:
                waiting_job.companies = companies
                waiting_job.people = []
                waiting_job.people_error = None
                waiting_job.people_companies_searched = 0
                waiting_job.people_request_count = 0
                waiting_job.people_requests_completed = 0
                waiting_job.people_requests_failed = 0
                waiting_job.status = JOB_FINDING_PEOPLE
                waiting_job.error = None
                waiting_job.completed_at = None
        people_cache = self._session.get(PeopleSearchCache, job.cache_key)
        if people_cache is None:
            people_cache = PeopleSearchCache(
                cache_key=job.cache_key,
                refreshing_job_id=job.id,
                expires_at=cache.expires_at,
            )
            self._session.add(people_cache)
        else:
            people_cache.people = []
            people_cache.people_error = None
            people_cache.companies_searched = 0
            people_cache.request_count = 0
            people_cache.requests_completed = 0
            people_cache.requests_failed = 0
            people_cache.expires_at = cache.expires_at
            people_cache.refreshing_job_id = job.id
        self._session.commit()
        await self._refresh_people(job)

    def search_more_companies(self, job: SearchJob) -> bool:
        """Queue one explicit, expanded company search for a completed job."""
        if (
            job.status != JOB_DONE
            or len(job.companies) >= self._settings.company_search_max_results
        ):
            return False
        cache = self._session.get(CompanySearchCache, job.cache_key)
        if cache is None or cache.refreshing_job_id is not None:
            return False

        cache.refreshing_job_id = job.id
        job.status = JOB_FINDING_COMPANIES
        job.error = None
        job.completed_at = None
        self._session.commit()
        self._session.refresh(job)
        return True

    async def refresh_more_companies(self, job_id: UUID) -> None:
        """Merge one user-requested expanded search without starting people research."""
        job = self._session.get(SearchJob, job_id)
        if job is None or job.status != JOB_FINDING_COMPANIES:
            return
        cache = self._session.get(CompanySearchCache, job.cache_key)
        if cache is None or cache.refreshing_job_id != job.id:
            return

        result_limit = next_company_result_limit(
            len(cache.companies),
            initial_results=self._settings.company_search_initial_results,
            max_results=self._settings.company_search_max_results,
        )
        try:
            provider = ExaProvider(self._settings)
            try:
                discovered = await discover_companies_with_fallback(
                    provider,
                    area=job.area,
                    industry=job.industry,
                    company_size=job.company_size,
                    max_results=result_limit,
                )
            finally:
                await provider.close()
        except Exception:
            cache.refreshing_job_id = None
            job.status = JOB_DONE
            job.error = "More companies could not be loaded. Please try again."
            job.completed_at = datetime.now(UTC)
            self._session.commit()
            return

        now = datetime.now(UTC)
        companies = merge_companies(cache.companies, discovered)
        cache.companies = companies
        cache.fetched_at = now
        cache.expires_at = now + timedelta(seconds=self._settings.company_search_cache_ttl_seconds)
        cache.refreshing_job_id = None
        job.companies = companies
        job.status = JOB_DONE
        job.error = None
        job.completed_at = now
        self._session.commit()

    def search_more_people(self, job: SearchJob) -> bool:
        """Queue the next capped key-people batch and return whether to start it."""
        if job.status != JOB_DONE:
            return False
        cache = self._session.get(PeopleSearchCache, job.cache_key)
        if cache is None or cache.companies_searched >= len(job.companies):
            return False

        job.status = JOB_FINDING_PEOPLE
        job.completed_at = None
        should_start_refresh = cache.refreshing_job_id is None
        if should_start_refresh:
            cache.refreshing_job_id = job.id
        self._session.commit()
        self._session.refresh(job)
        return should_start_refresh

    def _people_cache_is_fresh(
        self, cache: PeopleSearchCache | None, now: datetime, company_count: int
    ) -> bool:
        return (
            cache is not None
            and cache.expires_at is not None
            and cache.expires_at > now
            and cache.companies_searched
            >= min(company_count, self._settings.people_search_batch_size)
        )

    def _claim_people_refresh(
        self,
        job: SearchJob,
        cache: PeopleSearchCache | None,
        expires_at: datetime | None,
    ) -> bool:
        if cache is None:
            self._session.add(
                PeopleSearchCache(
                    cache_key=job.cache_key,
                    expires_at=expires_at,
                    refreshing_job_id=job.id,
                )
            )
            return True
        if cache.refreshing_job_id is None:
            cache.expires_at = expires_at
            cache.refreshing_job_id = job.id
            return True
        return False

    async def _refresh_people(self, job: SearchJob) -> None:
        cache = self._session.get(PeopleSearchCache, job.cache_key)
        if cache is None or cache.refreshing_job_id != job.id:
            return

        companies = job.companies[
            cache.companies_searched : cache.companies_searched
            + self._settings.people_search_batch_size
        ]
        if not companies:
            self._complete_people(job.cache_key, cache)
            self._session.commit()
            return

        request_starts_before = cache.request_count
        requests_completed_before = cache.requests_completed
        requests_failed_before = cache.requests_failed

        def persist_request_progress(metrics: Any) -> None:
            cache.request_count = request_starts_before + metrics.request_starts
            cache.requests_completed = requests_completed_before + metrics.requests_completed
            cache.requests_failed = requests_failed_before + metrics.requests_failed
            self._sync_people_progress(job.cache_key, cache)
            self._session.commit()

        provider = ExaProvider(self._settings, on_request_progress=persist_request_progress)
        failed_companies = 0

        async def persist_company_progress(people: list[dict[str, Any]], failed: bool) -> None:
            nonlocal failed_companies
            cache.people = [*cache.people, *people]
            cache.companies_searched += 1
            if failed:
                failed_companies += 1
            self._sync_people_progress(job.cache_key, cache)
            self._session.commit()

        try:
            await discover_key_people(
                provider,
                companies=companies,
                industry=job.industry,
                concurrency=min(
                    self._settings.people_search_concurrency,
                    self._settings.exa_max_concurrency,
                ),
                on_company_complete=persist_company_progress,
            )
        except Exception:
            self._complete_people(
                job.cache_key,
                cache,
                error="The key people search failed. You can try searching more again.",
            )
        else:
            error = None
            if failed_companies == len(companies):
                error = "The key people search failed. You can try searching more again."
            self._complete_people(job.cache_key, cache, error=error)
        finally:
            await provider.close()
        self._session.commit()

    def _complete_people(
        self, cache_key: str, cache: PeopleSearchCache, *, error: str | None = None
    ) -> None:
        now = datetime.now(UTC)
        cache.people_error = error
        cache.refreshing_job_id = None
        for waiting_job in self._jobs_for_cache(cache_key):
            if waiting_job.status == JOB_FINDING_PEOPLE:
                self._apply_people_cache(waiting_job, cache, status=JOB_DONE, completed_at=now)

    def _sync_people_progress(self, cache_key: str, cache: PeopleSearchCache) -> None:
        for waiting_job in self._jobs_for_cache(cache_key):
            if waiting_job.status == JOB_FINDING_PEOPLE:
                self._apply_people_cache(
                    waiting_job,
                    cache,
                    status=JOB_FINDING_PEOPLE,
                    completed_at=None,
                )

    @staticmethod
    def _apply_people_cache(
        job: SearchJob,
        cache: PeopleSearchCache,
        *,
        status: str,
        completed_at: datetime | None,
    ) -> None:
        job.people = cache.people
        job.people_error = cache.people_error
        job.people_companies_searched = cache.companies_searched
        job.people_request_count = cache.request_count
        job.people_requests_completed = cache.requests_completed
        job.people_requests_failed = cache.requests_failed
        job.status = status
        job.completed_at = completed_at

    def _set_jobs_status(self, cache_key: str, status: str) -> None:
        for job in self._jobs_for_cache(cache_key):
            if job.status == JOB_QUEUED:
                job.status = status

    def _mark_failed(self, cache_key: str) -> None:
        for job in self._jobs_for_cache(cache_key):
            if job.status not in JOB_TERMINAL_STATUSES:
                job.status = JOB_FAILED
                job.error = "The company search failed. Please try again."
                job.completed_at = datetime.now(UTC)
        cache = self._session.get(CompanySearchCache, cache_key)
        if cache is not None:
            cache.refreshing_job_id = None

    def _jobs_for_cache(self, cache_key: str) -> list[SearchJob]:
        return list(
            self._session.scalars(
                select(SearchJob).where(
                    SearchJob.cache_key == cache_key,
                    SearchJob.status.not_in(JOB_TERMINAL_STATUSES),
                )
            )
        )


async def refresh_company_search(job_id: UUID) -> None:
    """Background-task entry point; it owns its database session."""
    with SessionLocal() as session:
        await CompanySearchService(session).refresh(job_id)


def recover_interrupted_searches() -> list[SearchRecovery]:
    """Persist recovery leases and return work to resume after startup."""
    with SessionLocal() as session:
        return CompanySearchService(session).recover_interrupted_searches()


async def refresh_more_companies(job_id: UUID) -> None:
    """Background-task entry point for an explicit expanded company search."""
    with SessionLocal() as session:
        await CompanySearchService(session).refresh_more_companies(job_id)


def normalize_companies(
    response: ProviderSearchResponse[ProviderSearchOutput], *, max_results: int
) -> list[dict[str, Any]]:
    documents_by_domain: dict[str, list[ProviderDocument]] = {}
    for document in response.results:
        domain = normalize_domain(document.url)
        if domain is not None:
            documents_by_domain.setdefault(domain, []).append(document)

    companies: list[dict[str, Any]] = []
    seen_domains: set[str] = set()
    retrieved_at = datetime.now(UTC).isoformat()
    for company in response.output.companies:
        domain = normalize_domain(company.website_url)
        website_url = normalize_website_url(company.website_url)
        if domain is None or website_url is None or domain in seen_domains:
            continue
        documents = documents_by_domain.get(domain, [])
        if not documents:
            # Do not show a structured provider claim without source material.
            continue
        sources = []
        for document in documents:
            source_url = normalize_website_url(document.url)
            if source_url is not None:
                sources.append(
                    {
                        "provider": "exa",
                        "url": source_url,
                        "title": document.title,
                        "retrieved_at": retrieved_at,
                    }
                )
        if not sources:
            continue
        seen_domains.add(domain)
        companies.append(
            {
                "id": str(uuid5(COMPANY_NAMESPACE, domain)),
                "name": company.name,
                "url": website_url,
                "summary": company.summary,
                "sources": sources,
            }
        )
        if len(companies) == max_results:
            break
    return companies
