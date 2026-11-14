import type {
  Company,
  Person,
  PersonInsights,
  SearchInput,
  SearchJob,
} from "./types";

const COMPANIES: Company[] = [
  {
    id: "c1",
    name: "Aurora Robotics",
    url: "https://example.com/aurora",
    summary:
      "Warehouse automation startup, Series A, hiring across engineering.",
    sources: [
      {
        provider: "exa",
        url: "https://example.com/aurora",
        title: "Aurora Robotics",
        retrieved_at: "2026-11-14T00:00:00Z",
      },
    ],
  },
  {
    id: "c2",
    name: "Northwind Health",
    url: "https://example.com/northwind",
    summary: "Digital health scale-up expanding into the Nordics.",
    sources: [
      {
        provider: "exa",
        url: "https://example.com/northwind",
        title: "Northwind Health",
        retrieved_at: "2026-11-14T00:00:00Z",
      },
    ],
  },
  {
    id: "c3",
    name: "Kide Energy",
    url: "https://example.com/kide",
    summary: "Grid-scale battery software, just raised a seed round.",
    sources: [
      {
        provider: "exa",
        url: "https://example.com/kide",
        title: "Kide Energy",
        retrieved_at: "2026-11-14T00:00:00Z",
      },
    ],
  },
];

const PEOPLE: Person[] = [
  {
    id: "p1",
    company_id: "c1",
    company_name: "Aurora Robotics",
    name: "Alan Parson",
    title: "CTO",
    matched_job_title: "CTO",
    profile_url: "https://example.com/alan",
    evidence_url: "https://example.com/aurora/team",
    evidence_summary: "Leads Aurora Robotics' engineering organization.",
    decision_power_score: 80,
  },
  {
    id: "p2",
    company_id: "c1",
    company_name: "Aurora Robotics",
    name: "Matti Meikäläinen",
    title: "Product Owner",
    matched_job_title: "Product Owner",
    profile_url: "https://example.com/matti",
    evidence_url: "https://example.com/aurora/team",
    evidence_summary: "Owns product direction for Aurora's warehouse platform.",
    decision_power_score: 20,
  },
  {
    id: "p3",
    company_id: "c2",
    company_name: "Northwind Health",
    name: "Sofia Lind",
    title: "Head of Data",
    matched_job_title: "Head of Data",
    profile_url: "https://example.com/sofia",
    evidence_url: "https://example.com/northwind/team",
    evidence_summary:
      "Runs data strategy for Northwind Health's Nordic expansion.",
    decision_power_score: 60,
  },
  {
    id: "p4",
    company_id: "c2",
    company_name: "Northwind Health",
    title: "VP Engineering",
    matched_job_title: "VP Engineering",
    name: "Jari Korhonen",
    profile_url: "https://example.com/jari",
    evidence_url: "https://example.com/northwind/team",
    evidence_summary: "Leads Northwind Health's engineering teams.",
    decision_power_score: 80,
  },
  {
    id: "p5",
    company_id: "c3",
    company_name: "Kide Energy",
    name: "Emma Virtanen",
    title: "CEO",
    matched_job_title: "CEO",
    profile_url: "https://example.com/emma",
    evidence_url: "https://example.com/kide/team",
    evidence_summary: "Founder and chief executive of Kide Energy.",
    decision_power_score: 80,
  },
];

const started = new Map<string, number>();
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const mockApi = {
  async createSearch(_input: SearchInput): Promise<{ job_id: string }> {
    await wait(300);
    const id = crypto.randomUUID();
    started.set(id, Date.now());
    return { job_id: id };
  },
  async getSearch(jobId: string): Promise<SearchJob> {
    await wait(200);
    const elapsed = Date.now() - (started.get(jobId) ?? 0);
    if (elapsed < 1500)
      return {
        job_id: jobId,
        status: "finding_companies",
        area: "Helsinki, Finland",
        industry: "SaaS company",
        company_size: "small",
        companies: [],
        people: [],
        people_search_stats: {
          companies_searched: 0,
          companies_available: 0,
          request_count: 0,
          requests_completed: 0,
          requests_failed: 0,
          requests_in_flight: 0,
          batch_size: 20,
        },
      };
    return {
      job_id: jobId,
      status: "done",
      area: "Helsinki, Finland",
      industry: "SaaS company",
      company_size: "small",
      companies: COMPANIES,
      people: PEOPLE,
      people_search_stats: {
        companies_searched: 20,
        companies_available: 50,
        request_count: 80,
        requests_completed: 80,
        requests_failed: 0,
        requests_in_flight: 0,
        batch_size: 20,
      },
    };
  },
  async getPersonInsights(personId: string): Promise<PersonInsights> {
    await wait(600);
    return {
      person_id: personId,
      key_insights: [
        "Writes regularly about building small, senior teams",
        "Values open-source contributions over CVs",
        "Mention a concrete project — they reply to specifics",
      ],
      work_history: [
        "2021– Current role",
        "2017–2021 Senior Engineer, Supercell",
        "2014–2017 Developer, Reaktor",
      ],
      connections: [
        "Shared alumni network: Aalto University",
        "Both attended Slush 2025",
      ],
      hobbies: ["Trail running", "Sauna podcasts", "Board games"],
      education: ["M.Sc. Computer Science, Aalto University"],
    };
  },
};
