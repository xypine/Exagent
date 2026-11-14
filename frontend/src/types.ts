export type JobStatus = "queued" | "finding_companies" | "done" | "failed";

export type CompanySize = "startup" | "sme" | "large";

export interface SearchInput {
  area: string;
  industry: string;
  company_size: CompanySize;
}

export interface Source {
  provider: "exa";
  url: string;
  title?: string | null;
  retrieved_at: string;
}

export interface Person {
  id: string;
  name: string;
  title: string;
  url?: string;
  relevance?: string;
}

export interface Company {
  id: string;
  name: string;
  url: string;
  summary: string;
  sources: Source[];
}

export interface SearchJob {
  job_id: string;
  status: JobStatus;
  error?: string | null;
  companies: Company[];
}

export interface PersonInsights {
  person_id: string;
  key_insights: string[];
  work_history: string[];
  connections: string[];
  hobbies: string[];
  education: string[];
}
