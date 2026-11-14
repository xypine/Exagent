import asyncio
from collections import deque
from types import SimpleNamespace
from typing import Any

import httpx
import pytest
from exa_py import ExaTimeoutError

from app.core.config import Settings
from app.services.exa_provider import (
    ExaProvider,
    ExaProviderError,
    ExaProviderRateLimit,
    ExaProviderTimeout,
    _preserve_rate_limit_response,
    normalize_domain,
    normalize_website_url,
)


def _settings(**overrides: Any) -> Settings:
    values: dict[str, Any] = {
        "exa_api_key": None,
        "exa_qps": 1000,
        "exa_max_concurrency": 2,
        "exa_timeout_seconds": 1,
        "exa_max_retries": 0,
        "exa_retry_base_seconds": 0.5,
        "exa_retry_max_seconds": 5,
    }
    values.update(overrides)
    return Settings(**values)


def _response() -> SimpleNamespace:
    entity = SimpleNamespace(type="company", properties=SimpleNamespace(name="Example Wealth"))
    result = SimpleNamespace(
        url="https://example.fi/",
        title="Example Wealth",
        score=0.9,
        published_date=None,
        author=None,
        favicon=None,
        text="Example Wealth serves Helsinki clients.",
        summary="A wealth manager in Helsinki.",
        highlights=["Our Helsinki office"],
        entities=[entity],
        subpages=[],
    )
    return SimpleNamespace(results=[result])


class FakeClient:
    def __init__(self, responses: list[Exception | SimpleNamespace]) -> None:
        self.responses = deque(responses)
        self.calls: list[tuple[str, dict[str, Any]]] = []

    async def search(self, query: str, **kwargs: Any) -> SimpleNamespace:
        self.calls.append((query, kwargs))
        response = self.responses.popleft()
        if isinstance(response, Exception):
            raise response
        return response


async def test_provider_returns_neutral_dtos_and_bounded_company_search() -> None:
    client = FakeClient([_response()])
    provider = ExaProvider(_settings(), client=client)

    response = await provider.discover_companies("Companies in Helsinki", num_results=20)

    assert response.results[0].url == "https://example.fi/"
    assert response.results[0].entities[0].name == "Example Wealth"
    assert response.results[0].highlights == ("Our Helsinki office",)
    query, kwargs = client.calls[0]
    assert query == "Companies in Helsinki"
    assert kwargs["category"] == "company"
    assert kwargs["type"] == "auto"
    assert kwargs["num_results"] == 20
    assert kwargs["contents"]["highlights"]["max_characters"] == 2000
    assert "user_location" not in kwargs


async def test_retry_after_is_honored_and_retry_acquires_new_permit() -> None:
    client = FakeClient([ExaProviderRateLimit(retry_after=2), _response()])
    sleeps: list[float] = []

    async def sleep(delay: float) -> None:
        sleeps.append(delay)

    provider = ExaProvider(
        _settings(exa_max_retries=1),
        client=client,
        sleep=sleep,
        jitter=lambda _low, _high: 0,
    )

    await provider.discover_companies("Helsinki", num_results=1)

    assert sleeps == [2]
    assert len(client.calls) == 2
    assert provider.limiter.metrics.permitted_requests == 2
    assert provider.metrics.request_starts == 2
    assert provider.metrics.retries == 1
    assert provider.metrics.throttled_responses == 1


async def test_non_rate_limit_retry_uses_bounded_exponential_jitter() -> None:
    client = FakeClient([ValueError("Request failed with status code 500"), _response()])
    sleeps: list[float] = []

    async def sleep(delay: float) -> None:
        sleeps.append(delay)

    provider = ExaProvider(
        _settings(exa_max_retries=1),
        client=client,
        sleep=sleep,
        jitter=lambda _low, _high: 0.25,
    )

    await provider.discover_companies("Helsinki", num_results=1)

    assert sleeps == [0.25]
    assert provider.limiter.metrics.permitted_requests == 2


async def test_provider_timeout_is_normalized_and_sanitized() -> None:
    client = FakeClient([ExaTimeoutError("secret-token in provider error")])
    provider = ExaProvider(_settings(), client=client)

    with pytest.raises(ExaProviderTimeout) as caught:
        await provider.discover_companies("Helsinki", num_results=1)

    assert str(caught.value) == "Exa request timed out."
    assert "secret-token" not in str(caught.value)


async def test_provider_error_does_not_retry_or_expose_response_body() -> None:
    client = FakeClient([ValueError("Request failed with status code 401: secret-token")])
    provider = ExaProvider(_settings(exa_max_retries=3), client=client)

    with pytest.raises(ExaProviderError) as caught:
        await provider.discover_companies("Helsinki", num_results=1)

    assert str(caught.value) == "Exa request failed."
    assert "secret-token" not in str(caught.value)
    assert len(client.calls) == 1
    assert provider.metrics.retries == 0


async def test_concurrency_semaphore_is_independent_from_qps_limiter() -> None:
    active = 0
    max_active = 0

    class BlockingClient:
        async def search(self, query: str, **kwargs: Any) -> SimpleNamespace:
            nonlocal active, max_active
            active += 1
            max_active = max(max_active, active)
            await asyncio.sleep(0.02)
            active -= 1
            return _response()

    provider = ExaProvider(_settings(exa_max_concurrency=2), client=BlockingClient())

    await asyncio.gather(
        *(provider.discover_companies("Helsinki", num_results=1) for _ in range(4))
    )

    assert max_active == 2
    assert provider.limiter.metrics.permitted_requests == 4


def test_url_and_domain_normalization() -> None:
    value = "https://www.Example.fi:443/contact?utm_source=search&view=full#team"

    assert normalize_domain(value) == "example.fi"
    assert normalize_website_url(value) == "https://example.fi/contact?view=full"
    assert normalize_website_url("example.fi") == "https://example.fi/"
    assert normalize_domain("not a hostname") is None


async def test_response_hook_preserves_retry_after() -> None:
    response = httpx.Response(429, headers={"Retry-After": "3"})

    with pytest.raises(ExaProviderRateLimit) as caught:
        await _preserve_rate_limit_response(response)

    assert caught.value.retry_after == 3
