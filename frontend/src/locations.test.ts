import { describe, expect, it } from "vitest";

import { formatLocation, searchCapitals } from "./locations";

describe("searchCapitals", () => {
  it("suggests Helsinki for 'Hel'", () => {
    expect(searchCapitals("Hel").map(formatLocation)).toContain(
      "Helsinki, Finland",
    );
  });

  it("ignores case and diacritics", () => {
    expect(searchCapitals("bogota").map(formatLocation)).toEqual([
      "Bogotá, Colombia",
    ]);
  });

  it("falls back to country names", () => {
    expect(searchCapitals("finl").map(formatLocation)).toEqual([
      "Helsinki, Finland",
    ]);
  });

  it("returns nothing for very short queries", () => {
    expect(searchCapitals("h")).toEqual([]);
  });
});
