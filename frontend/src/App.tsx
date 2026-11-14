import { createQuery } from "@tanstack/solid-query";
import { createSignal, Match, onCleanup, onMount, Switch } from "solid-js";

import { getClient } from "./api";
import { HowItWorks, RecedingHero } from "./components/how-it-works";
import { Results } from "./components/Results";
import { SearchForm } from "./components/SearchForm";
import type { SearchInput } from "./types";

const SEARCH_PARAM = "search";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ActiveJob = { id: string; input?: SearchInput };

function jobFromLocation(): ActiveJob | null {
  const jobId = new URLSearchParams(window.location.search).get(SEARCH_PARAM);
  return jobId !== null && UUID_RE.test(jobId) ? { id: jobId } : null;
}

function updateSearchLocation(jobId: string | null) {
  const url = new URL(window.location.href);
  if (jobId === null) {
    url.searchParams.delete(SEARCH_PARAM);
  } else {
    url.searchParams.set(SEARCH_PARAM, jobId);
  }
  window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export default function App() {
  createQuery(() => ({
    queryKey: ["client"],
    queryFn: getClient,
    staleTime: Infinity,
  }));

  const [job, setJob] = createSignal<ActiveJob | null>(jobFromLocation());

  const resetJob = () => {
    setJob(null);
    updateSearchLocation(null);
  };

  const startJob = (id: string, input: SearchInput) => {
    setJob({ id, input });
    updateSearchLocation(id);
  };

  onMount(() => {
    const restoreJobFromHistory = () => setJob(jobFromLocation());
    window.addEventListener("popstate", restoreJobFromHistory);
    onCleanup(() =>
      window.removeEventListener("popstate", restoreJobFromHistory),
    );
  });

  return (
    <div class="font-sans">
      <header class="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <button
          type="button"
          class="flex items-center gap-3 text-3xl font-bold tracking-tight"
          onClick={resetJob}
        >
          <img src="/logo.svg" alt="" class="h-20 w-auto" />
          Exagent
        </button>
      </header>

      <Switch>
        <Match when={job() === null}>
          <RecedingHero>
            <SearchForm onStarted={startJob} />
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
            <Results jobId={j().id} input={j().input} onReset={resetJob} />
          )}
        </Match>
      </Switch>

      <footer class="mx-auto max-w-6xl px-6 py-10 text-xs text-dim">
        Powered by Exa search · built at Junction 2026
      </footer>
    </div>
  );
}
