import { createMutation } from "@tanstack/solid-query";
import { createSignal, For, Show } from "solid-js";

import { createSearch } from "../api";
import type { SearchInput } from "../types";
import { LocationInput } from "./LocationInput";

const INDUSTRY_SUGGESTIONS = [
  "AI / ML",
  "Fintech",
  "Health tech",
  "Climate",
  "Gaming",
];

export function SearchForm(props: {
  onStarted: (jobId: string, input: SearchInput) => void;
}) {
  const [location, setLocation] = createSignal("");
  const [industry, setIndustry] = createSignal("");
  const [details, setDetails] = createSignal("");

  const mutation = createMutation(() => ({
    mutationFn: createSearch,
    onSuccess: (res, input) => props.onStarted(res.job_id, input),
  }));

  const canSubmit = () => details().trim().length > 0 && !mutation.isPending;

  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    if (!canSubmit()) return;
    mutation.mutate({
      location: location().trim(),
      industry: industry().trim(),
      details: details().trim(),
    });
  };

  return (
    <main class="mx-auto grid max-w-6xl gap-12 px-6 pt-10 pb-16 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
      <section class="animate-rise space-y-6">
        <p class="font-mono text-xs tracking-[0.25em] text-signal uppercase">
          The hidden job market — unlocked
        </p>
        <h1 class="text-5xl leading-[1.02] font-bold tracking-tight sm:text-6xl">
          Find who matters.
          <br />
          <span class="text-signal">Say what works.</span>
        </h1>
        <p class="max-w-lg text-lg leading-8 text-dim">
          Tell us where you want to work and who you are. Our agent finds the
          right companies, then the people inside them worth sending an open
          application to.
        </p>
        <ol class="grid max-w-lg gap-3 font-mono text-sm text-dim sm:grid-cols-3">
          <li class="rounded-lg border border-line p-3">
            <span class="text-signal">01</span> Companies
          </li>
          <li class="rounded-lg border border-line p-3">
            <span class="text-signal">02</span> People
          </li>
          <li class="rounded-lg border border-line p-3">
            <span class="text-signal">03</span> Key insights
          </li>
        </ol>
      </section>

      <form
        onSubmit={submit}
        class="animate-rise space-y-4 rounded-2xl border border-line bg-ink-2/60 p-6 shadow-2xl backdrop-blur [animation-delay:120ms]"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="space-y-1.5">
            <span class="font-mono text-xs text-dim uppercase">Location</span>
            <LocationInput value={location()} onChange={setLocation} />
          </label>
          <label class="space-y-1.5">
            <span class="font-mono text-xs text-dim uppercase">Industry</span>
            <input
              class="field"
              placeholder="Fintech, climate…"
              value={industry()}
              onInput={(e) => setIndustry(e.currentTarget.value)}
            />
          </label>
        </div>
        <div class="flex flex-wrap gap-2">
          <For each={INDUSTRY_SUGGESTIONS}>
            {(s) => (
              <button
                type="button"
                class="rounded-full border border-line px-3 py-1 text-xs text-dim transition hover:border-signal hover:text-signal"
                classList={{ "border-signal text-signal": industry() === s }}
                onClick={() => setIndustry(s)}
              >
                {s}
              </button>
            )}
          </For>
        </div>
        <label class="block space-y-1.5">
          <span class="font-mono text-xs text-dim uppercase">
            Details about you
          </span>
          <textarea
            class="field min-h-36 resize-y"
            placeholder="Junior full-stack dev, TypeScript + Python, built a robotics side project, looking for a small product team…"
            value={details()}
            onInput={(e) => setDetails(e.currentTarget.value)}
          />
        </label>
        <Show when={mutation.isError}>
          <p class="text-sm text-bad">{mutation.error?.message}</p>
        </Show>
        <button
          type="submit"
          disabled={!canSubmit()}
          class="w-full rounded-xl bg-signal px-5 py-3.5 font-semibold text-signal-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {mutation.isPending ? "Starting agent…" : "Search →"}
        </button>
      </form>
    </main>
  );
}
