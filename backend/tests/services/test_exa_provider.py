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
    ExaProviderInvalidResponse,
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
    output = SimpleNamespace(
        content={
            "companies": [
                {
                    "name": "Example Wealth",
                    "website_url": "https://example.fi/",
                    "summary": "A wealth manager in Helsinki.",
                    "highlights": ["Our Helsinki office"],
                }
            ]
        }
    )
    return SimpleNamespace(results=[result], output=output)


def _people_response() -> SimpleNamespace:
    entity = SimpleNamespace(type="person", properties=SimpleNamespace(name="Aino Example"))
    result = SimpleNamespace(
        url="https://linkedin.com/in/aino-example",
        title="Aino Example - Example Wealth",
        score=0.95,
        published_date=None,
        author=None,
        favicon=None,
        text="Aino Example is a Portfolio Manager at Example Wealth.",
        summary="Portfolio Manager at Example Wealth.",
        highlights=["Current Portfolio Manager at Example Wealth"],
        entities=[entity],
        subpages=[],
    )
    output = SimpleNamespace(
        content={
            "people": [
                {
                    "name": "Aino Example",
                    "title": "Portfolio Manager",
                    "company_name": "Example Wealth",
                    "matched_job_title": "Portfolio Manager",
                    "profile_url": "https://linkedin.com/in/aino-example",
                    "evidence_url": "https://example.fi/team/aino",
                    "evidence_summary": "The company team page lists Aino as Portfolio Manager.",
                    "background_entries": [
                        ["previous_experience", "Nordic Capital", "Investment Analyst"],
                        ["education", "Aalto University", "Finance"],
                        ["education", "Hanken School of Economics", ""],
                        ["volunteer_experience", "Startup Refugees", "Mentor"],
                        ["volunteer_experience", "Local Food Bank", ""],
                    ],
                }
            ]
        }
    )
    return SimpleNamespace(results=[result], output=output)


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
    assert response.output.companies[0].name == "Example Wealth"
    assert response.output.companies[0].website_url == "https://example.fi/"
    query, kwargs = client.calls[0]
    assert query == "Companies in Helsinki"
    assert kwargs["category"] == "company"
    assert kwargs["type"] == "auto"
    assert kwargs["num_results"] == 20
    assert kwargs["contents"]["highlights"]["max_characters"] == 2000
    assert kwargs["output_schema"]["type"] == "object"
    assert kwargs["output_schema"]["required"] == ["companies"]
    assert "user_location" not in kwargs


async def test_provider_returns_structured_people_from_single_bounded_search() -> None:
    client = FakeClient([_people_response()])
    provider = ExaProvider(_settings(), client=client)

    response = await provider.discover_people(
        "Example Wealth",
        company_domain="https://www.example.fi/",
        job_titles=["Portfolio Manager", " Investment Analyst "],
        num_results=12,
    )

    person = response.output.people[0]
    assert person.name == "Aino Example"
    assert person.title == "Portfolio Manager"
    assert person.company_name == "Example Wealth"
    assert person.matched_job_title == "Portfolio Manager"
    assert person.profile_url == "https://linkedin.com/in/aino-example"
    assert person.evidence_url == "https://example.fi/team/aino"
    assert person.previous_experience[0].company_name == "Nordic Capital"
    assert person.previous_experience[0].role == "Investment Analyst"
    assert person.education[0].school == "Aalto University"
    assert person.education[0].major == "Finance"
    assert person.education[1].school == "Hanken School of Economics"
    assert person.education[1].major is None
    assert person.volunteer_experience[0].organization == "Startup Refugees"
    assert person.volunteer_experience[0].role == "Mentor"
    assert person.volunteer_experience[1].organization == "Local Food Bank"
    assert person.volunteer_experience[1].role is None
    assert response.results[0].url == "https://linkedin.com/in/aino-example"

    query, kwargs = client.calls[0]
    assert "currently working at Example Wealth (example.fi)" in query
    assert "Portfolio Manager; Investment Analyst" in query
    assert "same as, or clearly equivalent to" in query
    assert "specialized or compound current title qualifies" in query
    assert "Verify current employment at Example Wealth specifically" in query
    assert "not another company or division in its corporate group" in query
    assert "exclude former employees" in query
    assert "Set matched_job_title to the target role" in query
    assert "previous roles at other companies" in query
    assert "schools and majors" in query
    assert "volunteer experience" in query
    assert "never combine profiles belonging to different people" in query
    assert len(client.calls) == 1
    assert kwargs["category"] == "people"
    assert kwargs["type"] == "auto"
    assert kwargs["num_results"] == 12
    assert kwargs["contents"] == {"highlights": {"query": query, "max_characters": 2000}}
    assert "include_domains" not in kwargs
    assert kwargs["output_schema"]["required"] == ["people"]
    person_schema = kwargs["output_schema"]["properties"]["people"]["items"]
    assert set(person_schema["required"]) == {
        "name",
        "title",
        "company_name",
        "matched_job_title",
        "profile_url",
        "evidence_url",
        "evidence_summary",
        "background_entries",
    }
    assert len(kwargs["output_schema"]["properties"]) + len(person_schema["properties"]) <= 10
    background_items = person_schema["properties"]["background_entries"]["items"]
    assert background_items["type"] == "array"
    assert background_items["items"] == {"type": "string"}
    assert background_items["minItems"] == 3
    assert background_items["maxItems"] == 3


async def test_people_search_accepts_valid_empty_structured_output() -> None:
    raw_response = _people_response()
    raw_response.output = SimpleNamespace(content={"people": []})
    client = FakeClient([raw_response])
    provider = ExaProvider(_settings(), client=client)

    response = await provider.discover_people(
        "Example Wealth",
        company_domain="example.fi",
        job_titles=["Portfolio Manager"],
        num_results=5,
    )

    assert response.output.people == ()


async def test_people_search_returns_empty_background_categories() -> None:
    raw_response = _people_response()
    raw_response.output.content["people"][0]["background_entries"] = []
    client = FakeClient([raw_response])
    provider = ExaProvider(_settings(), client=client)

    response = await provider.discover_people(
        "Example Wealth",
        company_domain="example.fi",
        job_titles=["Portfolio Manager"],
        num_results=5,
    )

    person = response.output.people[0]
    assert person.previous_experience == ()
    assert person.education == ()
    assert person.volunteer_experience == ()


@pytest.mark.parametrize(
    "background_entries",
    [
        "not an array",
        [["previous_experience", "Missing role"]],
        [["previous_experience", "Former Company", ""]],
        [["education", "", "Finance"]],
        [["unknown_category", "Organization", "Role"]],
        [["education", "Aalto University", 42]],
    ],
)
async def test_invalid_background_entries_are_rejected_without_retrying(
    background_entries: object,
) -> None:
    raw_response = _people_response()
    raw_response.output.content["people"][0]["background_entries"] = background_entries
    client = FakeClient([raw_response])
    provider = ExaProvider(_settings(exa_max_retries=3), client=client)

    with pytest.raises(ExaProviderInvalidResponse):
        await provider.discover_people(
            "Example Wealth",
            company_domain="example.fi",
            job_titles=["Portfolio Manager"],
            num_results=5,
        )

    assert len(client.calls) == 1
    assert provider.metrics.retries == 0


@pytest.mark.parametrize(
    "output",
    [
        None,
        SimpleNamespace(content="not an object"),
        SimpleNamespace(content={"people": "secret-token"}),
        SimpleNamespace(content={"people": [{"name": "Missing fields"}]}),
    ],
)
async def test_invalid_people_output_is_rejected_without_retrying(output: object) -> None:
    raw_response = _people_response()
    raw_response.output = output
    client = FakeClient([raw_response])
    provider = ExaProvider(_settings(exa_max_retries=3), client=client)

    with pytest.raises(ExaProviderInvalidResponse) as caught:
        await provider.discover_people(
            "Example Wealth",
            company_domain="example.fi",
            job_titles=["Portfolio Manager"],
            num_results=5,
        )

    assert str(caught.value) == "Exa returned an invalid structured response."
    assert "secret-token" not in str(caught.value)
    assert len(client.calls) == 1
    assert provider.metrics.retries == 0


@pytest.mark.parametrize(
    ("company_name", "domain", "titles"),
    [
        ("", "example.fi", ["Portfolio Manager"]),
        ("Example Wealth", "not a hostname", ["Portfolio Manager"]),
        ("Example Wealth", "example.fi", []),
        ("Example Wealth", "example.fi", [" "]),
    ],
)
async def test_people_search_validates_company_and_titles_before_requesting(
    company_name: str, domain: str, titles: list[str]
) -> None:
    client = FakeClient([])
    provider = ExaProvider(_settings(), client=client)

    with pytest.raises(ValueError):
        await provider.discover_people(
            company_name,
            company_domain=domain,
            job_titles=titles,
            num_results=5,
        )

    assert client.calls == []


async def test_resolve_and_enrich_also_require_structured_output() -> None:
    client = FakeClient([_response(), _response()])
    provider = ExaProvider(_settings(), client=client)

    await provider.resolve_company("Example Wealth")
    await provider.enrich_company(
        "Example Wealth",
        domain="example.fi",
        summary_query="Describe Example Wealth",
    )

    assert len(client.calls) == 2
    for _query, kwargs in client.calls:
        assert kwargs["output_schema"]["type"] == "object"
        assert kwargs["output_schema"]["required"] == ["companies"]


@pytest.mark.parametrize(
    "output",
    [
        None,
        SimpleNamespace(content="not an object"),
        SimpleNamespace(content={"companies": "secret-token"}),
        SimpleNamespace(content={"companies": [{"name": "Missing fields"}]}),
    ],
)
async def test_invalid_structured_output_is_rejected_without_retrying(output: object) -> None:
    raw_response = _response()
    raw_response.output = output
    client = FakeClient([raw_response])
    provider = ExaProvider(_settings(exa_max_retries=3), client=client)

    with pytest.raises(ExaProviderInvalidResponse) as caught:
        await provider.discover_companies("Helsinki", num_results=1)

    assert str(caught.value) == "Exa returned an invalid structured response."
    assert "secret-token" not in str(caught.value)
    assert len(client.calls) == 1
    assert provider.metrics.retries == 0


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
