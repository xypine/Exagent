import { createQuery } from "@tanstack/solid-query";
import { createSignal, For, Show } from "solid-js";

import { getSearch } from "../api";
import type { JobStatus, Person, SearchInput } from "../types";
import { InsightsPanel } from "./InsightsPanel";

const STEPS: { key: JobStatus; label: string }[] = [
  { key: "finding_companies", label: "Finding companies" },
  { key: "finding_people", label: "Finding people" },
  { key: "done", label: "Done" },
];

function stepIndex(status: JobStatus | undefined) {
  if (status === "done") return 2;
  if (status === "finding_people") return 1;
  return 0;
}

export function Results(props: {
  jobId: string;
  input: SearchInput;
  onReset: () => void;
}) {
  const job = createQuery(() => ({
    queryKey: ["search", props.jobId],
    queryFn: () => getSearch(props.jobId),
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === "done" || s === "failed" ? false : 1500;
    },
  }));

  const [selected, setSelected] = createSignal<Person | null>(null);
  const running = () =>
    job.data?.status !== "done" && job.data?.status !== "failed";

  return (
    <main class="mx-auto max-w-6xl px-6 pt-6 pb-16">
      <div class="flex flex-wrap items-center gap-2">
        <Show when={props.input.location}>
          <span class="rounded-full border border-line px-3 py-1 text-sm">
            📍 {props.input.location}
          </span>
        </Show>
        <Show when={props.input.industry}>
          <span class="rounded-full border border-line px-3 py-1 text-sm">
            🏷 {props.input.industry}
          </span>
        </Show>
        <button
          type="button"
          onClick={props.onReset}
          class="ml-auto rounded-full border border-line px-3 py-1 text-sm text-dim hover:border-signal hover:text-signal"
        >
          ← New search
        </button>
      </div>

      <ol class="mt-6 grid grid-cols-3 gap-2 font-mono text-xs">
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

      <div class="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
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
              No matches yet — try a broader location or industry.
            </p>
          </Show>
          <For each={job.data?.companies}>
            {(company, i) => (
              <article
                class="animate-rise rounded-2xl border border-line bg-ink-2/60 p-5"
                style={{ "animation-delay": `${i() * 80}ms` }}
              >
                <div class="flex items-baseline justify-between gap-4">
                  <h2 class="text-xl font-semibold">{company.name}</h2>
                  <Show when={company.url}>
                    <a
                      href={company.url}
                      target="_blank"
                      rel="noreferrer"
                      class="font-mono text-xs text-dim hover:text-signal"
                    >
                      visit ↗
                    </a>
                  </Show>
                </div>
                <Show when={company.summary}>
                  <p class="mt-1 text-sm text-dim">{company.summary}</p>
                </Show>
                <ul class="mt-4 space-y-2 border-l border-line pl-4">
                  <Show when={company.people.length === 0 && running()}>
                    <li class="font-mono text-xs text-dim">
                      Looking for people…
                    </li>
                  </Show>
                  <For each={company.people}>
                    {(person) => (
                      <li>
                        <button
                          type="button"
                          onClick={() => setSelected(person)}
                          class="flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition"
                          classList={{
                            "border-signal bg-signal/10":
                              selected()?.id === person.id,
                            "border-line hover:border-signal/60":
                              selected()?.id !== person.id,
                          }}
                        >
                          <span>
                            <span class="font-medium">{person.name}</span>
                            <span class="ml-2 font-mono text-xs text-signal">
                              {person.title}
                            </span>
                            <Show when={person.relevance}>
                              <span class="mt-0.5 block text-xs text-dim">
                                {person.relevance}
                              </span>
                            </Show>
                          </span>
                          <span class="text-dim">→</span>
                        </button>
                      </li>
                    )}
                  </For>
                </ul>
              </article>
            )}
          </For>
        </section>

        <aside class="lg:sticky lg:top-6 lg:self-start">
          <Show
            when={selected()}
            fallback={
              <div class="rounded-2xl border border-dashed border-line p-6 text-sm text-dim">
                Click a person to see key insights — work history, connections,
                hobbies and education — to shape your application.
              </div>
            }
          >
            {(p) => (
              <InsightsPanel person={p()} onClose={() => setSelected(null)} />
            )}
          </Show>
        </aside>
      </div>
    </main>
  );
}
