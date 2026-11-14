import argparse
import asyncio
import json
import sys
from collections.abc import Mapping, Sequence
from pathlib import Path

from dotenv import load_dotenv

from app.core.config import Settings
from app.services.exa_provider import (
    ExaProvider,
    ExaProviderError,
    normalize_domain,
    normalize_website_url,
)

BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = BACKEND_DIR.parent
JOB_TITLES_PATH = BACKEND_DIR / "job_titles.json"


def _text_argument(value: str) -> str:
    value = value.strip()
    if not value:
        raise argparse.ArgumentTypeError("must not be empty")
    return value


def _load_job_title_presets(path: Path = JOB_TITLES_PATH) -> dict[str, tuple[str, ...]]:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"Could not load job title presets from {path}.") from error

    if not isinstance(raw, dict):
        raise ValueError("Job title presets must be a JSON object.")

    presets: dict[str, tuple[str, ...]] = {}
    for key, titles in raw.items():
        if not isinstance(key, str) or not key.strip():
            raise ValueError("Job title preset keys must be non-empty strings.")
        if not isinstance(titles, list) or not titles:
            raise ValueError(f"Job title preset {key!r} must contain at least one title.")
        if any(not isinstance(title, str) or not title.strip() for title in titles):
            raise ValueError(f"Job title preset {key!r} contains an invalid title.")
        presets[key] = tuple(title.strip() for title in titles)
    return presets


def _arguments(presets: Mapping[str, Sequence[str]]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run a live Exa people search for a selected company and industry preset."
    )
    parser.add_argument("--company", required=True, type=_text_argument)
    parser.add_argument("--company-url", required=True, type=_text_argument)
    parser.add_argument("--industry-key", required=True, choices=sorted(presets))
    parser.add_argument("--limit", type=int, default=10, choices=range(1, 21))
    return parser.parse_args()


def _print_error(code: str, message: str) -> None:
    print(json.dumps({"error": {"code": code, "message": message}}), file=sys.stderr)


async def _search(
    company: str,
    company_url: str,
    industry_key: str,
    job_titles: Sequence[str],
    limit: int,
) -> int:
    domain = normalize_domain(company_url)
    if domain is None:
        _print_error("invalid_company_url", "Company URL must contain a valid hostname.")
        return 2

    load_dotenv(PROJECT_DIR / ".env")
    settings = Settings()
    if not settings.exa_api_key:
        _print_error("not_configured", "Set EXA_API_KEY in .env before running a live search.")
        return 2

    provider = ExaProvider(settings)
    try:
        discovery = await provider.discover_people(
            company, company_domain=domain, job_titles=job_titles, num_results=limit
        )
        enriched_people = []
        for person in discovery.output.people:
            enriched = await provider.research_person(
                person.name, company_name=company, profile_url=person.profile_url
            )
            enriched_people.extend(enriched.output.people[:1])
    except ExaProviderError as error:
        _print_error(error.code, str(error))
        return 1
    finally:
        await provider.close()

    results = [
        {
            "rank": rank,
            "name": person.name,
            "title": person.title,
            "company_name": person.company_name,
            "matched_job_title": person.matched_job_title,
            "profile_url": person.profile_url,
            "evidence_url": person.evidence_url,
            "evidence_summary": person.evidence_summary,
            "previous_experience": [
                experience.model_dump() for experience in person.previous_experience
            ],
            "education": [education.model_dump() for education in person.education],
            "volunteer_experience": [
                experience.model_dump() for experience in person.volunteer_experience
            ],
        }
        for rank, person in enumerate(enriched_people, start=1)
    ]
    payload = {
        "company": {
            "name": company,
            "normalized_domain": domain,
            "website_url": normalize_website_url(company_url) or company_url,
        },
        "industry_key": industry_key,
        "job_titles": list(job_titles),
        "result_count": len(results),
        "results": results,
        "meta": {
            "requests": provider.metrics.request_starts,
            "retries": provider.metrics.retries,
            "rate_limited_responses": provider.metrics.throttled_responses,
        },
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0


def main() -> int:
    try:
        presets = _load_job_title_presets()
    except ValueError as error:
        _print_error("invalid_job_title_presets", str(error))
        return 2
    args = _arguments(presets)
    return asyncio.run(
        _search(
            args.company,
            args.company_url,
            args.industry_key,
            presets[args.industry_key],
            args.limit,
        )
    )


if __name__ == "__main__":
    raise SystemExit(main())
