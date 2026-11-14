import { createQuery } from "@tanstack/solid-query";
import { createSignal, For, Show } from "solid-js";

import { getPersonInsights } from "../api";
import type { Person, PersonInsights } from "../types";

type Tab = keyof Omit<PersonInsights, "person_id" | "key_insights">;

const TABS: { key: Tab; label: string }[] = [
  { key: "work_history", label: "Work history" },
  { key: "connections", label: "Connections" },
  { key: "hobbies", label: "Hobbies" },
  { key: "education", label: "Education" },
];

function decisionPowerLabel(score: number) {
  if (score >= 80) return "Very high";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

export function InsightsPanel(props: {
  person: Person;
  score: number;
  onClose: () => void;
}) {
  const [tab, setTab] = createSignal<Tab>("work_history");
  const insights = createQuery(() => ({
    queryKey: ["insights", props.person.id],
    queryFn: () => getPersonInsights(props.person.id),
    staleTime: Infinity,
  }));

  return (
    <div class="animate-rise rounded-2xl border border-star/50 bg-ink-2 p-5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="font-accent text-2xl text-star">Key insights</p>
          <h3 class="mt-1 text-xl font-semibold">{props.person.name}</h3>
          <p class="text-sm text-dim">{props.person.title}</p>
        </div>
        <div class="flex items-start gap-4">
          <div class="text-right">
            <p class="text-xs text-dim">Decision power</p>
            <p class="mt-1 text-xl font-semibold text-star">
              {props.score} · {decisionPowerLabel(props.score)}
            </p>
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
      </div>

      <Show when={props.person.profile_url}>
        <a
          href={props.person.profile_url}
          target="_blank"
          rel="noreferrer"
          class="mt-2 inline-block text-xs text-dim hover:text-star"
        >
          profile ↗
        </a>
      </Show>

      <p class="mt-4 border-l-2 border-star/50 pl-3 text-sm text-dim">
        {props.person.evidence_summary}
      </p>
      <a
        href={props.person.evidence_url}
        target="_blank"
        rel="noreferrer"
        class="mt-2 inline-block text-xs text-dim hover:text-star"
      >
        current-role evidence ↗
      </a>

      <Show
        when={!insights.isPending}
        fallback={
          <p class="mt-6 animate-pulse text-sm text-dim">Researching…</p>
        }
      >
        <Show
          when={insights.data}
          fallback={
            <p class="mt-6 text-sm text-bad">{insights.error?.message}</p>
          }
        >
          {(data) => (
            <>
              <ul class="mt-5 space-y-2">
                <For each={data().key_insights}>
                  {(k) => (
                    <li class="rounded-lg bg-star/10 px-3 py-2 text-sm">
                      <span class="mr-2 text-star">✦</span>
                      {k}
                    </li>
                  )}
                </For>
              </ul>
              <div class="mt-5 grid grid-cols-2 gap-2">
                <For each={TABS}>
                  {(t) => (
                    <button
                      type="button"
                      onClick={() => setTab(t.key)}
                      class="rounded-lg border px-3 py-2 text-sm transition"
                      classList={{
                        "border-star text-star": tab() === t.key,
                        "border-line text-dim hover:border-star/60":
                          tab() !== t.key,
                      }}
                    >
                      {t.label}
                    </button>
                  )}
                </For>
              </div>
              <ul class="mt-4 space-y-2 text-sm">
                <For
                  each={data()[tab()]}
                  fallback={<li class="text-dim">Nothing found.</li>}
                >
                  {(item) => (
                    <li class="border-l-2 border-line pl-3">{item}</li>
                  )}
                </For>
              </ul>
            </>
          )}
        </Show>
      </Show>
    </div>
  );
}
