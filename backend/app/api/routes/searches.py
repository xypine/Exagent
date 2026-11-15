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
from app.db.models import CompanySize, MatchRun, PersonResearchCache, SearchJob
from app.db.session import get_db_session
from app.services.company_search import CompanySearchService, refresh_company_search
from app.services.match_runs import create_match_run, refresh_match_run
from app.services.matching import ScoredMatch
from app.services.people_ranking import decision_power_score
from app.services.person_research import (
    PersonResearchSubject,
    ResearchStatus,
    queue_person_research,
    refresh_person_research,
)

router = APIRouter()
ClientDependency = Annotated[ClientContext, Depends(enforce_rate_limit)]
DbDependency = Annotated[Session, Depends(get_db_session)]
Criteria = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)]
JobStatus = Literal["queued", "finding_companies", "finding_people", "done", "failed"]
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


class PersonResponse(BaseModel):
    id: str
    company_id: str
    company_name: str
    name: str
    title: str
    matched_job_title: str
    profile_url: str
    evidence_url: str
    evidence_summary: str
    decision_power_score: int


class WorkHistoryResponse(BaseModel):
    company_name: str
    role: str
    source_url: str


class EducationResponse(BaseModel):
    school: str
    major: str | None
    source_url: str


class VolunteerExperienceResponse(BaseModel):
    organization: str
    role: str | None
    source_url: str


class PersonResearchResponse(BaseModel):
    person_id: UUID
    status: ResearchStatus
    work_history: list[WorkHistoryResponse] = Field(default_factory=list)
    education: list[EducationResponse] = Field(default_factory=list)
    volunteer_experience: list[VolunteerExperienceResponse] = Field(default_factory=list)
    error: str | None = None
    fetched_at: datetime | None = None


Profile = Annotated[str, StringConstraints(strip_whitespace=True, max_length=4000)]


class StartMatchRunRequest(BaseModel):
    profile: Profile = ""


class MatchRunResponse(BaseModel):
    id: UUID
    status: Literal["queued", "researching", "matching", "done", "failed"]
    candidate_count: int
    completed_count: int
    results: list[ScoredMatch] = Field(default_factory=list)
    error: str | None = None
    completed_at: datetime | None = None


class PeopleSearchStatsResponse(BaseModel):
    companies_searched: int
    companies_available: int
    request_count: int
    requests_completed: int
    requests_failed: int
    requests_in_flight: int
    batch_size: int


class SearchCreatedResponse(BaseModel):
    job_id: UUID
    status: JobStatus


class SearchResponse(SearchCreatedResponse):
    model_config = ConfigDict(from_attributes=True)

    area: str
    industry: str
    company_size: CompanySize | None
    error: str | None = None
    companies: list[CompanyResponse] = Field(default_factory=list)
    people: list[PersonResponse] = Field(default_factory=list)
    people_error: str | None = None
    people_search_stats: PeopleSearchStatsResponse


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
    return _search_response(job, CompanySearchService(db).settings.people_search_batch_size)


@router.post(
    "/searches/{job_id}/people",
    response_model=SearchResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def search_more_people(
    job_id: UUID,
    background_tasks: BackgroundTasks,
    context: ClientDependency,
    db: DbDependency,
) -> SearchResponse:
    job = db.scalar(
        select(SearchJob).where(SearchJob.id == job_id, SearchJob.client_id == context.client_id)
    )
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Search job not found.")
    service = CompanySearchService(db)
    if service.search_more_people(job):
        background_tasks.add_task(refresh_company_search, job.id)
    return _search_response(job, service.settings.people_search_batch_size)


@router.get("/searches/{job_id}/people/{person_id}/research", response_model=PersonResearchResponse)
async def get_person_research(
    job_id: UUID, person_id: UUID, context: ClientDependency, db: DbDependency
) -> PersonResearchResponse:
    _authorized_person(db, job_id=job_id, client_id=context.client_id, person_id=person_id)
    return _person_research_response(person_id, db.get(PersonResearchCache, person_id))


@router.post(
    "/searches/{job_id}/people/{person_id}/research",
    response_model=PersonResearchResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def start_person_research(
    job_id: UUID,
    person_id: UUID,
    background_tasks: BackgroundTasks,
    context: ClientDependency,
    db: DbDependency,
) -> PersonResearchResponse:
    person = _authorized_person(db, job_id=job_id, client_id=context.client_id, person_id=person_id)
    cache, should_start = queue_person_research(
        db,
        PersonResearchSubject(
            person_id=person_id,
            name=person.name,
            company_name=person.company_name,
            profile_url=person.profile_url,
        ),
    )
    if should_start:
        background_tasks.add_task(refresh_person_research, person_id)
    return _person_research_response(person_id, cache)


@router.post(
    "/searches/{job_id}/matches",
    response_model=MatchRunResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def start_match_run(
    job_id: UUID,
    request: StartMatchRunRequest,
    background_tasks: BackgroundTasks,
    context: ClientDependency,
    db: DbDependency,
) -> MatchRunResponse:
    job = db.scalar(
        select(SearchJob).where(SearchJob.id == job_id, SearchJob.client_id == context.client_id)
    )
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Search job not found.")
    run, should_start = create_match_run(
        db, job=job, client_id=context.client_id, profile=request.profile
    )
    if should_start:
        background_tasks.add_task(refresh_match_run, run.id)
    return _match_run_response(run)


@router.get("/searches/{job_id}/matches/{run_id}", response_model=MatchRunResponse)
async def get_match_run(
    job_id: UUID, run_id: UUID, context: ClientDependency, db: DbDependency
) -> MatchRunResponse:
    run = db.scalar(
        select(MatchRun).where(
            MatchRun.id == run_id,
            MatchRun.job_id == job_id,
            MatchRun.client_id == context.client_id,
        )
    )
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match run not found.")
    return _match_run_response(run)


def _search_response(job: SearchJob, batch_size: int) -> SearchResponse:
    return SearchResponse.model_validate(
        {
            "job_id": job.id,
            "status": job.status,
            "area": job.area,
            "industry": job.industry,
            "company_size": job.company_size,
            "error": job.error,
            "companies": job.companies,
            "people": [
                {
                    **person,
                    "decision_power_score": decision_power_score(person["title"]),
                }
                for person in job.people
            ],
            "people_error": job.people_error,
            "people_search_stats": {
                "companies_searched": job.people_companies_searched,
                "companies_available": len(job.companies),
                "request_count": job.people_request_count,
                "requests_completed": job.people_requests_completed,
                "requests_failed": job.people_requests_failed,
                "requests_in_flight": max(
                    0, job.people_request_count - job.people_requests_completed
                ),
                "batch_size": batch_size,
            },
        }
    )


def _authorized_person(
    db: Session, *, job_id: UUID, client_id: UUID, person_id: UUID
) -> PersonResponse:
    job = db.scalar(
        select(SearchJob).where(SearchJob.id == job_id, SearchJob.client_id == client_id)
    )
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Search job not found.")
    for candidate in job.people:
        if candidate.get("id") == str(person_id):
            return PersonResponse.model_validate(
                {
                    **candidate,
                    "decision_power_score": decision_power_score(candidate["title"]),
                }
            )
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail="Person not found in search job."
    )


def _person_research_response(
    person_id: UUID, cache: PersonResearchCache | None
) -> PersonResearchResponse:
    if cache is None:
        return PersonResearchResponse(person_id=person_id, status="not_started")
    return PersonResearchResponse.model_validate(
        {
            "person_id": person_id,
            "status": cast(ResearchStatus, cache.status),
            "work_history": cache.work_history,
            "education": cache.education,
            "volunteer_experience": cache.volunteer_experience,
            "error": cache.error,
            "fetched_at": cache.fetched_at,
        }
    )


def _match_run_response(run: MatchRun) -> MatchRunResponse:
    return MatchRunResponse.model_validate(
        {
            "id": run.id,
            "status": run.status,
            "candidate_count": len(run.candidate_ids),
            "completed_count": run.completed_count,
            "results": run.results,
            "error": run.error,
            "completed_at": run.completed_at,
        }
    )
