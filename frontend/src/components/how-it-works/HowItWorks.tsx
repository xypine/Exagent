import { createSignal, For, onCleanup, onMount } from "solid-js";

import { LIMITS, STEPS, TRUST } from "../../howItWorks";
import { reveal } from "./motion";
import { PipelineStage } from "./PipelineStage";
import { ScoreSimulator } from "./ScoreSimulator";

export function HowItWorks(props: { onTryIt?: () => void }) {
  const [step, setStep] = createSignal(0);
  const stepEls: HTMLElement[] = [];
  let visualEl: HTMLDivElement | undefined;

  onMount(() => {
    if (typeof IntersectionObserver === "undefined") return;
    // Activates the step whose text crosses a line just below mid-screen.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setStep(Number((e.target as HTMLElement).dataset.step));
          }
        }
      },
      { rootMargin: "-58% 0px -40% 0px" },
    );
    for (const el of stepEls) io.observe(el);
    onCleanup(() => io.disconnect());
  });

  const jump = (i: number) => {
    const target = stepEls[i];
    if (!target) return;
    if (window.innerWidth >= 1024) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // The visualization covers the top half of the single-column layout.
    // Place the card below it rather than centering the card underneath it.
    const card = target.querySelector<HTMLElement>(".step-card") ?? target;
    const top =
      window.scrollY +
      card.getBoundingClientRect().top -
      (visualEl?.offsetHeight ?? 0) -
      24;
    window.scrollTo({ top, behavior: "smooth" });
  };

  const tryIt = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    props.onTryIt?.();
  };

  return (
    <section id="how-it-works" class="relative scroll-mt-4">
      <div class="seam pointer-events-none absolute inset-x-0 -top-32 h-64" />

      <div class="mx-auto max-w-6xl px-6 pt-24">
        <div ref={reveal} class="max-w-3xl">
          <p class="text-xs tracking-[0.25em] text-signal uppercase">
            How it works
          </p>
          <h2 class="mt-3 text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl">
            From a city and a hunch to{" "}
            <span class="text-signal">people worth messaging.</span>
          </h2>
          <p class="mt-5 max-w-2xl text-lg leading-8 text-dim">
            You want to send open applications but don't know to whom. Exagent
            finds the people in your area and industry who are worth reaching
            out to, and tells you why and how sure it is.
          </p>
        </div>

        {/* Scrollytelling: sticky visual + scrolling steps */}
        <div class="mt-16 grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
          <div
            ref={visualEl}
            class="sticky top-2 z-20 h-[min(54vh,460px)] bg-ink/90 py-2 backdrop-blur lg:top-[12vh] lg:h-[min(76vh,640px)] lg:bg-transparent lg:py-0 lg:backdrop-blur-none"
          >
            <PipelineStage step={step()} onJump={jump} />
          </div>

          <ol class="relative pb-[20vh]">
            <For each={STEPS}>
              {(s, i) => (
                <li
                  ref={(el) => {
                    stepEls[i()] = el;
                  }}
                  data-step={i()}
                  class="flex min-h-[70vh] items-center py-6 lg:min-h-[80vh]"
                >
                  <div
                    class="step-card w-full rounded-2xl border p-6 transition duration-500"
                    classList={{
                      "border-signal/60 bg-ink-2/80 opacity-100":
                        step() === i(),
                      "border-line/60 bg-ink-2/30 opacity-40": step() !== i(),
                    }}
                  >
                    <p class="text-xs text-signal">{s.n}</p>
                    <h3 class="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                      {s.title}
                    </h3>
                    <p class="mt-3 leading-7 text-dim">{s.body}</p>
                    {i() === 4 && (
                      <p class="mt-4 border-l-2 border-signal pl-3 text-sm text-dim">
                        They don't need to know your field. A CFO at a software
                        company can be a great contact for a developer: the
                        company hires developers, and the CFO approves the
                        hires.
                      </p>
                    )}
                  </div>
                </li>
              )}
            </For>
          </ol>
        </div>

        <div class="mt-8">
          <ScoreSimulator />
        </div>

        {/* Trust + limits */}
        <div class="mt-28 grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div ref={reveal}>
            <p class="text-xs tracking-[0.25em] text-signal uppercase">
              Why you can trust it
            </p>
            <h3 class="mt-2 text-3xl font-bold tracking-tight">
              Transparent by design.
            </h3>
            <ul class="mt-8 grid gap-3 sm:grid-cols-2">
              <For each={TRUST}>
                {(t, i) => (
                  <li
                    ref={reveal}
                    class="rounded-2xl border border-line bg-ink-2/50 p-5 sm:last:col-span-2"
                    style={{ "transition-delay": `${i() * 70}ms` }}
                  >
                    <p class="font-semibold">{t.title}</p>
                    <p class="mt-1 text-sm leading-6 text-dim">{t.body}</p>
                  </li>
                )}
              </For>
            </ul>
          </div>
          <div ref={reveal} class="lg:pt-16">
            <div class="rounded-2xl border border-dashed border-line p-6">
              <p class="text-xs tracking-[0.25em] text-dim uppercase">
                Limits, said out loud
              </p>
              <ul class="mt-4 space-y-3">
                <For each={LIMITS}>
                  {(l) => (
                    <li class="flex gap-3 text-sm leading-6">
                      <span class="text-signal">—</span>
                      <span>{l}</span>
                    </li>
                  )}
                </For>
              </ul>
            </div>
          </div>
        </div>

        {/* Closing CTA */}
        <div
          ref={reveal}
          class="cta relative mt-28 overflow-hidden rounded-3xl border border-signal/40 px-6 py-16 text-center"
        >
          <h3 class="text-4xl font-bold tracking-tight sm:text-5xl">
            Your next open application starts here.
          </h3>
          <p class="mx-auto mt-3 max-w-md text-dim">
            A city, an industry, a few lines about you. That's all it takes.
          </p>
          <button
            type="button"
            onClick={tryIt}
            class="mt-8 rounded-xl bg-signal px-7 py-3.5 font-semibold text-signal-ink transition hover:brightness-110"
          >
            Try it now ↑
          </button>
        </div>
      </div>
    </section>
  );
}
