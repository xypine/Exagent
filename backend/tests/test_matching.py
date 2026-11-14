from app.services.matching import (
    Breakdown,
    MatchResponse,
    build_user_prompt,
    compute_score,
    score_matches,
)


def _match(person_id: str, decision: int, background: int | None, shared: int | None) -> dict:
    return {
        "id": person_id,
        "confidence": "medium",
        "breakdown": {
            "decision_power": decision,
            "background_fit": background,
            "shared_ground": shared,
        },
        "reasoning": "r",
        "outreach_angle": "a",
    }


def test_score_is_sum_of_parts() -> None:
    assert compute_score(Breakdown(decision_power=36, background_fit=28, shared_ground=10)) == 74


def test_empty_profile_scales_decision_power_to_100() -> None:
    breakdown = Breakdown(decision_power=30, background_fit=None, shared_ground=None)

    assert compute_score(breakdown) == 75


def test_matches_are_ranked_best_first() -> None:
    response = MatchResponse.model_validate(
        {"results": [_match("low", 10, 10, 0), _match("high", 40, 35, 15)]}
    )

    assert [m.id for m in score_matches(response)] == ["high", "low"]


def test_user_prompt_marks_empty_profile_and_keeps_unicode() -> None:
    prompt = build_user_prompt("  ", [{"id": "p1", "name": "Mäkelä"}])

    assert "(empty)" in prompt
    assert "Mäkelä" in prompt
