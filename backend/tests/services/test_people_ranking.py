from dataclasses import dataclass

from app.services.people_ranking import hiring_influence_score, rank_by_hiring_influence


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
