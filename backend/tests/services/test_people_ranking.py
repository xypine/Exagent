from dataclasses import dataclass

from app.services.people_ranking import (
    decision_power_score,
    hiring_influence_score,
    rank_by_hiring_influence,
)


@dataclass
class Person:
    title: str


def test_hiring_influence_prioritizes_decision_makers() -> None:
    people = [
        Person("Senior Software Engineer"),
        Person("Engineering Manager"),
        Person("Chief Technology Officer"),
        Person("Talent Acquisition Specialist"),
    ]

    ranked = rank_by_hiring_influence(people)

    assert [person.title for person in ranked] == [
        "Chief Technology Officer",
        "Engineering Manager",
        "Talent Acquisition Specialist",
        "Senior Software Engineer",
    ]
    assert hiring_influence_score("Chief Technology Officer") == 100


def test_decision_power_score_uses_four_clear_bands() -> None:
    assert decision_power_score("Chief Technology Officer") == 80
    assert decision_power_score("VP Engineering") == 80
    assert decision_power_score("Head of Product") == 60
    assert decision_power_score("Engineering Manager") == 40
    assert decision_power_score("Senior Software Engineer") == 20
