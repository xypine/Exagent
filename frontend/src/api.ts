import { mockApi } from "./mocks";
import type { MatchRun, PersonResearch, SearchInput, SearchJob } from "./types";

const CLIENT_ID_STORAGE_KEY = "prospecting.client-id";
const PROFILE_STORAGE_KEY = "prospecting.profile";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Set VITE_USE_MOCKS=true to demo the UI without the backend. */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

export function getClientId(): string {
  const existingId = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY);
  if (existingId !== null && UUID_RE.test(existingId)) {
    return existingId;
  }

  const clientId = crypto.randomUUID();
  window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId);
  return clientId;
}

export function getStoredProfile(): string {
  return window.localStorage.getItem(PROFILE_STORAGE_KEY) ?? "";
}

export function storeProfile(profile: string): void {
  window.localStorage.setItem(PROFILE_STORAGE_KEY, profile);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Client-Id": getClientId(),
      ...init.headers,
    },
  });
  if (response.status === 429) {
    throw new Error("Slow down a bit — too many requests. Try again shortly.");
  }
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export async function getClient(): Promise<{ client_id: string }> {
  if (USE_MOCKS) return { client_id: getClientId() };
  return request("/api/v1/client");
}

/** Request chain step 1: create job -> job id. */
export async function createSearch(
  input: SearchInput,
): Promise<{ job_id: string }> {
  if (USE_MOCKS) return mockApi.createSearch(input);
  return request("/api/v1/searches", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Request chain step 2: track job (polled until done/failed). */
export async function getSearch(jobId: string): Promise<SearchJob> {
  if (USE_MOCKS) return mockApi.getSearch(jobId);
  return request(`/api/v1/searches/${encodeURIComponent(jobId)}`);
}

/** Start the next capped batch of automatic people research for a completed search. */
export async function searchMorePeople(jobId: string): Promise<SearchJob> {
  return request(`/api/v1/searches/${encodeURIComponent(jobId)}/people`, {
    method: "POST",
  });
}

export async function getPersonResearch(
  jobId: string,
  personId: string,
): Promise<PersonResearch> {
  if (USE_MOCKS) return mockApi.getPersonResearch(jobId, personId);
  return request(
    `/api/v1/searches/${encodeURIComponent(jobId)}/people/${encodeURIComponent(personId)}/research`,
  );
}

export async function startPersonResearch(
  jobId: string,
  personId: string,
): Promise<PersonResearch> {
  if (USE_MOCKS) return mockApi.startPersonResearch(jobId, personId);
  return request(
    `/api/v1/searches/${encodeURIComponent(jobId)}/people/${encodeURIComponent(personId)}/research`,
    { method: "POST" },
  );
}

export async function startMatchRun(
  jobId: string,
  profile: string,
): Promise<MatchRun> {
  if (USE_MOCKS) return mockApi.startMatchRun(jobId, profile);
  return request(`/api/v1/searches/${encodeURIComponent(jobId)}/matches`, {
    method: "POST",
    body: JSON.stringify({ profile }),
  });
}

export async function getMatchRun(
  jobId: string,
  runId: string,
): Promise<MatchRun> {
  if (USE_MOCKS) return mockApi.getMatchRun(jobId, runId);
  return request(
    `/api/v1/searches/${encodeURIComponent(jobId)}/matches/${encodeURIComponent(runId)}`,
  );
}
