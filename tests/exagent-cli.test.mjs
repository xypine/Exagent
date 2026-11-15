import assert from "node:assert/strict";
import test from "node:test";

import { createApiClient, parseArguments, run } from "../bin/exagent.mjs";

const CLIENT_ID = "11111111-1111-4111-8111-111111111111";

test("API client uses the frontend's API paths, payloads, and client header", async () => {
  const calls = [];
  const api = createApiClient({
    apiUrl: "http://localhost:8000/",
    clientId: CLIENT_ID,
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ job_id: "job-1", status: "queued" }), { status: 202 });
    },
  });

  await api.getHealth();
  await api.getClient();
  await api.createSearch({ area: "Helsinki", industry: "SaaS", company_size: "small" });
  await api.getSearch("job id");
  await api.searchMoreCompanies("job id");
  await api.searchMorePeople("job id");
  await api.getPersonResearch("job id", "person/id");
  await api.startPersonResearch("job id", "person/id");
  await api.startMatchRun("job id", "Profile text");
  await api.getMatchRun("job id", "run/id");

  assert.deepEqual(
    calls.map(({ url, init }) => ({ url, method: init.method, body: init.body })),
    [
      {
        url: "http://localhost:8000/api/health",
        method: undefined,
        body: undefined,
      },
      {
        url: "http://localhost:8000/api/v1/client",
        method: undefined,
        body: undefined,
      },
      {
        url: "http://localhost:8000/api/v1/searches",
        method: "POST",
        body: '{"area":"Helsinki","industry":"SaaS","company_size":"small"}',
      },
      {
        url: "http://localhost:8000/api/v1/searches/job%20id",
        method: undefined,
        body: undefined,
      },
      {
        url: "http://localhost:8000/api/v1/searches/job%20id/companies",
        method: "POST",
        body: undefined,
      },
      {
        url: "http://localhost:8000/api/v1/searches/job%20id/people",
        method: "POST",
        body: undefined,
      },
      {
        url: "http://localhost:8000/api/v1/searches/job%20id/people/person%2Fid/research",
        method: undefined,
        body: undefined,
      },
      {
        url: "http://localhost:8000/api/v1/searches/job%20id/people/person%2Fid/research",
        method: "POST",
        body: undefined,
      },
      {
        url: "http://localhost:8000/api/v1/searches/job%20id/matches",
        method: "POST",
        body: '{"profile":"Profile text"}',
      },
      {
        url: "http://localhost:8000/api/v1/searches/job%20id/matches/run%2Fid",
        method: undefined,
        body: undefined,
      },
    ],
  );
  assert.ok(calls.every(({ init }) => init.headers["X-Client-Id"] === CLIENT_ID));
  assert.ok(calls.every(({ init }) => init.headers["Content-Type"] === "application/json"));
});

test("search create sends the same input shape and can poll its job", async () => {
  const requests = [];
  const responses = [
    { job_id: "job-1", status: "queued" },
    { job_id: "job-1", status: "finding_people" },
    { job_id: "job-1", status: "done", people: [] },
  ];
  const result = await run(
    [
      "search",
      "create",
      "--area",
      "Helsinki",
      "--industry",
      "SaaS",
      "--company-size",
      "small",
      "--wait",
      "--interval",
      "1",
    ],
    {
      getClientId: async () => CLIENT_ID,
      fetchImpl: async (url, init) => {
        requests.push({ url, init });
        return new Response(JSON.stringify(responses.shift()), { status: 200 });
      },
    },
  );

  assert.deepEqual(result.response, { job_id: "job-1", status: "done", people: [] });
  assert.equal(requests.length, 3);
  assert.equal(requests[0].init.body, '{"area":"Helsinki","industry":"SaaS","company_size":"small"}');
  assert.equal(requests[1].url, "http://localhost:8000/api/v1/searches/job-1");
});

test("search more-companies can poll the expanded company search", async () => {
  const requests = [];
  const responses = [
    { job_id: "job-1", status: "finding_companies" },
    { job_id: "job-1", status: "done", companies: [] },
  ];
  const result = await run(
    ["search", "more-companies", "job-1", "--wait", "--interval", "1"],
    {
      getClientId: async () => CLIENT_ID,
      fetchImpl: async (url, init) => {
        requests.push({ url, init });
        return new Response(JSON.stringify(responses.shift()), { status: 200 });
      },
    },
  );

  assert.deepEqual(result.response, { job_id: "job-1", status: "done", companies: [] });
  assert.equal(requests[0].url, "http://localhost:8000/api/v1/searches/job-1/companies");
  assert.equal(requests[0].init.method, "POST");
  assert.equal(requests[1].url, "http://localhost:8000/api/v1/searches/job-1");
});

test("pagination wait returns immediately when the API did not queue more work", async () => {
  const requests = [];
  const result = await run(
    ["search", "more-people", "job-1", "--wait", "--interval", "1"],
    {
      getClientId: async () => CLIENT_ID,
      fetchImpl: async (url, init) => {
        requests.push({ url, init });
        return new Response(JSON.stringify({ job_id: "job-1", status: "done", people: [] }), {
          status: 202,
        });
      },
    },
  );

  assert.deepEqual(result.response, { job_id: "job-1", status: "done", people: [] });
  assert.equal(requests.length, 1);
});

test("argument parsing rejects missing values and validates polling values", () => {
  assert.throws(() => parseArguments(["--api-url"]), /requires a value/);
  assert.throws(() => parseArguments(["--interval", "0"]), /positive integer/);
});

test("argument parsing accepts pnpm's script separator", () => {
  assert.deepEqual(parseArguments(["--", "health"]).positionals, ["health"]);
  assert.deepEqual(parseArguments(["--", "--help"]), { help: true });
});

test("default polling cadence stays below the local API rate limit", () => {
  assert.equal(parseArguments(["search", "get", "job-1"]).options.interval, 3_000);
});
