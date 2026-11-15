import { fireEvent, render, screen } from "@solidjs/testing-library";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getMatchRun,
  getPersonResearch,
  getSearch,
  getStoredProfile,
  startMatchRun,
  startPersonResearch,
  storeProfile,
} from "../api";
import type { SearchJob } from "../types";
import { Results } from "./Results";

vi.mock("../api", () => ({
  getSearch: vi.fn(),
  getPersonResearch: vi.fn(),
  startPersonResearch: vi.fn(),
  searchMorePeople: vi.fn(),
  getStoredProfile: vi.fn(),
  storeProfile: vi.fn(),
  startMatchRun: vi.fn(),
  getMatchRun: vi.fn(),
}));

const JOB: SearchJob = {
  job_id: "job-1",
  status: "done",
  area: "Helsinki",
  industry: "SaaS company",
  company_size: "small",
  companies: [
    {
      id: "company-1",
      name: "Northstar Labs",
      url: "https://example.com/northstar",
      summary: "Climate software company.",
      sources: [],
    },
  ],
  people: [
    {
      id: "person-1",
      company_id: "company-1",
      company_name: "Northstar Labs",
      name: "Maya Chen",
      title: "VP Product",
      matched_job_title: "VP Product",
      profile_url: "https://example.com/maya",
      evidence_url: "https://example.com/northstar/team",
      evidence_summary: "Leads product at Northstar Labs.",
      decision_power_score: 80,
    },
  ],
  people_search_stats: {
    companies_searched: 1,
    companies_available: 1,
    request_count: 1,
    requests_completed: 1,
    requests_failed: 0,
    requests_in_flight: 0,
    batch_size: 20,
  },
};

describe("Results", () => {
  beforeEach(() => {
    vi.mocked(getSearch).mockResolvedValue(JOB);
    vi.mocked(getPersonResearch).mockResolvedValue({
      person_id: "person-1",
      status: "done",
      work_history: [],
      education: [],
      volunteer_experience: [],
    });
    vi.mocked(startPersonResearch).mockResolvedValue({
      person_id: "person-1",
      status: "queued",
      work_history: [],
      education: [],
      volunteer_experience: [],
    });
    vi.mocked(getStoredProfile).mockReturnValue("");
    vi.mocked(startMatchRun).mockResolvedValue({
      id: "match-1",
      status: "done",
      candidate_count: 1,
      completed_count: 1,
      results: [],
    });
    vi.mocked(getMatchRun).mockResolvedValue({
      id: "match-1",
      status: "done",
      candidate_count: 1,
      completed_count: 1,
      results: [],
    });
    vi.mocked(storeProfile).mockReset();
  });

  it("shows a compact person row and explains its score in the detail dialog", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(() => (
      <QueryClientProvider client={queryClient}>
        <Results jobId="job-1" onReset={() => {}} />
      </QueryClientProvider>
    ));

    const person = await screen.findByRole("button", {
      name: "Maya Chen, VP Product, score 80",
    });
    expect(screen.getByText("Key people")).not.toBeNull();
    expect(screen.queryByText("Climate software company.")).toBeNull();

    fireEvent.click(person);

    expect(
      await screen.findByRole("dialog", { name: "Maya Chen details" }),
    ).not.toBeNull();
    expect(screen.getByText("80 · Very high")).not.toBeNull();
    expect(screen.getByText("Leads product at Northstar Labs.")).not.toBeNull();
  });

  it("keeps the match-profile form collapsed until requested", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(() => (
      <QueryClientProvider client={queryClient}>
        <Results jobId="job-1" onReset={() => {}} />
      </QueryClientProvider>
    ));

    const toggle = await screen.findByRole("button", {
      name: "Expand Sharpen your matches",
    });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(toggle);

    expect(
      screen.queryByRole("button", { name: "Expand Sharpen your matches" }),
    ).toBeNull();
    expect(screen.getByRole("button", { name: "Hide" })).not.toBeNull();
  });
});
