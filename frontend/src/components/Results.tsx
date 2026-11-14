import { createMutation, createQuery } from "@tanstack/solid-query";
import { createSignal, For, Show } from "solid-js";

import { getSearch, searchMorePeople } from "../api";
import type { Company, JobStatus, Person, SearchInput } from "../types";
import { InsightsPanel } from "./InsightsPanel";

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

function People(props: {
  people: Person[];
  onSelect: (person: Person) => void;
}) {
  return (
    <div class="border-t border-line">
      <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-4 bg-ink px-5 py-2 font-mono text-xs text-dim uppercase">
        <span>Key people</span>
        <span>Score</span>
      </div>
      <ul>
        <For each={props.people}>
          {(person) => (
            <li class="border-t border-line/70 first:border-t-0">
              <button
                type="button"
                aria-haspopup="dialog"
                aria-label={`${person.name}, ${person.title}, score ${person.decision_power_score}`}
                onClick={() => props.onSelect(person)}
                class="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3 text-left transition hover:bg-star/5"
              >
                <span class="min-w-0 truncate">
                  <span class="font-medium">{person.name}</span>
                  <span class="text-dim"> — {person.title}</span>
                </span>
                <span class="font-mono text-sm font-semibold text-star">
                  {person.decision_power_score}
                </span>
              </button>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}

function CompanyDetailsModal(props: { company: Company; onClose: () => void }) {
  return (
    <div class="fixed inset-0 z-50 grid place-items-center bg-paper/35 p-5">
      <section
        class="max-h-[calc(100vh-2.5rem)] w-full max-w-lg overflow-y-auto animate-rise rounded-2xl border border-star/50 bg-ink-2 p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={`${props.company.name} details`}
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs tracking-widest text-star uppercase">Company</p>
            <h2 class="mt-1 text-2xl font-semibold">{props.company.name}</h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={props.onClose}
            class="text-dim hover:text-paper"
          >
            ✕
          </button>
        </div>
        <p class="mt-5 text-sm text-dim">{props.company.summary}</p>
        <a
          href={props.company.url}
          target="_blank"
          rel="noreferrer"
          class="mt-4 inline-block text-sm text-star hover:underline"
        >
          Visit company website ↗
        </a>
        <Show when={props.company.sources.length > 0}>
          <div class="mt-6 border-t border-line pt-4">
            <p class="font-mono text-xs text-dim uppercase">Sources</p>
            <ul class="mt-2 space-y-2 text-sm">
              <For each={props.company.sources}>
                {(source) => (
                  <li>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      class="text-dim hover:text-star"
                    >
                      {source.title ?? source.url} ↗
                    </a>
                  </li>
                )}
              </For>
            </ul>
          </div>
        </Show>
      </section>
    </div>
  );
}

export function Results(props: {
  jobId: string;
  input?: SearchInput;
  onReset: () => void;
}) {
  const [enteredCompanyIds, setEnteredCompanyIds] = createSignal<
    ReadonlySet<string>
  >(new Set());
  const [selectedPerson, setSelectedPerson] = createSignal<Person | null>(null);
  const [selectedCompany, setSelectedCompany] = createSignal<Company | null>(
    null,
  );
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

  const input = (): SearchInput | undefined => {
    if (props.input) return props.input;
    if (!job.data || job.data.company_size === null) return undefined;
    return {
      area: job.data.area,
      industry: job.data.industry,
      company_size: job.data.company_size,
    };
  };

  const markCompanyEntered = (companyId: string) => {
    setEnteredCompanyIds((entered) => new Set(entered).add(companyId));
  };

  return (
    <main class="mx-auto max-w-6xl px-6 pt-6 pb-16">
      <div class="flex flex-wrap items-center gap-2">
        <Show when={input()}>
          {(searchInput) => (
            <>
              <Show when={searchInput().area}>
                <span class="rounded-full border border-line px-3 py-1 text-sm">
                  📍 {searchInput().area}
                </span>
              </Show>
              <Show when={searchInput().industry}>
                <span class="rounded-full border border-line px-3 py-1 text-sm">
                  🏷 {searchInput().industry}
                </span>
              </Show>
              <span class="rounded-full border border-line px-3 py-1 text-sm">
                🏢 {COMPANY_SIZE_LABELS[searchInput().company_size]}
              </span>
            </>
          )}
        </Show>
        <button
          type="button"
          onClick={props.onReset}
          class="ml-auto rounded-full border border-line px-3 py-1 text-sm text-dim hover:border-star hover:text-star"
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
                "border-star text-star": i() <= stepIndex(job.data?.status),
                "border-line text-dim": i() > stepIndex(job.data?.status),
              }}
            >
              {step.label}
              <Show when={running() && i() === stepIndex(job.data?.status)}>
                <span class="absolute inset-y-0 left-0 w-1/3 animate-scan bg-star/15" />
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
          <div
            class="mt-4 space-y-1 font-mono text-xs text-dim"
            aria-live="polite"
          >
            <Show
              when={
                job.data?.status === "finding_people" &&
                (job.data?.companies.length ?? 0) > 0
              }
            >
              <p>Companies found — researching key people in the background.</p>
            </Show>
            <p>
              Key people: {stats().companies_searched}/
              {stats().companies_available} companies researched ·{" "}
              {stats().requests_in_flight} Exa requests in flight ·{" "}
              {stats().requests_completed} completed
            </p>
          </div>
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
          class="mt-3 rounded-lg border border-star px-3 py-2 text-sm text-star transition hover:bg-star/10 disabled:cursor-not-allowed disabled:opacity-50"
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
                class="overflow-hidden rounded-2xl border border-line bg-ink-2/60"
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
                <div class="flex items-center justify-between gap-4 px-5 py-4">
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() => setSelectedCompany(company)}
                    class="text-left text-xl font-semibold hover:text-star"
                  >
                    {company.name}
                  </button>
                  <a
                    href={company.url}
                    target="_blank"
                    rel="noreferrer"
                    class="text-xs text-dim hover:text-star"
                  >
                    visit ↗
                  </a>
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
                    onSelect={setSelectedPerson}
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
                  <p class="border-t border-line px-5 py-3 font-mono text-xs text-dim animate-pulse">
                    Researching key people…
                  </p>
                </Show>
              </article>
            )}
          </For>
        </section>
      </div>

      <Show when={selectedPerson()}>
        {(person) => (
          <div class="fixed inset-0 z-50 grid place-items-center bg-paper/35 p-5">
            <div
              class="max-h-[calc(100vh-2.5rem)] w-full max-w-2xl overflow-y-auto"
              role="dialog"
              aria-modal="true"
              aria-label={`${person().name} details`}
            >
              <InsightsPanel
                person={person()}
                score={person().decision_power_score}
                onClose={() => setSelectedPerson(null)}
              />
            </div>
          </div>
        )}
      </Show>
      <Show when={selectedCompany()}>
        {(company) => (
          <CompanyDetailsModal
            company={company()}
            onClose={() => setSelectedCompany(null)}
          />
        )}
      </Show>
    </main>
  );
}
