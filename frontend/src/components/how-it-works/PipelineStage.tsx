import { createEffect, createMemo, createSignal, For, Show } from "solid-js";

import {
  CONFIDENCE_LABEL,
  confidenceFor,
  contributions,
  DEMO_COMPANIES,
  DEMO_PEOPLE,
  type DemoPerson,
  FACTORS,
  matchScore,
  STEPS,
  WEIGHTS,
} from "../../howItWorks";

/** Column centres (%) for the four demo companies. */
const CX = [14, 38, 62, 86];
const COMPANY_Y = 15;
const YOU_Y = 90;
const personY = (slot: number) => 34 + slot * 16;

/** Deterministic "web noise" dots that converge into companies in step 2. */
const DOTS = Array.from({ length: 40 }, (_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12345.6789;
  return {
    x: 5 + (a - Math.floor(a)) * 90,
    y: 6 + (b - Math.floor(b)) * 74,
    c: i % 4,
  };
});

type Ranked = DemoPerson & { score: number; slot: number; rank: number };

const FACTOR_BG = {
  decision: "bg-signal",
  fit: "bg-fit",
  shared: "bg-shared",
} as const;

export function PipelineStage(props: {
  step: number;
  onJump: (step: number) => void;
}) {
  const people: Ranked[] = (() => {
    const slots = [0, 0, 0, 0];
    const withScore = DEMO_PEOPLE.map((p) => ({
      ...p,
      score: matchScore(p.scores, true),
      slot: slots[p.company]++,
      rank: 0,
    }));
    [...withScore]
      .sort((a, b) => b.score - a.score)
      .forEach((p, i) => {
        p.rank = i;
      });
    return withScore;
  })();

  const [selected, setSelected] = createSignal<string | null>(null);
  createEffect(() => {
    if (props.step !== 5) setSelected(null);
  });
  const selectedPerson = createMemo(() =>
    people.find((p) => p.id === selected()),
  );

  const nodeStyle = (p: Ranked) => {
    const s = props.step;
    if (s === 5) {
      return {
        left: "3%",
        top: `calc(8% + ${p.rank} * var(--row-gap))`,
        width: "94%",
        height: "var(--row)",
        "border-radius": "0.75rem",
        opacity: "1",
        transform: "scale(1)",
        "transition-delay": `${p.rank * 45}ms`,
      };
    }
    const shown = s >= 2;
    const y = shown ? personY(p.slot) : COMPANY_Y;
    return {
      left: `calc(${CX[p.company]}% - var(--node) / 2)`,
      top: `calc(${y}% - var(--node) / 2)`,
      width: "var(--node)",
      height: "var(--node)",
      "border-radius": "999px",
      opacity: shown ? "1" : "0",
      transform: shown ? "scale(1)" : "scale(0.2)",
      "transition-delay": `${(p.company * 3 + p.slot) * 45}ms`,
    };
  };

  return (
    <div class="flex h-full flex-col gap-3">
      <div class="flex items-center gap-1.5" role="tablist" aria-label="Steps">
        <For each={STEPS}>
          {(step, i) => (
            <button
              type="button"
              role="tab"
              aria-selected={props.step === i()}
              aria-label={`${step.n} ${step.title}`}
              onClick={() => props.onJump(i())}
              class="group relative h-8 flex-1 overflow-hidden rounded-md border text-[10px] transition"
              classList={{
                "border-star text-signal-ink shadow-card": props.step === i(),
                "border-star/70 bg-star/10 font-semibold text-star":
                  props.step > i(),
                "border-signal/25 bg-ink-2 text-dim hover:border-star/60":
                  props.step < i(),
              }}
            >
              <span
                class="absolute inset-0 origin-left bg-gradient-to-r from-signal to-star transition-transform duration-500"
                style={{
                  transform: `scaleX(${props.step === i() ? 1 : 0})`,
                }}
              />
              <span class="relative">{step.n}</span>
            </button>
          )}
        </For>
      </div>

      <div class="stage relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-line">
        <div class="stage-grid pointer-events-none absolute inset-0" />

        <p class="absolute top-3 left-4 z-10 text-[13px] tracking-[0.1em] text-star uppercase text font-extrabold">
          {STEPS[props.step]?.label}
        </p>

        {/* Web noise → companies */}
        <For each={DOTS}>
          {(d, i) => (
            <span
              class="stage-dot absolute size-1 rounded-full bg-paper"
              style={{
                left: `${props.step === 0 ? d.x : CX[d.c]}%`,
                top: `${props.step === 0 ? d.y : COMPANY_Y + 30}%`,
                opacity: props.step === 0 ? "0.28" : "0",
                "transition-delay": `${i() * 18}ms`,
              }}
            />
          )}
        </For>

        {/* Connection lines */}
        <svg
          class="pointer-events-none absolute inset-0 size-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <For each={CX}>
            {(x) => (
              <line
                x1={50}
                y1={YOU_Y}
                x2={x}
                y2={props.step === 1 ? COMPANY_Y + 30 : COMPANY_Y}
                class="stage-line beam"
                style={{ opacity: props.step === 1 ? "0.7" : "0" }}
              />
            )}
          </For>
          <For each={CX}>
            {(x) => (
              <line
                x1={x}
                y1={COMPANY_Y + 3}
                x2={x}
                y2={personY(2)}
                class="stage-line"
                style={{
                  opacity: props.step >= 2 && props.step <= 3 ? "0.6" : "0",
                }}
              />
            )}
          </For>
          <For each={people}>
            {(p) => (
              <line
                x1={50}
                y1={YOU_Y}
                x2={CX[p.company]}
                y2={personY(p.slot)}
                class="stage-line beam"
                style={{
                  opacity:
                    props.step === 4 ? String(0.15 + p.score / 140) : "0",
                }}
              />
            )}
          </For>
        </svg>

        {/* Companies */}
        <For each={DEMO_COMPANIES}>
          {(name, i) => (
            <div
              class="stage-node absolute z-10 flex items-center gap-1.5 rounded-full border border-signal/60 bg-ink-2 px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap shadow-lg sm:text-xs"
              style={{
                left: `${CX[i()]}%`,
                top: `${props.step === 1 ? COMPANY_Y + 30 : props.step >= 5 ? -5 : COMPANY_Y}%`,
                opacity: props.step >= 1 && props.step <= 4 ? "1" : "0",
                transform: `translate(-50%, -50%) scale(${props.step >= 1 ? 1 : 0.6})`,
                "transition-delay": `${i() * 90}ms`,
              }}
            >
              <span class="size-1.5 rounded-sm bg-signal" />
              {name}
            </div>
          )}
        </For>

        {/* You */}
        <div
          class="stage-node absolute z-10 flex items-center gap-1.5 rounded-full border-2 border-star bg-ink-2 px-3 py-1.5 text-[10px] whitespace-nowrap shadow-[0_0_40px_-8px_var(--color-star)] sm:text-xs"
          style={{
            left: "50%",
            top: `${props.step === 0 ? 50 : props.step >= 5 ? 110 : YOU_Y}%`,
            opacity: props.step >= 5 ? "0" : "1",
            transform: `translate(-50%, -50%) scale(${props.step === 0 ? 1.25 : 0.9})`,
          }}
        >
          <span class="font-semibold text-star">YOU</span>
          <span class="rounded-full border border-star/30 bg-star/10 px-2 py-0.5">
            Helsinki
          </span>
          <span class="rounded-full border border-star/30 bg-star/10 px-2 py-0.5">
            SaaS
          </span>
          <span class="rounded-full border border-dashed border-star/60 px-2 py-0.5 text-star">
            + about you
          </span>
        </div>

        {/* People */}
        <For each={people}>
          {(p) => {
            const c = contributions(p.scores, true);
            const conf = confidenceFor(p.sources);
            return (
              <button
                type="button"
                tabIndex={props.step === 5 ? 0 : -1}
                aria-label={`${p.name}, ${p.title}, score ${p.score}`}
                onClick={() => props.step === 5 && setSelected(p.id)}
                class="stage-node absolute z-10 flex items-center gap-2.5 border bg-ink-2 text-left"
                classList={{
                  "border-star": selected() === p.id,
                  "border-signal/25 shadow-card hover:border-star/70 cursor-pointer":
                    props.step === 5 && selected() !== p.id,
                  "border-transparent": props.step !== 5,
                  "cursor-default": props.step !== 5,
                }}
                style={nodeStyle(p)}
              >
                <span
                  class="relative grid aspect-square h-full shrink-0 place-items-center rounded-full transition-[background] duration-700"
                  style={{
                    background:
                      props.step >= 4
                        ? `conic-gradient(var(--color-signal) ${p.score}%, var(--color-line) 0)`
                        : "var(--color-line)",
                  }}
                >
                  <span
                    class="absolute inset-[2px] grid place-items-center rounded-full bg-ink-2 text-[9px] sm:text-[10px]"
                    classList={{
                      "outline outline-1 outline-dashed outline-bad/70 outline-offset-2":
                        props.step === 3 && p.sources <= 1,
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="size-1/2"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="8" r="5" />
                      <path d="M20 21a8 8 0 0 0-16 0" />
                    </svg>
                  </span>
                  {/* Sources orbiting during research */}
                  <span
                    class="pointer-events-none absolute -inset-2 animate-orbit transition-opacity duration-500"
                    style={{ opacity: props.step === 3 ? "1" : "0" }}
                  >
                    <For each={Array.from({ length: p.sources })}>
                      {(_, k) => {
                        const a = (k() / p.sources) * Math.PI * 2;
                        return (
                          <span
                            class="absolute size-1.5 rounded-full bg-fit"
                            style={{
                              left: `${50 + 50 * Math.cos(a)}%`,
                              top: `${50 + 50 * Math.sin(a)}%`,
                              transform: "translate(-50%, -50%)",
                            }}
                          />
                        );
                      }}
                    </For>
                  </span>
                  <span
                    class="absolute -top-2 -right-3 rounded bg-signal px-1 text-[9px] font-semibold text-signal-ink transition-opacity duration-500"
                    style={{ opacity: props.step === 4 ? "1" : "0" }}
                  >
                    {p.score}
                  </span>
                </span>

                <span
                  class="flex min-w-0 flex-1 items-center gap-3 overflow-hidden pr-3 transition-opacity duration-500"
                  style={{ opacity: props.step === 5 ? "1" : "0" }}
                >
                  <span class="w-5 shrink-0 text-[10px] text-dim">
                    #{p.rank + 1}
                  </span>
                  <span class="min-w-0 flex-1 truncate text-xs sm:text-sm">
                    <span class="font-medium">{p.name}</span>
                    <span class="ml-2 hidden text-[10px] text-dim sm:inline">
                      {p.title} · {DEMO_COMPANIES[p.company]}
                    </span>
                  </span>
                  <span class="hidden h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-line sm:flex lg:w-28">
                    <For each={FACTORS}>
                      {(f) => (
                        <span
                          class={FACTOR_BG[f.key]}
                          style={{ width: `${c[f.key]}%` }}
                        />
                      )}
                    </For>
                  </span>
                  <span class="w-6 shrink-0 text-right text-xs font-semibold text-star">
                    {p.score}
                  </span>
                  <span
                    class="size-2 shrink-0 rounded-full"
                    title={CONFIDENCE_LABEL[conf]}
                    classList={{
                      "bg-ok": conf === "high",
                      "bg-signal": conf === "medium",
                      "bg-bad": conf === "low",
                    }}
                  />
                </span>
              </button>
            );
          }}
        </For>

        {/* Detail card for the shortlist */}
        <Show when={props.step === 5 ? selectedPerson() : undefined}>
          {(p) => {
            const conf = confidenceFor(p().sources);
            return (
              <div class="animate-rise absolute inset-x-2 bottom-2 z-30 max-h-[80%] overflow-auto rounded-2xl border border-star/60 bg-ink/95 p-4 shadow-2xl backdrop-blur sm:inset-x-4 sm:bottom-4 sm:p-5">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-[10px] tracking-widest text-star uppercase">
                      #{p().rank + 1} on your shortlist
                    </p>
                    <h4 class="mt-1 text-lg font-semibold">{p().name}</h4>
                    <p class="text-sm text-dim">
                      {p().title} · {DEMO_COMPANIES[p().company]}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-3xl font-bold text-star">{p().score}</p>
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      class="text-[10px] text-dim hover:text-paper"
                    >
                      close ✕
                    </button>
                  </div>
                </div>
                <span
                  class="mt-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px]"
                  classList={{
                    "border-ok/60 text-ok": conf === "high",
                    "border-star/60 text-star": conf === "medium",
                    "border-bad/60 text-bad": conf === "low",
                  }}
                >
                  ● {CONFIDENCE_LABEL[conf]} · {p().sources}/5 sources
                </span>
                <div class="mt-4 grid gap-2">
                  <For each={FACTORS}>
                    {(f) => (
                      <div class="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-2 text-xs">
                        <span class="text-dim">
                          {f.label}{" "}
                          <span class="text-[10px]">{WEIGHTS[f.key]}%</span>
                        </span>
                        <span class="h-1.5 overflow-hidden rounded-full bg-line">
                          <span
                            class={`block h-full ${FACTOR_BG[f.key]}`}
                            style={{ width: `${p().scores[f.key]}%` }}
                          />
                        </span>
                        <span class="text-right">{p().scores[f.key]}</span>
                      </div>
                    )}
                  </For>
                </div>
                <ul class="mt-4 space-y-1.5 text-sm">
                  <For each={p().reasons}>
                    {(r) => (
                      <li class="flex flex-wrap items-center gap-2">
                        <span>{r.claim}</span>
                        <span class="rounded bg-fit/15 px-1.5 py-0.5 text-[10px] text-fit">
                          {r.source}
                        </span>
                      </li>
                    )}
                  </For>
                </ul>
                <p class="mt-3 rounded-lg bg-star/10 px-3 py-2 text-sm">
                  <span class="mr-1 text-star">✦ Opening angle:</span>
                  {p().angle}
                </p>
                <p class="mt-2 text-[10px] text-dim">
                  Missing:{" "}
                  {p().missing.length
                    ? p().missing.join(", ")
                    : "nothing major"}
                </p>
              </div>
            );
          }}
        </Show>
      </div>
    </div>
  );
}
