from __future__ import annotations

import hashlib
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID, uuid5

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.models import CompanySearchCache, CompanySize, SearchJob
from app.db.session import SessionLocal
from app.services.exa_provider import (
    ExaProvider,
    ProviderDocument,
    ProviderSearchOutput,
    ProviderSearchResponse,
    normalize_domain,
    normalize_website_url,
)

JOB_QUEUED = "queued"
JOB_FINDING_COMPANIES = "finding_companies"
JOB_DONE = "done"
JOB_FAILED = "failed"
JOB_TERMINAL_STATUSES = (JOB_DONE, JOB_FAILED)
COMPANY_NAMESPACE = UUID("2fb99d3a-73b9-4b46-89f0-85d6a450850d")
COMPANY_SIZE_QUERY: dict[CompanySize, str] = {
    "startup": "early-stage startup companies (typically under 50 employees)",
    "sme": "small and medium-sized enterprises (SMEs, typically 10–249 employees)",
    "large": "large companies and enterprises (250 or more employees)",
}


def normalize_criteria(value: str) -> str:
    return " ".join(value.casefold().split())


def cache_key_for(area: str, industry: str, company_size: CompanySize) -> str:
    criteria = f"{normalize_criteria(area)}\n{normalize_criteria(industry)}\n{company_size}"
    return hashlib.sha256(criteria.encode()).hexdigest()


def company_query(area: str, industry: str, company_size: CompanySize | None = None) -> str:
    query = (
        f"Official websites of {industry} companies with a headquarters, office, or other "
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
    sizes: tuple[CompanySize, ...] = ("startup", "sme", "large")
    selected_index = sizes.index(company_size)
    return tuple(reversed(sizes[: selected_index + 1]))


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
        if company_size == "large" and attempted_size == "sme":
            query += (
                " Within the SME results, prioritize firms closest to the 250-employee "
                "large-company threshold over smaller SMEs. Treat employee count as a ranking "
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

    def create_job(
        self, *, client_id: UUID, area: str, industry: str, company_size: CompanySize
    ) -> tuple[SearchJob, bool]:
        """Create a job and return whether this request must start a refresh."""
        now = datetime.now(UTC)
        key = cache_key_for(area, industry, company_size)
        cache = self._session.get(CompanySearchCache, key)
        if cache is not None and cache.expires_at is not None and cache.expires_at > now:
            job = self._new_job(client_id, area, industry, company_size, key, status=JOB_DONE)
            job.companies = cache.companies
            job.completed_at = now
            self._session.add(job)
            self._session.commit()
            self._session.refresh(job)
            return job, False

        # Cache misses are serialized in PostgreSQL. It prevents an expired key
        # from launching multiple identical provider searches concurrently.
        self._session.execute(select(func.pg_advisory_xact_lock(func.hashtext(key))))
        cache = self._session.get(CompanySearchCache, key)
        if cache is not None and cache.expires_at is not None and cache.expires_at > now:
            job = self._new_job(client_id, area, industry, company_size, key, status=JOB_DONE)
            job.companies = cache.companies
            job.completed_at = now
            self._session.add(job)
            self._session.commit()
            self._session.refresh(job)
            return job, False

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
        if job is None or job.status != JOB_QUEUED:
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
                    max_results=self._settings.company_search_max_results,
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
                waiting_job.status = JOB_DONE
                waiting_job.error = None
                waiting_job.completed_at = now
        self._session.commit()

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
