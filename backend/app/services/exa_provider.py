from __future__ import annotations

import asyncio
import random
import re
from collections import deque
from collections.abc import Awaitable, Callable, Mapping
from dataclasses import dataclass, field
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import httpx
from exa_py import AsyncExa, ExaTimeoutError
from exa_py.api import DeepObjectOutputSchema
from pydantic import BaseModel, ConfigDict, ValidationError

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
class ProviderSearchResponse:
    results: tuple[ProviderDocument, ...]
    output: ProviderSearchOutput


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


def _to_output(value: Any) -> ProviderSearchOutput:
    content = _read(_read(value, "output"), "content")
    if not isinstance(content, Mapping):
        raise ExaProviderInvalidResponse()
    try:
        return ProviderSearchOutput.model_validate(dict(content))
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

    async def discover_companies(self, query: str, *, num_results: int) -> ProviderSearchResponse:
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
        )

    async def resolve_company(self, query: str, *, num_results: int = 3) -> ProviderSearchResponse:
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
        )

    async def enrich_company(
        self,
        query: str,
        *,
        domain: str,
        summary_query: str,
        num_results: int = 5,
    ) -> ProviderSearchResponse:
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
        )

    async def close(self) -> None:
        if isinstance(self._client, AsyncExa):
            await self._client.aclose()

    async def _request(
        self,
        call: Callable[[DeepObjectOutputSchema], Awaitable[Any]],
        *,
        output_schema: DeepObjectOutputSchema,
    ) -> ProviderSearchResponse:
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
                output = _to_output(response)
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
