from app.api.routes.searches import CompanyResponse


def company_response(summary: str) -> CompanyResponse:
    return CompanyResponse(
        id="company-1",
        name="Evli",
        url="https://evli.com/",
        summary=summary,
        sources=[],
    )


def test_company_response_removes_numeric_citation_markers() -> None:
    response = company_response(
        "Evli is a Nordic investment management company serving institutions. [2]"
    )

    assert response.summary == (
        "Evli is a Nordic investment management company serving institutions."
    )


def test_company_response_preserves_non_citation_brackets() -> None:
    response = company_response("A [family-owned] company with a [2024] strategy. [1, 2–3]")

    assert response.summary == "A [family-owned] company with a [2024] strategy."
