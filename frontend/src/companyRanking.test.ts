import { describe, expect, it } from "vitest";

import { rankCompanies } from "./companyRanking";
import type { Company, Person, PersonMatch } from "./types";

const companies: Company[] = [
  {
    id: "exa-first",
    name: "Exa first",
    url: "https://first.example",
    summary: "",
    sources: [],
  },
  {
    id: "scored-low",
    name: "Scored low",
    url: "https://low.example",
    summary: "",
    sources: [],
  },
  {
    id: "scored-high",
    name: "Scored high",
    url: "https://high.example",
    summary: "",
    sources: [],
  },
  {
    id: "scored-high-more",
    name: "Scored high, more",
    url: "https://more.example",
    summary: "",
    sources: [],
  },
];

function person(
  id: string,
  companyId: string,
  decisionPowerScore: number,
): Person {
  return {
    id,
    company_id: companyId,
    company_name: companyId,
    reported_company_name: companyId,
    employer_verified: true,
    name: id,
    title: "Director",
    matched_job_title: "Director",
    profile_url: "https://person.example",
    evidence_url: "https://person.example/evidence",
    evidence_summary: "Evidence",
    decision_power_score: decisionPowerScore,
  };
}

function match(id: string, score: number): PersonMatch {
  return {
    id,
    score,
    confidence: "high",
    breakdown: { decision_power: 40, background_fit: 40, shared_ground: 20 },
    reasoning: "Good fit",
    outreach_angle: "Reach out",
    missing_info: [],
    evidence: [],
  };
}

const people = [
  person("first-1", "exa-first", 80),
  person("low-1", "scored-low", 80),
  person("high-1", "scored-high", 60),
  person("more-1", "scored-high-more", 60),
  person("more-2", "scored-high-more", 40),
];

describe("rankCompanies", () => {
  it("keeps Exa order while enrichment is incomplete", () => {
    expect(
      rankCompanies(companies, people, [], "exa").map((company) => company.id),
    ).toEqual(["exa-first", "scored-low", "scored-high", "scored-high-more"]);
  });

  it("ranks completed people research by verified contacts then hiring influence", () => {
    expect(
      rankCompanies(companies, people, [], "people").map(
        (company) => company.id,
      ),
    ).toEqual(["scored-high-more", "exa-first", "scored-low", "scored-high"]);
  });

  it("puts scored companies first, then uses final score and scored-contact count", () => {
    expect(
      rankCompanies(
        companies,
        people,
        [
          match("low-1", 60),
          match("high-1", 90),
          match("more-1", 90),
          match("more-2", 80),
        ],
        "matches",
      ).map((company) => company.id),
    ).toEqual(["scored-high-more", "scored-high", "scored-low", "exa-first"]);
  });
});
