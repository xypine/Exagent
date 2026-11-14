import type { JSX } from "solid-js";

import { createRecede } from "./motion";

/** Wraps the existing search section: it gently recedes as you scroll to "How it works". */
export function RecedingHero(props: { children: JSX.Element }) {
  let el: HTMLDivElement | undefined;
  createRecede(() => el);

  return (
    <div ref={el} class="recede">
      {props.children}
      <div class="flex justify-center pb-10">
        <a
          href="#how-it-works"
          class="group flex flex-col items-center gap-2 font-mono text-xs tracking-[0.25em] text-dim uppercase transition hover:text-signal"
        >
          How it works
          <span class="grid size-9 place-items-center rounded-full border border-line transition group-hover:border-signal">
            <span class="animate-float">↓</span>
          </span>
        </a>
      </div>
    </div>
  );
}
