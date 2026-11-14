import { createQuery } from "@tanstack/solid-query";

import { getClient } from "./api";

export default function App() {
  const client = createQuery(() => ({
    queryKey: ["client"],
    queryFn: getClient,
    staleTime: Infinity,
  }));

  return (
    <main class="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
      <section class="space-y-6">
        <p class="text-sm font-semibold tracking-[0.2em] text-sky-700 uppercase">Prospecting</p>
        <h1 class="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
          Find the people behind your next opportunity.
        </h1>
        <p class="max-w-2xl text-lg leading-8 text-slate-600">
          The research workspace is ready. Company discovery and people search will follow.
        </p>
        <p class="text-sm text-slate-500" aria-live="polite">
          {client.isPending
            ? "Initializing anonymous workspace…"
            : client.isError
              ? "The API is not available yet."
              : "Anonymous workspace ready."}
        </p>
      </section>
    </main>
  );
}
