import { createMutation, createQuery } from "@tanstack/solid-query";
import { createSignal, For, Show } from "solid-js";

import { getSearch, searchMorePeople } from "../api";
import type { JobStatus, Person, SearchInput } from "../types";

const STEPS: { key: JobStatus; label: string }[] = [
  { key: "finding_companies", label: "Finding companies" },
  { key: "finding_people", label: "Finding key people" },
  { key: "done", label: "Done" },
];

const COMPANY_SIZE_LABELS: Record<SearchInput["company_size"], string> = {
  small: "Startup",
  medium: "Mid-size",
  large: "Enterprise",
};

function stepIndex(status: JobStatus | undefined) {
  if (status === "done") return 2;
  if (status === "finding_people") return 1;
  return 0;
}

function People({ people }: { people: Person[] }) {
  return (
    <div class="mt-5 border-t border-line pt-4">
      <p class="font-mono text-xs text-dim uppercase">Key people</p>
      <ul class="mt-3 space-y-3">
        <For each={people}>
          {(person) => (
            <li class="rounded-xl border border-line/80 bg-ink p-4">
              <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <div>
                  <h3 class="font-medium">{person.name}</h3>
                  <p class="text-sm text-dim">{person.title}</p>
                </div>
                <a
                  href={person.profile_url}
                  target="_blank"
                  rel="noreferrer"
                  class="font-mono text-xs text-dim hover:text-signal"
                >
                  profile ↗
                </a>
              </div>
              <p class="mt-3 text-sm text-dim">{person.evidence_summary}</p>
              <a
                href={person.evidence_url}
                target="_blank"
                rel="noreferrer"
                class="mt-2 inline-block font-mono text-xs text-dim hover:text-signal"
              >
                current-role evidence ↗
              </a>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}

export function Results(props: {
  jobId: string;
  input: SearchInput;
  onReset: () => void;
}) {
  const [enteredCompanyIds, setEnteredCompanyIds] = createSignal<
    ReadonlySet<string>
  >(new Set());
  const job = createQuery(() => ({
    queryKey: ["search", props.jobId],
    queryFn: () => getSearch(props.jobId),
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === "done" || s === "failed" ? false : 2500;
    },
  }));

  const morePeople = createMutation(() => ({
    mutationFn: () => searchMorePeople(props.jobId),
    onSuccess: (data) => {
      job.setData(data);
    },
  }));

  const running = () =>
    job.data?.status !== "done" && job.data?.status !== "failed";

  const markCompanyEntered = (companyId: string) => {
    setEnteredCompanyIds((entered) => new Set(entered).add(companyId));
  };

  return (
    <main class="mx-auto max-w-6xl px-6 pt-6 pb-16">
      <div class="flex flex-wrap items-center gap-2">
        <Show when={props.input.area}>
          <span class="rounded-full border border-line px-3 py-1 text-sm">
            📍 {props.input.area}
          </span>
        </Show>
        <Show when={props.input.industry}>
          <span class="rounded-full border border-line px-3 py-1 text-sm">
            🏷 {props.input.industry}
          </span>
        </Show>
        <span class="rounded-full border border-line px-3 py-1 text-sm">
          🏢 {COMPANY_SIZE_LABELS[props.input.company_size]}
        </span>
        <button
          type="button"
          onClick={props.onReset}
          class="ml-auto rounded-full border border-line px-3 py-1 text-sm text-dim hover:border-signal hover:text-signal"
        >
          ← New search
        </button>
      </div>

      <ol class="mt-6 grid grid-cols-3 gap-2 text-xs">
        <For each={STEPS}>
          {(step, i) => (
            <li
              class="relative overflow-hidden rounded-lg border px-3 py-2"
              classList={{
                "border-signal text-signal": i() <= stepIndex(job.data?.status),
                "border-line text-dim": i() > stepIndex(job.data?.status),
              }}
            >
              {step.label}
              <Show when={running() && i() === stepIndex(job.data?.status)}>
                <span class="absolute inset-y-0 left-0 w-1/3 animate-scan bg-signal/15" />
              </Show>
            </li>
          )}
        </For>
      </ol>

      <Show when={job.isError || job.data?.status === "failed"}>
        <p class="mt-6 rounded-lg border border-bad/50 p-4 text-bad">
          {job.data?.error ?? job.error?.message ?? "The search failed."}
        </p>
      </Show>

      <Show when={job.data?.people_search_stats}>
        {(stats) => (
          <p class="mt-4 font-mono text-xs text-dim">
            Key people search: {stats().companies_searched}/
            {stats().companies_available} companies · {stats().request_count}{" "}
            Exa requests
          </p>
        )}
      </Show>

      <Show
        when={
          job.data?.status === "done" &&
          job.data.people_search_stats.companies_searched <
            job.data.people_search_stats.companies_available
        }
      >
        <button
          type="button"
          disabled={morePeople.isPending}
          onClick={() => morePeople.mutate()}
          class="mt-3 rounded-lg border border-signal px-3 py-2 text-sm text-signal transition hover:bg-signal/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {morePeople.isPending
            ? "Starting people search…"
            : `Search ${Math.min(
                job.data?.people_search_stats.batch_size ?? 0,
                (job.data?.people_search_stats.companies_available ?? 0) -
                  (job.data?.people_search_stats.companies_searched ?? 0),
              )} more companies`}
        </button>
      </Show>

      <Show when={morePeople.isError}>
        <p class="mt-3 text-sm text-bad">{morePeople.error?.message}</p>
      </Show>

      <Show when={job.data?.people_error}>
        <p class="mt-4 rounded-lg border border-line p-3 text-sm text-dim">
          {job.data?.people_error}
        </p>
      </Show>

      <div class="mt-8">
        <section class="space-y-4">
          <Show when={(job.data?.companies.length ?? 0) === 0 && running()}>
            <For each={[0, 1, 2]}>
              {() => (
                <div class="h-24 animate-pulse rounded-2xl border border-line bg-ink-2" />
              )}
            </For>
          </Show>
          <Show
            when={
              job.data?.status === "done" && job.data.companies.length === 0
            }
          >
            <p class="text-dim">
              No matches yet — try a broader area or industry.
            </p>
          </Show>
          <For each={job.data?.companies}>
            {(company, i) => (
              <article
                class="rounded-2xl border border-line bg-ink-2/60 p-5"
                classList={{
                  "animate-rise": !enteredCompanyIds().has(company.id),
                }}
                style={
                  enteredCompanyIds().has(company.id)
                    ? undefined
                    : { "animation-delay": `${i() * 80}ms` }
                }
                onAnimationEnd={() => markCompanyEntered(company.id)}
              >
                <div class="flex items-baseline justify-between gap-4">
                  <h2 class="text-xl font-semibold">{company.name}</h2>
                  <a
                    href={company.url}
                    target="_blank"
                    rel="noreferrer"
                    class="text-xs text-dim hover:text-signal"
                  >
                    visit ↗
                  </a>
                </div>
                <p class="mt-1 text-sm text-dim">{company.summary}</p>
                <div class="mt-4 border-l border-line pl-4">
                  <p class="text-xs text-dim uppercase">Sources</p>
                  <ul class="mt-2 space-y-1 text-sm">
                    <For each={company.sources}>
                      {(source) => (
                        <li>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            class="text-dim hover:text-signal"
                          >
                            {source.title ?? source.url} ↗
                          </a>
                        </li>
                      )}
                    </For>
                  </ul>
                </div>
                <Show
                  when={
                    (job.data?.people.filter(
                      (person) => person.company_id === company.id,
                    ).length ?? 0) > 0
                  }
                >
                  <People
                    people={
                      job.data?.people.filter(
                        (person) => person.company_id === company.id,
                      ) ?? []
                    }
                  />
                </Show>
                <Show
                  when={
                    job.data?.status === "finding_people" &&
                    i() <
                      job.data.people_search_stats.companies_searched +
                        job.data.people_search_stats.batch_size
                  }
                >
                  <p class="mt-5 animate-pulse font-mono text-xs text-dim">
                    Researching key people…
                  </p>
                </Show>
              </article>
            )}
          </For>
        </section>
      </div>
    </main>
  );
}
