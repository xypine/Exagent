from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID, uuid4

from sqlalchemy import JSON, CheckConstraint, DateTime, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

CompanySize = Literal["startup", "sme", "large"]


class SearchJob(Base):
    __tablename__ = "search_jobs"
    __table_args__ = (
        CheckConstraint(
            "status IN ('queued', 'finding_companies', 'done', 'failed')",
            name="ck_search_jobs_status",
        ),
        CheckConstraint(
            "company_size IN ('startup', 'sme', 'large')",
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
