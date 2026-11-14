from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID, uuid4

from sqlalchemy import JSON, CheckConstraint, DateTime, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

CompanySize = Literal["small", "medium", "large"]


class SearchJob(Base):
    __tablename__ = "search_jobs"
    __table_args__ = (
        CheckConstraint(
            "status IN ('queued', 'finding_companies', 'finding_people', 'done', 'failed')",
            name="ck_search_jobs_status",
        ),
        CheckConstraint(
            "company_size IN ('small', 'medium', 'large')",
            name="ck_search_jobs_company_size",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    client_id: Mapped[UUID] = mapped_column(Uuid, index=True)
    cache_key: Mapped[str] = mapped_column(String(64), index=True)
    area: Mapped[str] = mapped_column(String(120))
    industry: Mapped[str] = mapped_column(String(120))
    # Nullable only for jobs created before company-size filtering was introduced.
    company_size: Mapped[CompanySize | None] = mapped_column(String(32), nullable=True)
    status: Mapped[str] = mapped_column(String(32), index=True)
    companies: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    people: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    people_error: Mapped[str | None] = mapped_column(String(500), nullable=True)
    people_companies_searched: Mapped[int] = mapped_column(default=0)
    people_request_count: Mapped[int] = mapped_column(default=0)
    people_requests_completed: Mapped[int] = mapped_column(default=0)
    people_requests_failed: Mapped[int] = mapped_column(default=0)
    error: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class CompanySearchCache(Base):
    __tablename__ = "company_search_cache"

    cache_key: Mapped[str] = mapped_column(String(64), primary_key=True)
    companies: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    fetched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    refreshing_job_id: Mapped[UUID | None] = mapped_column(Uuid, nullable=True)


class PeopleSearchCache(Base):
    __tablename__ = "people_search_cache"

    cache_key: Mapped[str] = mapped_column(String(64), primary_key=True)
    people: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    people_error: Mapped[str | None] = mapped_column(String(500), nullable=True)
    companies_searched: Mapped[int] = mapped_column(default=0)
    request_count: Mapped[int] = mapped_column(default=0)
    requests_completed: Mapped[int] = mapped_column(default=0)
    requests_failed: Mapped[int] = mapped_column(default=0)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    refreshing_job_id: Mapped[UUID | None] = mapped_column(Uuid, nullable=True)


class PersonResearchCache(Base):
    """Cached, source-backed public background for one discovered person."""

    __tablename__ = "person_research_cache"
    __table_args__ = (
        CheckConstraint(
            "status IN ('queued', 'researching', 'done', 'failed')",
            name="ck_person_research_cache_status",
        ),
    )

    # The discovery ID is UUIDv5(profile_url), so it is stable across searches
    # and lets cached research be reused without exposing it outside an owned job.
    person_id: Mapped[UUID] = mapped_column(Uuid, primary_key=True)
    person_name: Mapped[str] = mapped_column(String(256))
    company_name: Mapped[str] = mapped_column(String(256))
    profile_url: Mapped[str] = mapped_column(String(2048))
    status: Mapped[str] = mapped_column(String(32), default="queued")
    work_history: Mapped[list[dict[str, str]]] = mapped_column(JSON, default=list)
    education: Mapped[list[dict[str, str | None]]] = mapped_column(JSON, default=list)
    volunteer_experience: Mapped[list[dict[str, str | None]]] = mapped_column(JSON, default=list)
    error: Mapped[str | None] = mapped_column(String(500), nullable=True)
    fetched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class MatchRun(Base):
    """One non-reusable, profile-specific matching run for an owned search."""

    __tablename__ = "match_runs"
    __table_args__ = (
        CheckConstraint(
            "status IN ('queued', 'researching', 'matching', 'done', 'failed')",
            name="ck_match_runs_status",
        ),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    job_id: Mapped[UUID] = mapped_column(Uuid, index=True)
    client_id: Mapped[UUID] = mapped_column(Uuid, index=True)
    # This is a task payload, not a cache key. It is cleared at completion.
    profile: Mapped[str | None] = mapped_column(String(4000), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="queued")
    candidate_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    results: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    completed_count: Mapped[int] = mapped_column(default=0)
    error: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
