export type JobStatus =
  | "queued"
  | "finding_companies"
  | "finding_people"
  | "done"
  | "failed";

export interface SearchInput {
  location: string;
  industry: string;
  details: string;
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
  url?: string;
  summary?: string;
  people: Person[];
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
