import { createMemo, createSignal, For, Show } from "solid-js";

import {
  CONFIDENCE_LABEL,
  confidenceFor,
  contributions,
  FACTORS,
  type FactorKey,
  type FactorScores,
  matchScore,
  SIM_PRESETS,
  SOURCE_TYPES,
  WEIGHTS,
} from "../../howItWorks";
import { reveal } from "./motion";

const FACTOR_VAR: Record<FactorKey, string> = {
  decision: "var(--color-signal)",
  fit: "var(--color-fit)",
  shared: "var(--color-shared)",
};

export function ScoreSimulator() {
  const first = SIM_PRESETS[0];
  const [preset, setPreset] = createSignal(0);
  const [scores, setScores] = createSignal<FactorScores>({ ...first.scores });
  const [hasProfile, setHasProfile] = createSignal(true);
  const [found, setFound] = createSignal<boolean[]>(
    SOURCE_TYPES.map((_, i) => i < first.found),
  );

  const score = createMemo(() => matchScore(scores(), hasProfile()));
  const parts = createMemo(() => contributions(scores(), hasProfile()));
  const foundCount = () => found().filter(Boolean).length;
  const confidence = () => confidenceFor(foundCount());

  const applyPreset = (i: number) => {
    const p = SIM_PRESETS[i];
    setPreset(i);
    setScores({ ...p.scores });
    setFound(SOURCE_TYPES.map((_, k) => k < p.found));
  };

  const setFactor = (key: FactorKey, value: number) => {
    setPreset(-1);
    setScores((s) => ({ ...s, [key]: value }));
  };

  const R = 54;
  const CIRC = 2 * Math.PI * R;

  return (
    <div
      ref={reveal}
      class="grid gap-6 rounded-3xl border border-line bg-ink-2/60 p-5 backdrop-blur sm:p-8 lg:grid-cols-[1.15fr_1fr] lg:gap-10"
    >
      <div class="space-y-6">
        <div>
          <p class="font-mono text-xs tracking-[0.25em] text-signal uppercase">
            Try the scoring
          </p>
          <h3 class="mt-2 text-3xl font-bold tracking-tight">
            Move the dials. Watch the maths.
          </h3>
          <p class="mt-2 text-dim">
            The AI rates three factors. Fixed rules add them up.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <For each={SIM_PRESETS}>
            {(p, i) => (
              <button
                type="button"
                onClick={() => applyPreset(i())}
                class="rounded-full border px-3 py-1.5 text-xs transition"
                classList={{
                  "border-signal bg-signal/10 text-signal": preset() === i(),
                  "border-line text-dim hover:border-signal/60":
                    preset() !== i(),
                }}
              >
                {p.label}
              </button>
            )}
          </For>
        </div>

        <div class="space-y-5">
          <For each={FACTORS}>
            {(f) => {
              const off = () => !hasProfile() && f.key !== "decision";
              return (
                <label
                  class="block space-y-2 transition-opacity"
                  classList={{ "opacity-35": off() }}
                >
                  <span class="flex items-baseline justify-between gap-3">
                    <span>
                      <span class="font-semibold">{f.label}</span>
                      <span class="ml-2 font-mono text-xs text-dim">
                        {hasProfile()
                          ? `${WEIGHTS[f.key]} %`
                          : f.key === "decision"
                            ? "100 %"
                            : "off"}
                      </span>
                      <span class="block text-xs text-dim">{f.question}</span>
                    </span>
                    <span class="font-mono text-lg">{scores()[f.key]}</span>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    disabled={off()}
                    value={scores()[f.key]}
                    onInput={(e) =>
                      setFactor(f.key, Number(e.currentTarget.value))
                    }
                    class="range"
                    style={{
                      "--c": FACTOR_VAR[f.key],
                      "--v": `${scores()[f.key]}%`,
                    }}
                  />
                </label>
              );
            }}
          </For>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            role="switch"
            aria-checked={hasProfile()}
            onClick={() => setHasProfile((v) => !v)}
            class="flex items-center gap-3 rounded-xl border border-line p-3 text-left text-sm transition hover:border-signal/60"
          >
            <span
              class="relative h-5 w-9 shrink-0 rounded-full transition"
              classList={{
                "bg-signal": hasProfile(),
                "bg-line": !hasProfile(),
              }}
            >
              <span
                class="absolute top-0.5 size-4 rounded-full bg-ink transition-all"
                style={{ left: hasProfile() ? "1.125rem" : "0.125rem" }}
              />
            </span>
            I wrote about myself
          </button>
          <div class="rounded-xl border border-line p-3">
            <p class="font-mono text-[10px] tracking-widest text-dim uppercase">
              Sources found
            </p>
            <div class="mt-2 flex flex-wrap gap-1.5">
              <For each={SOURCE_TYPES}>
                {(s, i) => (
                  <button
                    type="button"
                    aria-pressed={found()[i()]}
                    onClick={() =>
                      setFound((f) => f.map((v, k) => (k === i() ? !v : v)))
                    }
                    class="rounded px-1.5 py-0.5 font-mono text-[10px] transition"
                    classList={{
                      "bg-fit/20 text-fit": found()[i()],
                      "border border-dashed border-line text-dim line-through":
                        !found()[i()],
                    }}
                  >
                    {s}
                  </button>
                )}
              </For>
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-col items-center justify-center gap-5 rounded-2xl border border-line bg-ink p-6 text-center">
        <div class="relative size-44">
          <svg
            viewBox="0 0 120 120"
            class="size-full -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke="var(--color-line)"
              stroke-width="8"
            />
            <circle
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke="var(--color-signal)"
              stroke-width="8"
              stroke-linecap="round"
              stroke-dasharray={String(CIRC)}
              stroke-dashoffset={String(CIRC * (1 - score() / 100))}
              class="transition-[stroke-dashoffset] duration-500"
            />
          </svg>
          <div class="absolute inset-0 grid place-items-center">
            <div>
              <p class="font-mono text-5xl font-bold" aria-live="polite">
                {score()}
              </p>
              <p class="font-mono text-[10px] text-dim">/ 100 match</p>
            </div>
          </div>
        </div>

        <span
          class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs"
          classList={{
            "border-ok/60 text-ok": confidence() === "high",
            "border-signal/60 text-signal": confidence() === "medium",
            "border-bad/60 text-bad": confidence() === "low",
          }}
        >
          ● {CONFIDENCE_LABEL[confidence()]}
        </span>
        <p class="-mt-3 max-w-xs text-xs text-dim">
          Confidence shows how much we found, not how good the match is.
        </p>

        <div class="w-full space-y-2">
          <div class="flex h-3 w-full overflow-hidden rounded-full bg-line">
            <For each={FACTORS}>
              {(f) => (
                <span
                  class="h-full transition-[width] duration-500"
                  style={{
                    width: `${parts()[f.key]}%`,
                    background: FACTOR_VAR[f.key],
                  }}
                />
              )}
            </For>
          </div>
          <p class="font-mono text-xs text-dim">
            <For each={FACTORS}>
              {(f, i) => (
                <>
                  <Show when={i() > 0}> + </Show>
                  <span style={{ color: FACTOR_VAR[f.key] }}>
                    {Math.round(parts()[f.key])}
                  </span>
                </>
              )}
            </For>{" "}
            = <span class="text-paper">{score()}</span>
          </p>
        </div>

        <p class="min-h-10 max-w-sm text-sm">
          <Show
            when={hasProfile()}
            fallback={
              <span class="text-signal">
                No profile, so only decision power counts. Add a few lines about
                yourself for a sharper match.
              </span>
            }
          >
            {preset() >= 0
              ? SIM_PRESETS[preset()].note
              : "Your own mix. Every point traces back to a sub-score."}
          </Show>
        </p>
      </div>
    </div>
  );
}
