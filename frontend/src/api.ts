import { mockApi } from "./mocks";
import type { PersonInsights, SearchInput, SearchJob } from "./types";

const CLIENT_ID_STORAGE_KEY = "prospecting.client-id";
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

/** Key insights for one person (work history, connections, hobbies, education). */
export async function getPersonInsights(
  personId: string,
): Promise<PersonInsights> {
  if (USE_MOCKS) return mockApi.getPersonInsights(personId);
  return request(`/api/v1/people/${encodeURIComponent(personId)}/insights`);
}
