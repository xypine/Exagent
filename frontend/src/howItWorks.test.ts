import { describe, expect, it } from "vitest";

import { confidenceFor, contributions, matchScore } from "./howItWorks";

describe("matchScore", () => {
  it("weights decision power 40 %, background fit 40 %, common ground 20 %", () => {
    expect(matchScore({ decision: 100, fit: 0, shared: 0 }, true)).toBe(40);
    expect(matchScore({ decision: 0, fit: 100, shared: 0 }, true)).toBe(40);
    expect(matchScore({ decision: 0, fit: 0, shared: 100 }, true)).toBe(20);
    expect(matchScore({ decision: 82, fit: 72, shared: 15 }, true)).toBe(65);
  });

  it("counts only decision power when the user wrote no profile", () => {
    expect(matchScore({ decision: 82, fit: 72, shared: 15 }, false)).toBe(82);
    expect(contributions({ decision: 82, fit: 72, shared: 15 }, false)).toEqual(
      {
        decision: 82,
        fit: 0,
        shared: 0,
      },
    );
  });

  it("stays within 0–100", () => {
    expect(matchScore({ decision: 100, fit: 100, shared: 100 }, true)).toBe(
      100,
    );
    expect(matchScore({ decision: 0, fit: 0, shared: 0 }, true)).toBe(0);
  });
});

describe("confidenceFor", () => {
  it("reflects how much was found, not match quality", () => {
    expect(confidenceFor(1)).toBe("low");
    expect(confidenceFor(3)).toBe("medium");
    expect(confidenceFor(5)).toBe("high");
  });
});
