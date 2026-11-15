import type { Company, Person, PersonMatch } from "./types";

export type CompanyRankingStage = "exa" | "people" | "matches";

type RankedCompany = {
  company: Company;
  originalIndex: number;
  verifiedPeople: Person[];
  scoredMatches: PersonMatch[];
  bestDecisionPower: number;
  bestMatchScore: number;
};

/**
 * Keep the provider's order until a whole enrichment stage has completed.
 * Subsequent keys make the order deterministic without discarding that order.
 */
export function rankCompanies(
  companies: Company[],
  people: Person[],
  matches: PersonMatch[],
  stage: CompanyRankingStage,
): Company[] {
  if (stage === "exa") return [...companies];

  const peopleByCompany = new Map<string, Person[]>();
  for (const person of people) {
    if (!person.employer_verified) continue;
    const companyPeople = peopleByCompany.get(person.company_id) ?? [];
    companyPeople.push(person);
    peopleByCompany.set(person.company_id, companyPeople);
  }
  const matchesByPersonId = new Map(matches.map((match) => [match.id, match]));
  const ranked: RankedCompany[] = companies.map((company, originalIndex) => {
    const verifiedPeople = peopleByCompany.get(company.id) ?? [];
    const scoredMatches = verifiedPeople.flatMap((person) => {
      const match = matchesByPersonId.get(person.id);
      return match ? [match] : [];
    });

    return {
      company,
      originalIndex,
      verifiedPeople,
      scoredMatches,
      bestDecisionPower: Math.max(
        0,
        ...verifiedPeople.map((person) => person.decision_power_score),
      ),
      bestMatchScore: Math.max(0, ...scoredMatches.map((match) => match.score)),
    };
  });

  ranked.sort((left, right) => {
    if (stage === "matches") {
      const scoredCompanyDifference =
        Number(right.scoredMatches.length > 0) -
        Number(left.scoredMatches.length > 0);
      if (scoredCompanyDifference !== 0) return scoredCompanyDifference;

      const matchScoreDifference = right.bestMatchScore - left.bestMatchScore;
      if (matchScoreDifference !== 0) return matchScoreDifference;

      const scoredPeopleDifference =
        right.scoredMatches.length - left.scoredMatches.length;
      if (scoredPeopleDifference !== 0) return scoredPeopleDifference;
    }

    const verifiedPeopleDifference =
      right.verifiedPeople.length - left.verifiedPeople.length;
    if (verifiedPeopleDifference !== 0) return verifiedPeopleDifference;

    const decisionPowerDifference =
      right.bestDecisionPower - left.bestDecisionPower;
    if (decisionPowerDifference !== 0) return decisionPowerDifference;

    return left.originalIndex - right.originalIndex;
  });

  return ranked.map(({ company }) => company);
}
