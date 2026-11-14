import { describe, expect, it } from "vitest";

import { INDUSTRIES, searchIndustries } from "./industries";

describe("searchIndustries", () => {
  it("derives readable labels from job_titles.json categories", () => {
    expect(INDUSTRIES).toContain("SaaS company");
    expect(INDUSTRIES).toContain("Investment banking");
  });

  it("matches the start of any word, case-insensitively", () => {
    expect(searchIndustries("saa").map((s) => s.value)).toEqual([
      "SaaS company",
    ]);
    expect(searchIndustries("COMP").map((s) => s.value)).toEqual([
      "SaaS company",
    ]);
  });

  it("returns all industries for an empty query", () => {
    expect(searchIndustries("").map((s) => s.value)).toEqual(INDUSTRIES);
  });
});
