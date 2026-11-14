from __future__ import annotations

import re
from datetime import datetime
from typing import Annotated, Literal, cast
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.client_identity import ClientContext, enforce_rate_limit
from app.db.models import CompanySize, SearchJob
from app.db.session import get_db_session
from app.services.company_search import CompanySearchService, refresh_company_search

router = APIRouter()
ClientDependency = Annotated[ClientContext, Depends(enforce_rate_limit)]
DbDependency = Annotated[Session, Depends(get_db_session)]
Criteria = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)]
JobStatus = Literal["queued", "finding_companies", "done", "failed"]
_NUMERIC_CITATION = re.compile(r"\s*\[\d{1,3}(?:\s*(?:,|[-–—])\s*\d{1,3})*\]")


def _strip_numeric_citations(value: str) -> str:
    return _NUMERIC_CITATION.sub("", value).strip()


CleanSummary = Annotated[str, AfterValidator(_strip_numeric_citations)]


class SearchRequest(BaseModel):
    area: Criteria
    industry: Criteria
    company_size: CompanySize = Field(
        description="Headcount range used to filter Exa results.",
        examples=["small"],
    )


class SourceResponse(BaseModel):
    provider: Literal["exa"]
    url: str
    title: str | None = None
    retrieved_at: datetime


class CompanyResponse(BaseModel):
    id: str
    name: str
    url: str
    summary: CleanSummary
    sources: list[SourceResponse]


class SearchCreatedResponse(BaseModel):
    job_id: UUID
    status: JobStatus


class SearchResponse(SearchCreatedResponse):
    model_config = ConfigDict(from_attributes=True)

    error: str | None = None
    companies: list[CompanyResponse] = Field(default_factory=list)


@router.post(
    "/searches", response_model=SearchCreatedResponse, status_code=status.HTTP_202_ACCEPTED
)
async def create_search(
    request: SearchRequest,
    background_tasks: BackgroundTasks,
    context: ClientDependency,
    db: DbDependency,
) -> SearchCreatedResponse:
    job, should_start_refresh = CompanySearchService(db).create_job(
        client_id=context.client_id,
        area=request.area,
        industry=request.industry,
        company_size=request.company_size,
    )
    if should_start_refresh:
        background_tasks.add_task(refresh_company_search, job.id)
    return SearchCreatedResponse(job_id=job.id, status=cast(JobStatus, job.status))


@router.get("/searches/{job_id}", response_model=SearchResponse)
async def get_search(job_id: UUID, context: ClientDependency, db: DbDependency) -> SearchResponse:
    job = db.scalar(
        select(SearchJob).where(SearchJob.id == job_id, SearchJob.client_id == context.client_id)
    )
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Search job not found.")
    return SearchResponse.model_validate(
        {
            "job_id": job.id,
            "status": job.status,
            "error": job.error,
            "companies": job.companies,
        }
    )
