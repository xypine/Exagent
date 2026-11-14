import { createQuery } from "@tanstack/solid-query";
import { createSignal, Match, Switch } from "solid-js";

import { getClient } from "./api";
import { HowItWorks, RecedingHero } from "./components/how-it-works";
import { Results } from "./components/Results";
import { SearchForm } from "./components/SearchForm";
import type { SearchInput } from "./types";

export default function App() {
  createQuery(() => ({
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
          <span class="grid size-7 place-items-center rounded-md bg-signal text-sm text-signal-ink">
            X
          </span>
          Exagent
        </button>

        <a
          href="#how-it-works"
          class="ml-auto mr-6 hidden text-xs text-dim transition hover:text-signal sm:inline"
          classList={{ "sm:hidden": job() !== null }}
        >
          How it works
        </a>
      </header>

      <Switch>
        <Match when={job() === null}>
          <RecedingHero>
            <SearchForm onStarted={(id, input) => setJob({ id, input })} />
          </RecedingHero>
          <HowItWorks
            onTryIt={() =>
              setTimeout(
                () =>
                  document
                    .querySelector<HTMLTextAreaElement>("textarea")
                    ?.focus({ preventScroll: true }),
                700,
              )
            }
          />
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

      <footer class="mx-auto max-w-6xl px-6 py-10 text-xs text-dim">
        Powered by Exa search · built at Junction 2026
      </footer>
    </div>
  );
}
