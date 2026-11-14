export type JobStatus =
  | "queued"
  | "finding_companies"
  | "finding_people"
  | "done"
  | "failed";

export type CompanySize = "small" | "medium" | "large";

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
  company_id: string;
  company_name: string;
  matched_job_title: string;
  profile_url: string;
  evidence_url: string;
  evidence_summary: string;
}

export interface PeopleSearchStats {
  companies_searched: number;
  companies_available: number;
  request_count: number;
  requests_completed: number;
  requests_failed: number;
  requests_in_flight: number;
  batch_size: number;
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
  area: string;
  industry: string;
  company_size: CompanySize | null;
  error?: string | null;
  companies: Company[];
  people: Person[];
  people_error?: string | null;
  people_search_stats: PeopleSearchStats;
}

export interface PersonInsights {
  person_id: string;
  key_insights: string[];
  work_history: string[];
  connections: string[];
  hobbies: string[];
  education: string[];
}
