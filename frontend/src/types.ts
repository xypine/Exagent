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
  reported_company_name: string;
  employer_verified: boolean;
  matched_job_title: string;
  profile_url: string;
  evidence_url: string;
  evidence_summary: string;
  decision_power_score: number;
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

export type PersonResearchStatus =
  | "not_started"
  | "queued"
  | "researching"
  | "done"
  | "failed";

export interface WorkHistory {
  company_name: string;
  role: string;
  source_url: string;
}

export interface Education {
  school: string;
  major: string | null;
  source_url: string;
}

export interface VolunteerExperience {
  organization: string;
  role: string | null;
  source_url: string;
}

export interface PersonResearch {
  person_id: string;
  status: PersonResearchStatus;
  work_history: WorkHistory[];
  education: Education[];
  volunteer_experience: VolunteerExperience[];
  error?: string | null;
}

export interface MatchBreakdown {
  decision_power: number;
  background_fit: number | null;
  shared_ground: number | null;
}

export interface MatchEvidence {
  factor: "decision_power" | "background_fit" | "shared_ground";
  fact: string;
  source_label: string;
  source_url?: string | null;
}

export interface PersonMatch {
  id: string;
  score: number;
  confidence: "high" | "medium" | "low";
  breakdown: MatchBreakdown;
  reasoning: string;
  outreach_approaches: string[];
  missing_info: string[];
  evidence: MatchEvidence[];
}

export type MatchRunStatus =
  | "queued"
  | "researching"
  | "matching"
  | "done"
  | "failed";

export interface MatchRun {
  id: string;
  status: MatchRunStatus;
  candidate_ids?: string[];
  candidate_count: number;
  completed_count: number;
  results: PersonMatch[];
  error?: string | null;
  completed_at?: string | null;
}
