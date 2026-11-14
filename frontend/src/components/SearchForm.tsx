import { createMutation } from "@tanstack/solid-query";
import { createSignal, For, Show } from "solid-js";

import { createSearch } from "../api";
import { INDUSTRIES, searchIndustries } from "../industries";
import { searchLocations } from "../locations";
import type { SearchInput } from "../types";
import { Autocomplete } from "./Autocomplete";

export function SearchForm(props: {
  onStarted: (jobId: string, input: SearchInput) => void;
}) {
  const [area, setArea] = createSignal("");
  const [industry, setIndustry] = createSignal("");

  const mutation = createMutation(() => ({
    mutationFn: createSearch,
    onSuccess: (res, input) => props.onStarted(res.job_id, input),
  }));

  const canSubmit = () =>
    area().trim().length > 0 &&
    industry().trim().length > 0 &&
    !mutation.isPending;

  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    if (!canSubmit()) return;
    mutation.mutate({
      area: area().trim(),
      industry: industry().trim(),
    });
  };

  return (
    <main class="mx-auto grid max-w-6xl gap-12 px-6 pt-10 pb-16 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
      <section class="animate-rise space-y-6">
        <p class="font-mono text-s tracking-[0.25em] text-signal uppercase">
          The hidden job market — unlocked
        </p>
        <h1 class="text-5xl leading-[1.02] font-bold tracking-tight sm:text-6xl">
          Find who matters.
          <br />
          <span class="text-signal">Say what works.</span>
        </h1>
        <p class="max-w-lg text-lg leading-8 text-dim">
          Tell us where you want to work. We will find the most relevant people and companies for you.
        </p>
      </section>

      <form
        onSubmit={submit}
        class="animate-rise space-y-4 rounded-2xl border border-line bg-ink-2/60 p-6 shadow-2xl backdrop-blur [animation-delay:120ms]"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <label for="area" class="space-y-1.5">
            <span class="font-mono text-xs text-dim uppercase">Area</span>
            <Autocomplete
              inputId="area"
              value={area()}
              onChange={setArea}
              search={searchLocations}
              placeholder="Helsinki, Finland…"
              listId="area-suggestions"
            />
          </label>
          <label for="industry" class="space-y-1.5">
            <span class="font-mono text-xs text-dim uppercase">Industry</span>
            <Autocomplete
              inputId="industry"
              value={industry()}
              onChange={setIndustry}
              search={searchIndustries}
              placeholder="SaaS, Marketing…"
              listId="industry-suggestions"
            />
          </label>
        </div>
        <div class="flex flex-wrap gap-2">
          <For each={INDUSTRIES}>
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
