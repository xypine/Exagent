import argparse
import asyncio
import json
import sys
from pathlib import Path

from dotenv import load_dotenv

from app.core.config import Settings
from app.services.exa_provider import (
    ExaProvider,
    ExaProviderError,
    normalize_domain,
    normalize_website_url,
)

ROOT_DIR = Path(__file__).resolve().parents[2]


def _text_argument(value: str) -> str:
    value = value.strip()
    if not value:
        raise argparse.ArgumentTypeError("must not be empty")
    return value


def _arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a live Exa company search.")
    parser.add_argument("--industry", required=True, type=_text_argument)
    parser.add_argument("--area", required=True, type=_text_argument)
    parser.add_argument("--limit", type=int, default=5, choices=range(1, 21))
    return parser.parse_args()


def _print_error(code: str, message: str) -> None:
    print(json.dumps({"error": {"code": code, "message": message}}), file=sys.stderr)


async def _search(industry: str, area: str, limit: int) -> int:
    load_dotenv(ROOT_DIR / ".env")
    settings = Settings()
    if not settings.exa_api_key:
        _print_error("not_configured", "Set EXA_API_KEY in .env before running a live search.")
        return 2

    query = f"Companies providing {industry} services in {area}. Prefer official company websites."
    provider = ExaProvider(settings)
    try:
        response = await provider.discover_companies(query, num_results=limit)
    except ExaProviderError as error:
        _print_error(error.code, str(error))
        return 1
    finally:
        await provider.close()

    results = []
    for rank, company in enumerate(response.output.companies, start=1):
        domain = normalize_domain(company.website_url)
        results.append(
            {
                "rank": rank,
                "name": company.name,
                "normalized_domain": domain,
                "website_url": normalize_website_url(company.website_url) or company.website_url,
                "summary": company.summary,
                "highlights": list(company.highlights),
            }
        )

    payload = {
        "industry": industry,
        "area": area,
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
    args = _arguments()
    return asyncio.run(_search(args.industry, args.area, args.limit))


if __name__ == "__main__":
    raise SystemExit(main())
