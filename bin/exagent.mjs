#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_API_URL = "http://localhost:8000";
const DEFAULT_STATE_FILE = ".exagent-cli.json";
// The local API's default limit is 30 requests per 60 seconds.  A three-second
// polling cadence leaves room for the command that started the operation and
// other requests made by the same anonymous client.
const DEFAULT_INTERVAL_MS = 3_000;
const DEFAULT_TIMEOUT_MS = 120_000;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const HELP = `Usage: pnpm agent -- [options] <command>

Test the running Exagent API through the same /api/v1 endpoints as the frontend.

Options:
  --api-url <url>       API origin (default: ${DEFAULT_API_URL})
  --client-id <uuid>    Reuse a specific anonymous client identity
  --state-file <path>   Client identity state (default: ${DEFAULT_STATE_FILE})
  --json                Print the API response as JSON
  --wait                Poll an asynchronous operation until it completes
  --interval <ms>       Poll interval with --wait (default: ${DEFAULT_INTERVAL_MS})
  --timeout <ms>        Poll timeout with --wait (default: ${DEFAULT_TIMEOUT_MS})
  --help                Show this help

Commands:
  health
  client
  search create --area <area> --industry <industry> --company-size <small|medium|large>
  search get <job-id>
  search more-companies <job-id>
  search more-people <job-id>
  person get <job-id> <person-id>
  person research <job-id> <person-id>
  match start <job-id> [--profile <text> | --profile-file <path>]
  match get <job-id> <run-id>

Search responses include employer_verified and reported_company_name for each
person. Use --json to inspect unverified people.

Examples:
  pnpm agent -- health
  pnpm agent -- client
  pnpm agent -- search create --area Helsinki --industry "SaaS company" --company-size small --wait
  pnpm agent -- person research <job-id> <person-id> --wait --json
  pnpm agent -- match start <job-id> --profile-file ./profile.txt --wait`;

export function parseArguments(argv) {
  // pnpm forwards the script separator as a positional argument, so support the
  // documented `pnpm agent -- <command>` invocation as well as direct Node use.
  const argumentsToParse = argv[0] === "--" ? argv.slice(1) : argv;
  const options = {
    apiUrl: DEFAULT_API_URL,
    clientId: process.env.EXAGENT_CLIENT_ID,
    stateFile: DEFAULT_STATE_FILE,
    json: false,
    wait: false,
    interval: DEFAULT_INTERVAL_MS,
    timeout: DEFAULT_TIMEOUT_MS,
  };
  const positionals = [];

  for (let index = 0; index < argumentsToParse.length; index += 1) {
    const argument = argumentsToParse[index];
    if (!argument.startsWith("--")) {
      positionals.push(argument);
      continue;
    }

    const option = argument.slice(2);
    if (option === "help") return { help: true };
    if (option === "json" || option === "wait") {
      options[option] = true;
      continue;
    }

    const value = argumentsToParse[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`--${option} requires a value.`);
    }
    index += 1;

    if (option === "api-url") options.apiUrl = value;
    else if (option === "client-id") options.clientId = value;
    else if (option === "state-file") options.stateFile = value;
    else if (option === "interval") options.interval = parsePositiveInteger(option, value);
    else if (option === "timeout") options.timeout = parsePositiveInteger(option, value);
    else if (option === "area" || option === "industry" || option === "company-size") {
      options[option] = value;
    } else if (option === "profile" || option === "profile-file") {
      options[option] = value;
    } else {
      throw new Error(`Unknown option --${option}.`);
    }
  }

  return { options, positionals };
}

function parsePositiveInteger(option, value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0 || String(parsed) !== value) {
    throw new Error(`--${option} must be a positive integer.`);
  }
  return parsed;
}

export async function getClientId({ clientId, stateFile, cwd = process.cwd() }) {
  if (clientId !== undefined) {
    validateClientId(clientId);
    return clientId;
  }

  const statePath = resolve(cwd, stateFile);
  try {
    const state = JSON.parse(await readFile(statePath, "utf8"));
    if (typeof state.client_id === "string" && UUID_RE.test(state.client_id)) {
      return state.client_id;
    }
  } catch (error) {
    if (error.code !== "ENOENT" && error.name !== "SyntaxError") throw error;
  }

  const generated = randomUUID();
  await writeFile(statePath, `${JSON.stringify({ client_id: generated }, null, 2)}\n`, {
    mode: 0o600,
  });
  return generated;
}

function validateClientId(clientId) {
  if (!UUID_RE.test(clientId)) {
    throw new Error("--client-id must be a UUID.");
  }
}

export function createApiClient({ apiUrl, clientId, fetchImpl = fetch }) {
  const origin = apiUrl.replace(/\/$/, "");

  async function request(path, init = {}) {
    const response = await fetchImpl(`${origin}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": clientId,
        ...init.headers,
      },
    });
    const body = await response.text();
    const data = body === "" ? null : parseResponseBody(body);
    if (!response.ok) {
      const detail =
        data !== null && typeof data === "object" && "detail" in data
          ? `: ${String(data.detail)}`
          : "";
      throw new Error(`Request failed (${response.status})${detail}`);
    }
    return data;
  }

  return {
    getHealth: () => request("/api/health"),
    getClient: () => request("/api/v1/client"),
    createSearch: (input) =>
      request("/api/v1/searches", { method: "POST", body: JSON.stringify(input) }),
    getSearch: (jobId) => request(`/api/v1/searches/${encodeURIComponent(jobId)}`),
    searchMoreCompanies: (jobId) =>
      request(`/api/v1/searches/${encodeURIComponent(jobId)}/companies`, { method: "POST" }),
    searchMorePeople: (jobId) =>
      request(`/api/v1/searches/${encodeURIComponent(jobId)}/people`, { method: "POST" }),
    getPersonResearch: (jobId, personId) =>
      request(
        `/api/v1/searches/${encodeURIComponent(jobId)}/people/${encodeURIComponent(personId)}/research`,
      ),
    startPersonResearch: (jobId, personId) =>
      request(
        `/api/v1/searches/${encodeURIComponent(jobId)}/people/${encodeURIComponent(personId)}/research`,
        { method: "POST" },
      ),
    startMatchRun: (jobId, profile) =>
      request(`/api/v1/searches/${encodeURIComponent(jobId)}/matches`, {
        method: "POST",
        body: JSON.stringify({ profile }),
      }),
    getMatchRun: (jobId, runId) =>
      request(
        `/api/v1/searches/${encodeURIComponent(jobId)}/matches/${encodeURIComponent(runId)}`,
      ),
  };
}

function parseResponseBody(body) {
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

async function waitForCompletion(fetchStatus, isComplete, options) {
  const startedAt = Date.now();
  let response = await fetchStatus();
  while (!isComplete(response.status)) {
    if (Date.now() - startedAt >= options.timeout) {
      throw new Error(`Timed out waiting for ${response.status}.`);
    }
    await sleep(options.interval);
    response = await fetchStatus();
  }
  return response;
}

async function waitForOperationCompletion(operationResponse, fetchStatus, isComplete, options) {
  // A pagination request returns the job as it was queued.  Use that response
  // first: a terminal response means no new background work was started, while
  // an in-progress response must be followed until the job is terminal.
  if (isComplete(operationResponse.status)) return operationResponse;
  return waitForCompletion(fetchStatus, isComplete, options);
}

const sleep = (milliseconds) => new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));
const searchComplete = (status) => status === "done" || status === "failed";
const researchComplete = (status) => status === "done" || status === "failed";
const matchComplete = (status) => status === "done" || status === "failed";

export async function run(argv, dependencies = {}) {
  const parsed = parseArguments(argv);
  if (parsed.help || parsed.positionals.length === 0) {
    return { help: true };
  }

  const { options, positionals } = parsed;
  if (options.profile !== undefined && options["profile-file"] !== undefined) {
    throw new Error("Use either --profile or --profile-file, not both.");
  }
  const clientId = await (dependencies.getClientId ?? getClientId)(options);
  const api = (dependencies.createApiClient ?? createApiClient)({
    apiUrl: options.apiUrl,
    clientId,
    fetchImpl: dependencies.fetchImpl,
  });
  const [resource, action, ...ids] = positionals;
  let response;

  if (resource === "health" && action === undefined) {
    response = await api.getHealth();
  } else if (resource === "client" && action === undefined) {
    response = await api.getClient();
  } else if (resource === "search" && action === "create") {
    const input = searchInput(options);
    response = await api.createSearch(input);
    if (options.wait) {
      response = await waitForCompletion(
        () => api.getSearch(response.job_id),
        searchComplete,
        options,
      );
    }
  } else if (resource === "search" && action === "get" && ids.length === 1) {
    response = await api.getSearch(ids[0]);
  } else if (resource === "search" && action === "more-companies" && ids.length === 1) {
    response = await api.searchMoreCompanies(ids[0]);
    if (options.wait) {
      response = await waitForOperationCompletion(
        response,
        () => api.getSearch(ids[0]),
        searchComplete,
        options,
      );
    }
  } else if (resource === "search" && action === "more-people" && ids.length === 1) {
    response = await api.searchMorePeople(ids[0]);
    if (options.wait) {
      response = await waitForOperationCompletion(
        response,
        () => api.getSearch(ids[0]),
        searchComplete,
        options,
      );
    }
  } else if (resource === "person" && action === "get" && ids.length === 2) {
    response = await api.getPersonResearch(ids[0], ids[1]);
  } else if (resource === "person" && action === "research" && ids.length === 2) {
    response = await api.startPersonResearch(ids[0], ids[1]);
    if (options.wait) {
      response = await waitForCompletion(
        () => api.getPersonResearch(ids[0], ids[1]),
        researchComplete,
        options,
      );
    }
  } else if (resource === "match" && action === "start" && ids.length === 1) {
    const profile = await getProfile(options);
    response = await api.startMatchRun(ids[0], profile);
    if (options.wait) {
      response = await waitForCompletion(
        () => api.getMatchRun(ids[0], response.id),
        matchComplete,
        options,
      );
    }
  } else if (resource === "match" && action === "get" && ids.length === 2) {
    response = await api.getMatchRun(ids[0], ids[1]);
  } else {
    throw new Error("Unknown command. Run with --help to see supported commands.");
  }

  return { response, json: options.json };
}

function searchInput(options) {
  const required = ["area", "industry", "company-size"];
  for (const key of required) {
    if (options[key] === undefined) throw new Error(`search create requires --${key}.`);
  }
  if (!["small", "medium", "large"].includes(options["company-size"])) {
    throw new Error("--company-size must be small, medium, or large.");
  }
  return {
    area: options.area,
    industry: options.industry,
    company_size: options["company-size"],
  };
}

async function getProfile(options) {
  if (options["profile-file"] !== undefined) {
    return readFile(resolve(options["profile-file"]), "utf8");
  }
  return options.profile ?? "";
}

export function formatResponse(response) {
  if (response === null) return "No response body.";
  if (typeof response !== "object") return String(response);
  const status = typeof response.status === "string" ? ` (${response.status})` : "";
  if (typeof response.job_id === "string") {
    const people = Array.isArray(response.people) ? response.people : [];
    const unverified = people.filter((person) => person?.employer_verified === false).length;
    const verified = people.length - unverified;
    const peopleSummary =
      people.length === 0
        ? ""
        : `\nPeople: ${verified} verified${unverified ? `, ${unverified} unverified` : ""}`;
    return `Search ${response.job_id}${status}${peopleSummary}`;
  }
  if (typeof response.person_id === "string") return `Person research ${response.person_id}${status}`;
  if (typeof response.id === "string") return `Match run ${response.id}${status}`;
  if (typeof response.client_id === "string") return `Client ${response.client_id}`;
  if (typeof response.status === "string") return `API ${response.status}`;
  return JSON.stringify(response, null, 2);
}

async function main() {
  try {
    const result = await run(process.argv.slice(2));
    if (result.help) {
      console.log(HELP);
      return;
    }
    console.log(result.json ? JSON.stringify(result.response, null, 2) : formatResponse(result.response));
  } catch (error) {
    console.error(`exagent: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
