import {
  createMutation,
  createQuery,
  useQueryClient,
} from "@tanstack/solid-query";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  Show,
} from "solid-js";

import {
  getMatchRun,
  getSearch,
  getStoredProfile,
  searchMorePeople,
  startMatchRun,
  storeProfile,
} from "../api";
import { type CompanyRankingStage, rankCompanies } from "../companyRanking";
import type {
  Company,
  JobStatus,
  MatchRunStatus,
  Person,
  PersonMatch,
  SearchInput,
} from "../types";
import { InsightsPanel } from "./InsightsPanel";
import { Modal } from "./Modal";

const STEPS = [
  "Finding companies",
  "Finding key people",
  "Researching & scoring matches",
  "Done",
];

const COMPANY_SIZE_LABELS: Record<SearchInput["company_size"], string> = {
  small: "Startup",
  medium: "Mid-size",
  large: "Enterprise",
};

function stepIndex(
  status: JobStatus | undefined,
  matchStatus: MatchRunStatus | undefined,
) {
  if (status === "done") return matchStatus === "done" ? 3 : 2;
  if (status === "finding_people") return 1;
  return 0;
}

function stepIsComplete(
  status: JobStatus | undefined,
  matchStatus: MatchRunStatus | undefined,
  index: number,
) {
  const currentStep = stepIndex(status, matchStatus);
  return currentStep === STEPS.length - 1 || index < currentStep;
}

function People(props: {
  people: Person[];
  onSelect: (person: Person) => void;
  matches: PersonMatch[];
  matchRunComplete: boolean;
  researchingPersonId?: string;
}) {
  const [showUnverified, setShowUnverified] = createSignal(false);
  const verifiedPeople = () =>
    props.people.filter((person) => person.employer_verified);
  const unverifiedPeople = () =>
    props.people.filter((person) => !person.employer_verified);
  const visiblePeople = () => [
    ...verifiedPeople(),
    ...(showUnverified() ? unverifiedPeople() : []),
  ];

  return (
    <div class="border-t border-line">
      <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-4 bg-ink px-5 py-2 font-mono text-xs text-dim uppercase">
        <span>Key people</span>
        <div class="flex items-center gap-3">
          <Show when={unverifiedPeople().length > 0}>
            <button
              type="button"
              aria-pressed={showUnverified()}
              onClick={() => setShowUnverified((shown) => !shown)}
              class="normal-case text-star hover:underline"
            >
              {showUnverified()
                ? "Hide unverified employers"
                : `Show ${unverifiedPeople().length} unverified employer${
                    unverifiedPeople().length === 1 ? "" : "s"
                  }`}
            </button>
          </Show>
          <span>Score</span>
        </div>
      </div>
      <ul>
        <For each={visiblePeople()}>
          {(person) => {
            const match = () =>
              props.matches.find((candidate) => candidate.id === person.id);
            const researchedMatch = () => {
              const candidate = match();
              return props.matchRunComplete &&
                candidate &&
                !isInfluenceOnly(candidate)
                ? candidate
                : undefined;
            };
            const score = () =>
              researchedMatch()?.score ?? person.decision_power_score;
            const scoreLabel = () =>
              researchedMatch()
                ? `Overall match score ${score()}`
                : `Hiring influence ${score()}`;

            return (
              <li class="border-t border-line/70 first:border-t-0">
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-label={`${person.name}, ${person.title}, ${scoreLabel().toLowerCase()}`}
                  onClick={() => props.onSelect(person)}
                  disabled={!person.employer_verified}
                  class="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3 text-left transition hover:bg-star/5 disabled:cursor-not-allowed disabled:opacity-65"
                >
                  <span class="min-w-0 truncate">
                    <span class="font-medium">{person.name}</span>
                    <span class="text-dim"> — {person.title}</span>
                    <Show when={!person.employer_verified}>
                      <span class="ml-2 text-xs text-bad">
                        Unverified employer: {person.reported_company_name}
                      </span>
                    </Show>
                  </span>
                  <span class="flex items-center gap-2">
                    <span class="font-mono text-sm font-semibold text-star">
                      {score()}
                    </span>
                    <Show when={props.researchingPersonId === person.id}>
                      <span
                        role="status"
                        aria-label={`Researching ${person.name}`}
                        class="size-3 animate-spin rounded-full border-2 border-star border-t-transparent"
                      />
                    </Show>
                    <ScoreBar
                      match={researchedMatch()}
                      fallbackScore={person.decision_power_score}
                    />
                  </span>
                </button>
              </li>
            );
          }}
        </For>
      </ul>
    </div>
  );
}

const SCORE_FACTORS = [
  {
    key: "decision_power",
    label: "Decision power",
    maximum: 40,
    color: "bg-signal",
  },
  {
    key: "background_fit",
    label: "Background fit",
    maximum: 40,
    color: "bg-fit",
  },
  {
    key: "shared_ground",
    label: "Shared ground",
    maximum: 20,
    color: "bg-shared",
  },
] as const;

function ScoreBar(props: {
  match: PersonMatch | undefined;
  fallbackScore: number;
}) {
  const factors = () => {
    if (!props.match) return [];

    let offset = 0;
    return SCORE_FACTORS.map((factor) => {
      const score = props.match?.breakdown[factor.key] ?? 0;
      const result = { ...factor, score, offset };
      offset += score;
      return result;
    });
  };
  const scoreBreakdownLabel = () =>
    `Score breakdown: ${factors()
      .map((factor) => `${factor.label} ${factor.score}/${factor.maximum}`)
      .join(", ")}`;

  return (
    <Show
      when={props.match}
      fallback={
        <span
          aria-hidden="true"
          class="h-1.5 w-24 overflow-hidden rounded-full bg-line"
        >
          <span
            class="block h-full rounded-full bg-signal transition-[width] duration-300"
            style={{ width: `${props.fallbackScore}%` }}
          />
        </span>
      }
    >
      <span
        role="img"
        aria-label={scoreBreakdownLabel()}
        class="relative h-1.5 w-24"
      >
        <span
          aria-hidden="true"
          class="absolute inset-0 overflow-hidden rounded-full bg-line"
        >
          <For each={factors()}>
            {(factor) => (
              <span
                class={`absolute inset-y-0 ${factor.color} transition-[width] duration-300`}
                style={{ left: `${factor.offset}%`, width: `${factor.score}%` }}
              />
            )}
          </For>
        </span>
        <For each={factors()}>
          {(factor) => (
            <span
              title={`${factor.label}: ${factor.score}/${factor.maximum}`}
              class="absolute inset-y-0 cursor-help"
              style={{ left: `${factor.offset}%`, width: `${factor.score}%` }}
            />
          )}
        </For>
      </span>
    </Show>
  );
}

function isInfluenceOnly(match: PersonMatch) {
  return (
    match.breakdown.background_fit === null &&
    match.breakdown.shared_ground === null
  );
}

function CompanyDetailsModal(props: { company: Company; onClose: () => void }) {
  return (
    <Modal
      ariaLabel={`${props.company.name} details`}
      contentClass="max-h-[calc(100vh-2.5rem)] w-full max-w-lg overflow-y-auto animate-rise rounded-2xl border border-star/50 bg-ink-2 p-6 shadow-2xl"
      onClose={props.onClose}
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
    </Modal>
  );
}

export function Results(props: {
  jobId: string;
  input?: SearchInput;
  onReset: () => void;
}) {
  const queryClient = useQueryClient();
  const [enteredCompanyIds, setEnteredCompanyIds] = createSignal<
    ReadonlySet<string>
  >(new Set());
  const [selectedPerson, setSelectedPerson] = createSignal<Person | null>(null);
  const [selectedCompany, setSelectedCompany] = createSignal<Company | null>(
    null,
  );
  const [profile, setProfile] = createSignal(getStoredProfile());
  const [profileExpanded, setProfileExpanded] = createSignal(false);
  const [matchRunId, setMatchRunId] = createSignal<string | null>(null);
  const [matchStarted, setMatchStarted] = createSignal(false);
  const [companyRankingStage, setCompanyRankingStage] =
    createSignal<CompanyRankingStage>("exa");
  const companyCards = new Map<string, HTMLElement>();
  let previousCompanyPositions = new Map<
    string,
    { left: number; top: number }
  >();
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
      queryClient.setQueryData(["search", props.jobId], data);
    },
  }));

  const matchRun = createQuery(() => ({
    queryKey: ["match-run", props.jobId, matchRunId()],
    queryFn: () => getMatchRun(props.jobId, matchRunId() ?? ""),
    enabled: matchRunId() !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "done" || status === "failed" ? false : 1500;
    },
  }));

  const startMatching = createMutation(() => ({
    mutationFn: (nextProfile: string) =>
      startMatchRun(props.jobId, nextProfile),
    onSuccess: (run) => {
      setMatchRunId(run.id);
      setMatchStarted(true);
    },
  }));

  createEffect(() => {
    if (
      job.data?.status === "done" &&
      !matchStarted() &&
      !startMatching.isPending
    ) {
      setMatchStarted(true);
      startMatching.mutate(profile());
    }
  });

  const running = () => {
    if (job.data?.status !== "done" && job.data?.status !== "failed") {
      return true;
    }
    return (
      job.data?.status === "done" &&
      matchRun.data?.status !== "done" &&
      matchRun.data?.status !== "failed"
    );
  };

  createEffect(() => {
    if (job.data?.status !== "done") return;
    if (matchRun.data?.status === "done") {
      setCompanyRankingStage("matches");
      return;
    }
    setCompanyRankingStage((stage) => (stage === "exa" ? "people" : stage));
  });

  const rankedCompanies = createMemo(() =>
    rankCompanies(
      job.data?.companies ?? [],
      job.data?.people ?? [],
      matchRun.data?.results ?? [],
      companyRankingStage(),
    ),
  );
  const researchingPersonId = createMemo(() => {
    const run = matchRun.data;
    if (!run || !["researching", "matching"].includes(run.status)) {
      return undefined;
    }
    return run.candidate_ids?.[run.completed_count];
  });
  const companyRankingLabel = () => {
    switch (companyRankingStage()) {
      case "people":
        return "Ranked by verified key people, then hiring influence.";
      case "matches":
        return "Ranked by final match score and scored people; key-people signals break ties.";
      default:
        return "Ordered by Exa relevance.";
    }
  };

  createEffect(() => {
    // Keep the baseline current when the profile panel changes the cards' layout.
    profileExpanded();
    const companies = rankedCompanies();
    const currentPositions = new Map<string, { left: number; top: number }>();
    for (const company of companies) {
      const card = companyCards.get(company.id);
      if (!card) continue;
      const { left, top } = card.getBoundingClientRect();
      currentPositions.set(company.id, { left, top });
    }

    const reducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!reducedMotion && typeof HTMLElement.prototype.animate === "function") {
      for (const [companyId, currentPosition] of currentPositions) {
        const previousPosition = previousCompanyPositions.get(companyId);
        if (!previousPosition) continue;
        const deltaX = previousPosition.left - currentPosition.left;
        const deltaY = previousPosition.top - currentPosition.top;
        if (deltaX === 0 && deltaY === 0) continue;

        companyCards
          .get(companyId)
          ?.animate(
            [
              { transform: `translate(${deltaX}px, ${deltaY}px)` },
              { transform: "translate(0, 0)" },
            ],
            { duration: 250, easing: "ease-out" },
          );
      }
    }
    previousCompanyPositions = currentPositions;
  });

  onCleanup(() => {
    companyCards.clear();
  });

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

      <ol class="mt-6 grid grid-cols-4 gap-2 text-xs">
        <For each={STEPS}>
          {(step, i) => (
            <li
              class="relative overflow-hidden rounded-lg border px-3 py-2"
              classList={{
                "border-star bg-star/80 text-signal-ink": stepIsComplete(
                  job.data?.status,
                  matchRun.data?.status,
                  i(),
                ),
                "border-star text-star":
                  !stepIsComplete(
                    job.data?.status,
                    matchRun.data?.status,
                    i(),
                  ) &&
                  i() === stepIndex(job.data?.status, matchRun.data?.status),
                "border-line text-dim":
                  !stepIsComplete(
                    job.data?.status,
                    matchRun.data?.status,
                    i(),
                  ) && i() > stepIndex(job.data?.status, matchRun.data?.status),
              }}
            >
              {step}
              <Show
                when={
                  running() &&
                  i() === stepIndex(job.data?.status, matchRun.data?.status)
                }
              >
                <span class="absolute inset-y-0 left-0 w-1/3 animate-scan bg-star/15" />
              </Show>
            </li>
          )}
        </For>
      </ol>

      <Show
        when={job.isError || job.data?.status === "failed" || job.data?.error}
      >
        <p class="mt-6 rounded-lg border border-bad/50 p-4 text-bad">
          {job.data?.error ?? job.error?.message ?? "The search failed."}
        </p>
      </Show>

      <Show when={job.data?.status === "done"}>
        <p class="mt-3 text-sm text-dim">
          Company search complete — no more companies to load.
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
            : `Find people at ${Math.min(
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

      <section class="relative mt-6 overflow-hidden rounded-2xl border border-line bg-ink-2/60 p-5">
        <Show when={!profileExpanded()}>
          <button
            type="button"
            aria-controls="match-profile"
            aria-expanded="false"
            aria-label="Expand Sharpen your matches"
            onClick={() => setProfileExpanded(true)}
            class="absolute inset-0 z-10 cursor-pointer rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-star"
          />
        </Show>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="min-w-0">
            <h2 class="font-semibold">Sharpen your matches</h2>
            <p class="mt-1 max-w-2xl text-sm text-dim">
              We automatically research and score the top 5 people. Add a little
              about yourself for background fit and shared context; otherwise
              scores reflect decision power only.
            </p>
          </div>
          <div class="flex items-center gap-3">
            <Show when={matchRun.data}>
              {(run) => (
                <p class="font-mono text-xs text-star">
                  {run().completed_count}/{run().candidate_count} scored ·{" "}
                  {run().status}
                </p>
              )}
            </Show>
            <Show
              when={profileExpanded()}
              fallback={
                <span
                  aria-hidden="true"
                  class="inline-flex size-5 items-center justify-center leading-none text-star"
                >
                  ⌄
                </span>
              }
            >
              <button
                type="button"
                aria-controls="match-profile"
                aria-expanded="true"
                onClick={() => setProfileExpanded(false)}
                class="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-star transition hover:bg-star/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-star"
              >
                Hide
                <span
                  aria-hidden="true"
                  class="inline-flex size-5 rotate-180 items-center justify-center leading-none text-star transition-transform duration-300 motion-reduce:transition-none"
                >
                  ⌄
                </span>
              </button>
            </Show>
          </div>
        </div>
        <div
          id="match-profile"
          inert={!profileExpanded()}
          class="grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none"
          classList={{
            "grid-rows-[1fr] opacity-100": profileExpanded(),
            "grid-rows-[0fr] opacity-0": !profileExpanded(),
          }}
        >
          <div class="min-h-0 overflow-hidden">
            <label for="profile" class="mt-4 block">
              <span class="text-xs font-semibold tracking-wider text-star uppercase">
                About you (optional)
              </span>
              <textarea
                id="profile"
                value={profile()}
                onInput={(event) => {
                  const next = event.currentTarget.value;
                  setProfile(next);
                  storeProfile(next);
                }}
                maxlength="4000"
                rows="3"
                placeholder="Your role, experience, strengths, and the work you want to do…"
                class="mt-2 w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm outline-none placeholder:text-dim focus:border-star"
              />
            </label>
            <button
              type="button"
              disabled={startMatching.isPending}
              onClick={() => startMatching.mutate(profile())}
              class="mt-3 rounded-lg border border-star px-3 py-2 text-sm text-star hover:bg-star/10 disabled:opacity-50"
            >
              {startMatching.isPending
                ? "Starting research…"
                : "Refresh scores with this profile"}
            </button>
            <Show when={startMatching.isError || matchRun.data?.error}>
              <p class="mt-3 text-sm text-bad">
                {matchRun.data?.error ?? startMatching.error?.message}
              </p>
            </Show>
          </div>
        </div>
      </section>

      <div class="mt-8">
        <section class="space-y-4">
          <Show when={(job.data?.companies.length ?? 0) > 0}>
            <p class="font-mono text-xs text-dim">{companyRankingLabel()}</p>
          </Show>
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
          <For each={rankedCompanies()}>
            {(company, i) => {
              const people = () =>
                job.data?.people.filter(
                  (person) => person.company_id === company.id,
                ) ?? [];
              const isResearchingPeople = () =>
                job.data?.status === "finding_people" &&
                i() <
                  (job.data.people_search_stats.companies_searched ?? 0) +
                    (job.data.people_search_stats.batch_size ?? 0);

              return (
                <article
                  ref={(element) => companyCards.set(company.id, element)}
                  class="group overflow-hidden rounded-2xl border border-line bg-ink-2/60"
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
                    <div>
                      <h2 class="text-xl font-semibold">{company.name}</h2>
                      <Show
                        when={people().length > 0 || !isResearchingPeople()}
                      >
                        <button
                          type="button"
                          aria-haspopup="dialog"
                          aria-label={`About ${company.name}`}
                          onClick={() => setSelectedCompany(company)}
                          class="mt-1 text-xs text-dim opacity-0 transition hover:text-star group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-star"
                        >
                          About
                        </button>
                      </Show>
                    </div>
                    <a
                      href={company.url}
                      target="_blank"
                      rel="noreferrer"
                      class="text-xs text-dim hover:text-star"
                    >
                      visit ↗
                    </a>
                  </div>
                  <Show when={people().length > 0}>
                    <People
                      people={people()}
                      onSelect={setSelectedPerson}
                      matches={matchRun.data?.results ?? []}
                      matchRunComplete={matchRun.data?.status === "done"}
                      researchingPersonId={researchingPersonId()}
                    />
                  </Show>
                  <Show when={isResearchingPeople() && people().length === 0}>
                    <p class="border-t border-line px-5 pt-4 pb-2 text-sm text-dim">
                      {company.summary}
                    </p>
                  </Show>
                  <Show when={isResearchingPeople()}>
                    <p class="border-t border-line px-5 py-3 font-mono text-xs text-dim animate-pulse">
                      Researching key people…
                    </p>
                  </Show>
                </article>
              );
            }}
          </For>
        </section>
      </div>

      <Show when={selectedPerson()}>
        {(person) => (
          <Modal
            ariaLabel={`${person().name} details`}
            contentClass="max-h-[calc(100vh-2.5rem)] w-full max-w-2xl overflow-y-auto"
            onClose={() => setSelectedPerson(null)}
          >
            <InsightsPanel
              jobId={props.jobId}
              person={person()}
              score={person().decision_power_score}
              match={matchRun.data?.results.find(
                (match) => match.id === person().id,
              )}
              onClose={() => setSelectedPerson(null)}
            />
          </Modal>
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
