from __future__ import annotations

import asyncio
import random
import re
from collections import deque
from collections.abc import Awaitable, Callable, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import httpx
from exa_py import AsyncExa, ExaTimeoutError
from exa_py.api import DeepObjectOutputSchema
from pydantic import BaseModel, ConfigDict, ValidationError, model_validator

from app.core.config import Settings
from app.services.exa_rate_limiter import ExaRateLimiter, ExaRateLimiterQueueError


class ProviderCompany(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    name: str
    website_url: str
    summary: str
    highlights: tuple[str, ...]


class ProviderSearchOutput(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    companies: tuple[ProviderCompany, ...]


class ProviderPreviousExperience(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    company_name: str
    role: str


class ProviderEducation(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    school: str
    major: str | None


class ProviderVolunteerExperience(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    organization: str
    role: str | None


class ProviderPerson(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    name: str
    title: str
    company_name: str
    matched_job_title: str
    profile_url: str
    evidence_url: str
    evidence_summary: str
    previous_experience: tuple[ProviderPreviousExperience, ...]
    education: tuple[ProviderEducation, ...]
    volunteer_experience: tuple[ProviderVolunteerExperience, ...]

    @model_validator(mode="before")
    @classmethod
    def parse_background_entries(cls, value: Any) -> Any:
        if not isinstance(value, Mapping) or "background_entries" not in value:
            return value

        data = dict(value)
        entries = data.pop("background_entries")
        if not isinstance(entries, (list, tuple)):
            raise ValueError("background_entries must be an array")

        previous_experience: list[dict[str, str]] = []
        education: list[dict[str, str | None]] = []
        volunteer_experience: list[dict[str, str | None]] = []
        for entry in entries:
            if (
                not isinstance(entry, (list, tuple))
                or len(entry) != 3
                or any(not isinstance(item, str) for item in entry)
            ):
                raise ValueError("Each background entry must contain three strings")
            category = str(entry[0]).strip()
            organization = str(entry[1]).strip()
            detail = str(entry[2]).strip()
            if not organization:
                raise ValueError("Background entries must name an organization or school")

            match category:
                case "previous_experience":
                    if not detail:
                        raise ValueError("Previous experience entries must include a role")
                    previous_experience.append({"company_name": organization, "role": detail})
                case "education":
                    education.append({"school": organization, "major": detail or None})
                case "volunteer_experience":
                    volunteer_experience.append(
                        {"organization": organization, "role": detail or None}
                    )
                case _:
                    raise ValueError("Unknown background entry category")

        data["previous_experience"] = previous_experience
        data["education"] = education
        data["volunteer_experience"] = volunteer_experience
        return data


class ProviderPeopleSearchOutput(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    people: tuple[ProviderPerson, ...]


_COMPANY_OUTPUT_SCHEMA: DeepObjectOutputSchema = {
    "type": "object",
    "properties": {
        "companies": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "website_url": {"type": "string"},
                    "summary": {"type": "string"},
                    "highlights": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["name", "website_url", "summary", "highlights"],
            },
        }
    },
    "required": ["companies"],
}

_PEOPLE_OUTPUT_SCHEMA: DeepObjectOutputSchema = {
    "type": "object",
    "properties": {
        "people": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "title": {"type": "string"},
                    "company_name": {"type": "string"},
                    "matched_job_title": {"type": "string"},
                    "profile_url": {"type": "string"},
                    "evidence_url": {"type": "string"},
                    "evidence_summary": {"type": "string"},
                    "background_entries": {
                        "type": "array",
                        "description": (
                            "Verified public background for this person. Each item must be exactly "
                            "three strings: [category, organization_or_school, role_or_major]. "
                            "Use category previous_experience for a former company and role at "
                            "another employer, education for a school and its major or field of "
                            "study, or volunteer_experience for a volunteer organization and role. "
                            "Do not include the person's current role at the selected company in "
                            "previous_experience. Use an empty third string for an unreported "
                            "major or volunteer role. Return an empty array when no background is "
                            "verified. Never guess or mix details from same-named people."
                        ),
                        "items": {
                            "type": "array",
                            "items": {"type": "string"},
                            "minItems": 3,
                            "maxItems": 3,
                        },
                    },
                },
                "required": [
                    "name",
                    "title",
                    "company_name",
                    "matched_job_title",
                    "profile_url",
                    "evidence_url",
                    "evidence_summary",
                    "background_entries",
                ],
            },
        }
    },
    "required": ["people"],
}


class ExaProviderError(Exception):
    code = "provider_error"
    retryable = False

    def __init__(
        self, message: str = "Exa request failed.", *, retry_after: float | None = None
    ) -> None:
        super().__init__(message)
        self.retry_after = retry_after


class ExaProviderTimeout(ExaProviderError):
    code = "provider_timeout"
    retryable = True

    def __init__(self) -> None:
        super().__init__("Exa request timed out.")


class ExaProviderRateLimit(ExaProviderError):
    code = "provider_rate_limited"
    retryable = True

    def __init__(self, *, retry_after: float | None = None) -> None:
        super().__init__("Exa request rate limit was exceeded.", retry_after=retry_after)


class ExaProviderUnavailable(ExaProviderError):
    code = "provider_unavailable"
    retryable = True

    def __init__(self) -> None:
        super().__init__("Exa is temporarily unavailable.")


class ExaProviderInvalidResponse(ExaProviderError):
    code = "provider_invalid_response"

    def __init__(self) -> None:
        super().__init__("Exa returned an invalid structured response.")


@dataclass(frozen=True)
class ProviderEntity:
    kind: str | None
    name: str | None


@dataclass(frozen=True)
class ProviderDocument:
    url: str
    title: str | None
    score: float | None
    published_date: str | None = None
    author: str | None = None
    favicon: str | None = None
    text: str | None = None
    summary: str | None = None
    highlights: tuple[str, ...] = ()
    entities: tuple[ProviderEntity, ...] = ()
    subpages: tuple[ProviderDocument, ...] = ()


@dataclass(frozen=True)
class ProviderSearchResponse[OutputT: BaseModel]:
    results: tuple[ProviderDocument, ...]
    output: OutputT


@dataclass
class ExaProviderMetrics:
    request_starts: int = 0
    retries: int = 0
    throttled_responses: int = 0
    limiter_wait_seconds: float = 0.0
    max_limiter_wait_seconds: float = 0.0
    last_request_started_at: deque[float] = field(default_factory=lambda: deque(maxlen=1000))


def normalize_domain(value: str) -> str | None:
    candidate = value.strip()
    if not candidate:
        return None
    if "://" not in candidate:
        candidate = f"https://{candidate}"
    hostname = urlsplit(candidate).hostname
    if not hostname:
        return None
    try:
        domain = hostname.rstrip(".").encode("idna").decode("ascii").lower()
    except UnicodeError:
        return None
    if domain.startswith("www."):
        domain = domain[4:]
    return domain if "." in domain else None


def normalize_website_url(value: str) -> str | None:
    domain = normalize_domain(value)
    if domain is None:
        return None
    candidate = value.strip() if "://" in value else f"https://{value.strip()}"
    parsed = urlsplit(candidate)
    if parsed.scheme.lower() not in {"http", "https"}:
        return None
    try:
        port = parsed.port
    except ValueError:
        return None
    scheme = parsed.scheme.lower()
    netloc = domain if port is None else f"{domain}:{port}"
    if (scheme == "https" and port == 443) or (scheme == "http" and port == 80):
        netloc = domain
    query = urlencode(
        [
            (key, item)
            for key, item in parse_qsl(parsed.query, keep_blank_values=True)
            if not key.lower().startswith("utm_") and key.lower() not in {"fbclid", "gclid"}
        ]
    )
    return urlunsplit((scheme, netloc, parsed.path or "/", query, ""))


def _parse_retry_after(value: str | None) -> float | None:
    if value is None:
        return None
    try:
        return max(0.0, float(value))
    except ValueError:
        try:
            retry_at = parsedate_to_datetime(value)
        except (TypeError, ValueError):
            return None
        if retry_at.tzinfo is None:
            retry_at = retry_at.replace(tzinfo=UTC)
        return max(0.0, (retry_at - datetime.now(UTC)).total_seconds())


async def _preserve_rate_limit_response(response: httpx.Response) -> None:
    if response.status_code == 429:
        raise ExaProviderRateLimit(
            retry_after=_parse_retry_after(response.headers.get("retry-after"))
        )


class _RetryAfterAsyncExa(AsyncExa):
    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers=self.headers,
                timeout=self.timeout,
                event_hooks={"response": [_preserve_rate_limit_response]},
            )
        return self._client


def _read(value: Any, key: str) -> Any:
    if isinstance(value, Mapping):
        return value.get(key)
    return getattr(value, key, None)


def _to_document(value: Any) -> ProviderDocument:
    raw_entities = _read(value, "entities") or ()
    entities = tuple(
        ProviderEntity(
            kind=_read(entity, "type"),
            name=_read(_read(entity, "properties"), "name"),
        )
        for entity in raw_entities
    )
    subpages = tuple(_to_document(subpage) for subpage in (_read(value, "subpages") or ()))
    return ProviderDocument(
        url=str(_read(value, "url") or ""),
        title=_read(value, "title"),
        score=_read(value, "score"),
        published_date=_read(value, "published_date"),
        author=_read(value, "author"),
        favicon=_read(value, "favicon"),
        text=_read(value, "text"),
        summary=_read(value, "summary"),
        highlights=tuple(str(item) for item in (_read(value, "highlights") or ())),
        entities=entities,
        subpages=subpages,
    )


def _to_output[OutputT: BaseModel](value: Any, output_type: type[OutputT]) -> OutputT:
    content = _read(_read(value, "output"), "content")
    if not isinstance(content, Mapping):
        raise ExaProviderInvalidResponse()
    try:
        return output_type.model_validate(dict(content))
    except ValidationError:
        raise ExaProviderInvalidResponse() from None


class ExaProvider:
    def __init__(
        self,
        settings: Settings,
        *,
        client: Any | None = None,
        limiter: ExaRateLimiter | None = None,
        sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
        jitter: Callable[[float, float], float] = random.uniform,
    ) -> None:
        if not settings.exa_api_key and client is None:
            raise ValueError("EXA_API_KEY is required")

        self._client = client or _RetryAfterAsyncExa(
            api_key=settings.exa_api_key,
            timeout=settings.exa_timeout_seconds,
        )
        self._limiter = limiter or ExaRateLimiter(
            requests_per_second=settings.exa_qps,
            max_queue_wait_seconds=settings.exa_max_queue_wait_seconds,
            max_pending_requests=settings.exa_max_pending_requests,
        )
        self._semaphore = asyncio.Semaphore(settings.exa_max_concurrency)
        self._timeout_seconds = settings.exa_timeout_seconds
        self._max_retries = settings.exa_max_retries
        self._retry_base_seconds = settings.exa_retry_base_seconds
        self._retry_max_seconds = settings.exa_retry_max_seconds
        self._sleep = sleep
        self._jitter = jitter
        self.metrics = ExaProviderMetrics()

    @property
    def limiter(self) -> ExaRateLimiter:
        return self._limiter

    async def discover_companies(
        self, query: str, *, num_results: int
    ) -> ProviderSearchResponse[ProviderSearchOutput]:
        return await self._request(
            lambda output_schema: self._client.search(
                query,
                type="auto",
                category="company",
                num_results=num_results,
                contents={"highlights": {"query": query, "max_characters": 2000}},
                output_schema=output_schema,
                timeout=self._timeout_seconds,
            ),
            output_schema=_COMPANY_OUTPUT_SCHEMA,
            output_type=ProviderSearchOutput,
        )

    async def resolve_company(
        self, query: str, *, num_results: int = 3
    ) -> ProviderSearchResponse[ProviderSearchOutput]:
        return await self._request(
            lambda output_schema: self._client.search(
                query,
                type="auto",
                category="company",
                num_results=num_results,
                contents=False,
                output_schema=output_schema,
                timeout=self._timeout_seconds,
            ),
            output_schema=_COMPANY_OUTPUT_SCHEMA,
            output_type=ProviderSearchOutput,
        )

    async def enrich_company(
        self,
        query: str,
        *,
        domain: str,
        summary_query: str,
        num_results: int = 5,
    ) -> ProviderSearchResponse[ProviderSearchOutput]:
        return await self._request(
            lambda output_schema: self._client.search(
                query,
                type="auto",
                category="company",
                include_domains=[domain],
                num_results=num_results,
                contents={
                    "text": {"max_characters": 4000},
                    "highlights": {"query": query, "max_characters": 3000},
                    "summary": {"query": summary_query},
                    "subpages": 4,
                    "subpage_target": [
                        "about",
                        "services",
                        "contact",
                        "locations",
                        "offices",
                    ],
                },
                output_schema=output_schema,
                timeout=self._timeout_seconds,
            ),
            output_schema=_COMPANY_OUTPUT_SCHEMA,
            output_type=ProviderSearchOutput,
        )

    async def discover_people(
        self,
        company_name: str,
        *,
        company_domain: str,
        job_titles: Sequence[str],
        num_results: int,
    ) -> ProviderSearchResponse[ProviderPeopleSearchOutput]:
        company = company_name.strip()
        if not company:
            raise ValueError("company_name must not be empty")
        domain = normalize_domain(company_domain)
        if domain is None:
            raise ValueError("company_domain must be a valid domain or website URL")
        titles = tuple(title.strip() for title in job_titles)
        if not titles or any(not title for title in titles):
            raise ValueError("job_titles must contain at least one non-empty title")

        title_text = "; ".join(titles)
        query = (
            f"Professional profiles of people currently working at {company} ({domain}). "
            "Find current employees whose current role is the same as, or clearly equivalent to, "
            f"one of these target roles: {title_text}. "
            "A specialized or compound current title qualifies when it includes the target role "
            "or its core responsibilities. "
            f"Verify current employment at {company} specifically, not another company or "
            "division in its corporate group. Return one row per person with public evidence and "
            "exclude former employees. Set matched_job_title to the target role that best matches "
            "the current title. Also extract publicly evidenced previous roles at other companies, "
            "schools and majors, and volunteer experience. Omit unverified background details and "
            "never combine profiles belonging to different people with the same name."
        )
        return await self._request(
            lambda output_schema: self._client.search(
                query,
                type="auto",
                category="people",
                num_results=num_results,
                contents={"highlights": {"query": query, "max_characters": 2000}},
                output_schema=output_schema,
                timeout=self._timeout_seconds,
            ),
            output_schema=_PEOPLE_OUTPUT_SCHEMA,
            output_type=ProviderPeopleSearchOutput,
        )

    async def close(self) -> None:
        if isinstance(self._client, AsyncExa):
            await self._client.aclose()

    async def _request[OutputT: BaseModel](
        self,
        call: Callable[[DeepObjectOutputSchema], Awaitable[Any]],
        *,
        output_schema: DeepObjectOutputSchema,
        output_type: type[OutputT],
    ) -> ProviderSearchResponse[OutputT]:
        for attempt in range(self._max_retries + 1):
            try:
                wait = await self._limiter.acquire()
            except ExaRateLimiterQueueError as error:
                raise ExaProviderUnavailable() from error

            self.metrics.limiter_wait_seconds += wait
            self.metrics.max_limiter_wait_seconds = max(self.metrics.max_limiter_wait_seconds, wait)
            self.metrics.request_starts += 1
            self.metrics.last_request_started_at.append(asyncio.get_running_loop().time())
            try:
                async with self._semaphore:
                    async with asyncio.timeout(self._timeout_seconds):
                        response = await call(output_schema)
            except Exception as error:
                provider_error = self._normalize_error(error)
                if isinstance(provider_error, ExaProviderRateLimit):
                    self.metrics.throttled_responses += 1
                if not provider_error.retryable or attempt >= self._max_retries:
                    raise provider_error from None

                self.metrics.retries += 1
                delay = self._retry_delay(attempt, provider_error)
                await self._sleep(delay)
            else:
                output = _to_output(response, output_type)
                return ProviderSearchResponse(
                    results=tuple(_to_document(result) for result in response.results),
                    output=output,
                )

        raise AssertionError("Exa retry loop exited unexpectedly")

    def _retry_delay(self, attempt: int, error: ExaProviderError) -> float:
        if error.retry_after is not None:
            if error.retry_after > self._retry_max_seconds:
                raise ExaProviderError("Exa rate-limit retry delay exceeded its configured bound.")
            return error.retry_after
        upper_bound = min(
            self._retry_max_seconds,
            self._retry_base_seconds * (2**attempt),
        )
        return self._jitter(0, upper_bound)

    @staticmethod
    def _normalize_error(error: Exception) -> ExaProviderError:
        if isinstance(error, ExaProviderError):
            return error
        if isinstance(error, (ExaTimeoutError, TimeoutError)):
            return ExaProviderTimeout()
        if isinstance(error, httpx.TransportError):
            return ExaProviderUnavailable()
        if isinstance(error, ValueError):
            match = re.search(r"status code (\d{3})", str(error))
            try:
                status_code = int(match.group(1)) if match else None
            except ValueError:
                status_code = None
            if status_code == 429:
                return ExaProviderRateLimit()
            if status_code in {408, 425} or (status_code is not None and status_code >= 500):
                return ExaProviderUnavailable()
        return ExaProviderError()
