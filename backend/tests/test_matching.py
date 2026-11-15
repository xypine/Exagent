from app.services.matching import (
    Breakdown,
    MatchResponse,
    build_user_prompt,
    compute_score,
    ground_matches,
    score_matches,
)


def _person(person_id: str = "person-1") -> dict[str, object]:
    return {
        "id": person_id,
        "name": "Aino Example",
        "current_role": {
            "title": "CTO",
            "profile_url": "https://linkedin.example/aino",
            "evidence_url": "https://example.com/team",
        },
        "company": {
            "name": "Aurora",
            "summary": "Aurora builds B2B SaaS for logistics teams.",
            "sources": [{"title": "Aurora", "url": "https://aurora.example"}],
        },
        "research": {
            "work_history": [],
            "education": [
                {
                    "school": "Aalto University",
                    "major": None,
                    "source_url": "https://linkedin.example/aino",
                }
            ],
            "volunteer_experience": [],
        },
    }


def _match(
    person_id: str, decision: int = 36, background: int | None = 24, shared: int | None = 12
) -> dict[str, object]:
    return {
        "id": person_id,
        "confidence": "medium",
        "breakdown": {
            "decision_power": decision,
            "background_fit": background,
            "shared_ground": shared,
        },
        "evidence": [
            {"factor": "decision_power", "fact_id": "current_role"},
            {
                "factor": "background_fit",
                "fact_id": "company",
                "profile_quote": "B2B SaaS",
            },
            {
                "factor": "shared_ground",
                "fact_id": "education:0",
                "profile_quote": "Aalto University",
            },
        ],
    }


def test_score_is_sum_of_parts() -> None:
    assert compute_score(Breakdown(decision_power=36, background_fit=28, shared_ground=10)) == 74


def test_empty_profile_scales_decision_power_to_100() -> None:
    breakdown = Breakdown(decision_power=30, background_fit=None, shared_ground=None)

    assert compute_score(breakdown) == 75


def test_grounding_keeps_only_evidence_supported_by_the_profile_and_catalog() -> None:
    response = MatchResponse.model_validate({"results": [_match("person-1")]})

    result = ground_matches(response, [_person()], "Technical founder with B2B SaaS experience.")[0]

    assert result.breakdown.decision_power == 36
    assert result.breakdown.background_fit == 24
    assert result.breakdown.shared_ground == 0
    assert "Aalto University" not in result.reasoning
    assert all(
        item.source_label != "From your profile"
        or item.fact == "Relevant experience supplied for this run."
        for item in result.evidence
    )
    assert "Aalto University" not in str(result.model_dump())


def test_grounding_retains_verified_shared_ground_without_persisting_profile_quote() -> None:
    response = MatchResponse.model_validate({"results": [_match("person-1")]})

    result = ground_matches(
        response,
        [_person()],
        "Technical founder with B2B SaaS experience. I studied at Aalto University.",
    )[0]

    assert result.breakdown.shared_ground == 12
    assert any(item.source_label == "From your profile" for item in result.evidence)
    assert "I studied at Aalto University" not in str(result.model_dump())
    assert "Aalto University" in result.reasoning


def test_grounding_rejects_an_unrelated_public_fact_even_when_the_profile_quote_is_real() -> None:
    generated = _match("person-1")
    evidence = generated["evidence"]
    assert isinstance(evidence, list)
    evidence[2]["profile_quote"] = "product engineering"
    response = MatchResponse.model_validate({"results": [generated]})

    result = ground_matches(
        response,
        [_person()],
        "Technical founder with B2B SaaS and product engineering experience.",
    )[0]

    assert result.breakdown.shared_ground == 0
    assert "Aalto University" not in str(result.model_dump())


def test_score_matches_are_ranked_best_first() -> None:
    response = MatchResponse.model_validate(
        {"results": [_match("low", 10, 10, 0), _match("high", 40, 35, 15)]}
    )
    grounded = ground_matches(
        response, [_person("low"), _person("high")], "B2B SaaS Aalto University"
    )

    assert [match.id for match in score_matches(grounded)] == ["high", "low"]


def test_user_prompt_marks_empty_profile_and_keeps_unicode() -> None:
    prompt = build_user_prompt("  ", [{"id": "p1", "name": "Mäkelä"}])

    assert "(empty)" in prompt
    assert "Mäkelä" in prompt
    assert "evidence_catalog" in prompt
