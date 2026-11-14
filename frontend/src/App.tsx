import { createQuery } from "@tanstack/solid-query";
import { createSignal, Match, Show, Switch } from "solid-js";

import { getClient } from "./api";
import { Results } from "./components/Results";
import { SearchForm } from "./components/SearchForm";
import type { SearchInput } from "./types";

export default function App() {
  const client = createQuery(() => ({
    queryKey: ["client"],
    queryFn: getClient,
    staleTime: Infinity,
  }));

  const [job, setJob] = createSignal<{ id: string; input: SearchInput } | null>(
    null,
  );

  return (
    <div class="font-sans">
      <header class="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <button
          type="button"
          class="flex items-center gap-2 text-lg font-bold tracking-tight"
          onClick={() => setJob(null)}
        >
          <span class="grid size-7 place-items-center rounded-md bg-signal font-mono text-sm text-signal-ink">
            X
          </span>
          Exagent
        </button>
        <Show when={client.isPending || client.isError}>
          <p class="font-mono text-xs text-dim" aria-live="polite">
            <span
              class="mr-2 inline-block size-2 rounded-full"
              classList={{
                "bg-signal animate-pulse": client.isPending,
                "bg-bad": client.isError,
              }}
            />
            {client.isPending
              ? "Initializing anonymous workspace…"
              : "The API is not available yet."}
          </p>
        </Show>
      </header>

      <Switch>
        <Match when={job() === null}>
          <SearchForm onStarted={(id, input) => setJob({ id, input })} />
        </Match>
        <Match when={job()}>
          {(j) => (
            <Results
              jobId={j().id}
              input={j().input}
              onReset={() => setJob(null)}
            />
          )}
        </Match>
      </Switch>

      <footer class="mx-auto max-w-6xl px-6 py-10 font-mono text-xs text-dim">
        Powered by Exa search · built at the hackathon
      </footer>
    </div>
  );
}
