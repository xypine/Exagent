import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
      reported_company_name: "Northstar Labs",
      employer_verified: true,
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
  afterEach(cleanup);

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

  it("shows score factors and evidence gaps for a match", async () => {
    const match = {
      id: "person-1",
      score: 72,
      confidence: "medium" as const,
      breakdown: {
        decision_power: 32,
        background_fit: 28,
        shared_ground: 12,
      },
      reasoning: "Strong hiring influence and relevant company work.",
      outreach_angle: "Ask about the product team's upcoming work.",
      missing_info: ["No public evidence of a shared background."],
    };
    vi.mocked(startMatchRun).mockResolvedValue({
      id: "match-1",
      status: "done",
      candidate_count: 1,
      completed_count: 1,
      results: [match],
    });
    vi.mocked(getMatchRun).mockResolvedValue({
      id: "match-1",
      status: "done",
      candidate_count: 1,
      completed_count: 1,
      results: [match],
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(() => (
      <QueryClientProvider client={queryClient}>
        <Results jobId="job-1" onReset={() => {}} />
      </QueryClientProvider>
    ));

    expect(await screen.findByText("Score factors")).not.toBeNull();
    expect(screen.getByText("32/40")).not.toBeNull();
    expect(screen.getByText("28/40")).not.toBeNull();
    expect(screen.getByText("12/20")).not.toBeNull();
    expect(screen.getByText("Evidence gaps")).not.toBeNull();
    expect(
      screen.getByText("No public evidence of a shared background."),
    ).not.toBeNull();
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

  it("states that the company search is complete", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(() => (
      <QueryClientProvider client={queryClient}>
        <Results jobId="job-1" onReset={() => {}} />
      </QueryClientProvider>
    ));

    expect(
      await screen.findByText(
        "Company search complete — no more companies to load.",
      ),
    ).not.toBeNull();
  });

  it("fills every progress block when the search is complete", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(() => (
      <QueryClientProvider client={queryClient}>
        <Results jobId="job-1" onReset={() => {}} />
      </QueryClientProvider>
    ));

    await screen.findByText(
      "Company search complete — no more companies to load.",
    );

    for (const label of ["Finding companies", "Finding key people", "Done"]) {
      const block = screen.getByText(label).closest("li");
      expect(block?.classList.contains("bg-star/80")).toBe(true);
      expect(block?.classList.contains("text-signal-ink")).toBe(true);
    }
  });

  it("fills completed progress blocks but not the active one", async () => {
    vi.mocked(getSearch).mockResolvedValue({
      ...JOB,
      status: "finding_people",
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(() => (
      <QueryClientProvider client={queryClient}>
        <Results jobId="job-1" onReset={() => {}} />
      </QueryClientProvider>
    ));

    await screen.findByText(
      "Companies found — researching key people in the background.",
    );

    const companies = screen.getByText("Finding companies").closest("li");
    const people = screen.getByText("Finding key people").closest("li");
    const done = screen.getByText("Done").closest("li");

    expect(companies?.classList.contains("bg-star/80")).toBe(true);
    expect(people?.classList.contains("bg-star/80")).toBe(false);
    expect(people?.classList.contains("border-star")).toBe(true);
    expect(done?.classList.contains("bg-star/80")).toBe(false);
  });

  it("hides people with an unverified employer until requested", async () => {
    vi.mocked(getSearch).mockResolvedValue({
      ...JOB,
      people: [
        ...JOB.people,
        {
          ...JOB.people[0],
          id: "person-unverified",
          name: "Alex Example",
          reported_company_name: "Different Company",
          employer_verified: false,
        },
      ],
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(() => (
      <QueryClientProvider client={queryClient}>
        <Results jobId="job-1" onReset={() => {}} />
      </QueryClientProvider>
    ));

    expect(screen.queryByText("Alex Example")).toBeNull();
    fireEvent.click(
      await screen.findByRole("button", { name: "Show 1 unverified employer" }),
    );
    expect(
      await screen.findByText("Unverified employer: Different Company"),
    ).not.toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Alex Example, VP Product, score 80" })
        .hasAttribute("disabled"),
    ).toBe(true);
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
