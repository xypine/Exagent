import type { Company, PersonInsights, SearchInput, SearchJob } from "./types";

const COMPANIES: Company[] = [
  {
    id: "c1",
    name: "Aurora Robotics",
    url: "https://example.com/aurora",
    summary:
      "Warehouse automation startup, Series A, hiring across engineering.",
    people: [
      {
        id: "p1",
        name: "Alan Parson",
        title: "CTO",
        relevance: "Owns the engineering hiring plan",
      },
      {
        id: "p2",
        name: "Matti Meikäläinen",
        title: "Product Owner",
        relevance: "Posted about growing the platform team",
      },
    ],
  },
  {
    id: "c2",
    name: "Northwind Health",
    url: "https://example.com/northwind",
    summary: "Digital health scale-up expanding into the Nordics.",
    people: [
      {
        id: "p3",
        name: "Sofia Lind",
        title: "Head of Data",
        relevance: "Recently spoke about ML in diagnostics",
      },
      {
        id: "p4",
        name: "Jari Korhonen",
        title: "VP Engineering",
        relevance: "Ex-founder, mentors junior devs",
      },
    ],
  },
  {
    id: "c3",
    name: "Kide Energy",
    url: "https://example.com/kide",
    summary: "Grid-scale battery software, just raised a seed round.",
    people: [
      {
        id: "p5",
        name: "Emma Virtanen",
        title: "CEO",
        relevance: "Hires the first 10 people personally",
      },
    ],
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
      return { job_id: jobId, status: "finding_companies", companies: [] };
    if (elapsed < 3500)
      return {
        job_id: jobId,
        status: "finding_people",
        companies: COMPANIES.map((c) => ({ ...c, people: [] })),
      };
    return { job_id: jobId, status: "done", companies: COMPANIES };
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
