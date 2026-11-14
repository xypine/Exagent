import json
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

from app.services.exa_provider import ProviderPeopleSearchOutput, ProviderPerson
from scripts import exa_people_search as cli


def test_load_job_title_presets_normalizes_titles(tmp_path: Path) -> None:
    path = tmp_path / "job_titles.json"
    path.write_text(
        json.dumps({"saas_company": [" Product Manager ", "Software Engineer"]}),
        encoding="utf-8",
    )

    assert cli._load_job_title_presets(path) == {
        "saas_company": ("Product Manager", "Software Engineer")
    }


@pytest.mark.parametrize(
    "content",
    [
        [],
        {"saas_company": []},
        {"saas_company": [" "]},
        {"saas_company": ["CTO", 42]},
    ],
)
def test_load_job_title_presets_rejects_invalid_data(tmp_path: Path, content: object) -> None:
    path = tmp_path / "job_titles.json"
    path.write_text(json.dumps(content), encoding="utf-8")

    with pytest.raises(ValueError):
        cli._load_job_title_presets(path)


def test_repository_job_title_presets_are_valid() -> None:
    presets = cli._load_job_title_presets()

    assert presets["saas_company"]
    assert presets["investment_banking"]
    assert presets["wealth_management"]


def test_arguments_select_an_industry_preset(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        sys,
        "argv",
        [
            "exa-people-search",
            "--company",
            "Example Wealth",
            "--company-url",
            "https://example.fi",
            "--industry-key",
            "wealth_management",
            "--limit",
            "7",
        ],
    )

    args = cli._arguments({"wealth_management": ("Portfolio Manager",)})

    assert args.company == "Example Wealth"
    assert args.company_url == "https://example.fi"
    assert args.industry_key == "wealth_management"
    assert args.limit == 7


async def test_search_serializes_validated_structured_people_output(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    class FakeProvider:
        def __init__(self, settings: object) -> None:
            self.settings = settings
            self.metrics = SimpleNamespace(
                request_starts=1,
                retries=0,
                throttled_responses=0,
            )
            self.call: tuple[str, str, tuple[str, ...], int] | None = None
            self.closed = False

        async def discover_people(
            self,
            company_name: str,
            *,
            company_domain: str,
            job_titles: tuple[str, ...],
            num_results: int,
        ) -> SimpleNamespace:
            self.call = (company_name, company_domain, job_titles, num_results)
            person = ProviderPerson(
                name="Aino Example",
                title="Portfolio Manager",
                company_name="Example Wealth",
                matched_job_title="Portfolio Manager",
                profile_url="https://linkedin.com/in/aino-example",
                evidence_url="https://example.fi/team/aino",
                evidence_summary="The company team page lists Aino as Portfolio Manager.",
            )
            return SimpleNamespace(output=ProviderPeopleSearchOutput(people=(person,)))

        async def close(self) -> None:
            self.closed = True

    providers: list[FakeProvider] = []

    def build_provider(settings: object) -> FakeProvider:
        provider = FakeProvider(settings)
        providers.append(provider)
        return provider

    monkeypatch.setattr(cli, "Settings", lambda: SimpleNamespace(exa_api_key="test-key"))
    monkeypatch.setattr(cli, "ExaProvider", build_provider)
    monkeypatch.setattr(cli, "load_dotenv", lambda _path: None)

    exit_code = await cli._search(
        "Example Wealth",
        "https://www.example.fi/team?utm_source=test",
        "wealth_management",
        ("Portfolio Manager",),
        5,
    )

    assert exit_code == 0
    assert len(providers) == 1
    provider = providers[0]
    assert provider.call == (
        "Example Wealth",
        "example.fi",
        ("Portfolio Manager",),
        5,
    )
    assert provider.closed

    payload = json.loads(capsys.readouterr().out)
    assert payload["company"] == {
        "name": "Example Wealth",
        "normalized_domain": "example.fi",
        "website_url": "https://example.fi/team",
    }
    assert payload["industry_key"] == "wealth_management"
    assert payload["job_titles"] == ["Portfolio Manager"]
    assert payload["result_count"] == 1
    assert payload["results"] == [
        {
            "rank": 1,
            "name": "Aino Example",
            "title": "Portfolio Manager",
            "company_name": "Example Wealth",
            "matched_job_title": "Portfolio Manager",
            "profile_url": "https://linkedin.com/in/aino-example",
            "evidence_url": "https://example.fi/team/aino",
            "evidence_summary": "The company team page lists Aino as Portfolio Manager.",
        }
    ]
    assert payload["meta"] == {
        "requests": 1,
        "retries": 0,
        "rate_limited_responses": 0,
    }
