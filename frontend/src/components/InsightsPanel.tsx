import { createMutation, createQuery } from "@tanstack/solid-query";
import { createEffect, createSignal, For, Show } from "solid-js";

import { getPersonResearch, startPersonResearch } from "../api";
import type { Person } from "../types";

type Tab = "work_history" | "education" | "volunteer_experience";

const TABS: { key: Tab; label: string }[] = [
  { key: "work_history", label: "Work history" },
  { key: "education", label: "Education" },
  { key: "volunteer_experience", label: "Community" },
];

function decisionPowerLabel(score: number) {
  if (score >= 80) return "Very high";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

export function InsightsPanel(props: {
  jobId: string;
  person: Person;
  score: number;
  onClose: () => void;
}) {
  const [tab, setTab] = createSignal<Tab>("work_history");
  const [requested, setRequested] = createSignal(false);
  const research = createQuery(() => ({
    queryKey: ["person-research", props.jobId, props.person.id],
    queryFn: () => getPersonResearch(props.jobId, props.person.id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "queued" || status === "researching" ? 1500 : false;
    },
  }));
  const startResearch = createMutation(() => ({
    mutationFn: () => startPersonResearch(props.jobId, props.person.id),
    onSuccess: (data) => research.setData(data),
  }));

  createEffect(() => {
    if (research.data?.status === "not_started" && !requested()) {
      setRequested(true);
      startResearch.mutate();
    }
  });

  return (
    <div class="animate-rise rounded-2xl border border-star/50 bg-ink-2 p-5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="font-accent text-2xl text-star">Public background</p>
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
        when={research.data?.status === "done"}
        fallback={
          <p class="mt-6 text-sm text-dim">
            {startResearch.isError || research.data?.status === "failed"
              ? (research.data?.error ??
                "Background research failed. Try again.")
              : "Researching public background…"}
          </p>
        }
      >
        <div class="mt-5 grid grid-cols-3 gap-2">
          <For each={TABS}>
            {(item) => (
              <button
                type="button"
                onClick={() => setTab(item.key)}
                class="rounded-lg border px-3 py-2 text-sm transition"
                classList={{
                  "border-star text-star": tab() === item.key,
                  "border-line text-dim hover:border-star/60":
                    tab() !== item.key,
                }}
              >
                {item.label}
              </button>
            )}
          </For>
        </div>

        <Show when={tab() === "work_history"}>
          <ul class="mt-4 space-y-2 text-sm">
            <For
              each={research.data?.work_history}
              fallback={<li class="text-dim">Nothing found.</li>}
            >
              {(item) => (
                <li class="border-l-2 border-line pl-3">
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noreferrer"
                    class="hover:text-star"
                  >
                    {item.role} · {item.company_name} ↗
                  </a>
                </li>
              )}
            </For>
          </ul>
        </Show>
        <Show when={tab() === "education"}>
          <ul class="mt-4 space-y-2 text-sm">
            <For
              each={research.data?.education}
              fallback={<li class="text-dim">Nothing found.</li>}
            >
              {(item) => (
                <li class="border-l-2 border-line pl-3">
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noreferrer"
                    class="hover:text-star"
                  >
                    {item.school}
                    {item.major ? ` · ${item.major}` : ""} ↗
                  </a>
                </li>
              )}
            </For>
          </ul>
        </Show>
        <Show when={tab() === "volunteer_experience"}>
          <ul class="mt-4 space-y-2 text-sm">
            <For
              each={research.data?.volunteer_experience}
              fallback={<li class="text-dim">Nothing found.</li>}
            >
              {(item) => (
                <li class="border-l-2 border-line pl-3">
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noreferrer"
                    class="hover:text-star"
                  >
                    {item.organization}
                    {item.role ? ` · ${item.role}` : ""} ↗
                  </a>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </Show>
    </div>
  );
}
