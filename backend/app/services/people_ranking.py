from collections.abc import Iterable
from typing import Protocol


class PersonWithTitle(Protocol):
    title: str


def hiring_influence_score(title: str) -> int:
    """Rank current roles without requiring a job-seeker profile or Gemini."""
    normalized = title.casefold()
    if any(word in normalized for word in ("founder", "chief", "ceo", "cto", "cpo")):
        return 100
    if "vice president" in normalized or " vp" in f" {normalized}":
        return 90
    if "director" in normalized or "head of" in normalized:
        return 80
    if "manager" in normalized or "lead" in normalized:
        return 70
    if any(word in normalized for word in ("recruit", "talent", "human resources", " hr")):
        return 60
    if "senior" in normalized:
        return 45
    return 25


def rank_by_hiring_influence[PersonT: PersonWithTitle](people: Iterable[PersonT]) -> list[PersonT]:
    return sorted(people, key=lambda person: hiring_influence_score(person.title), reverse=True)
