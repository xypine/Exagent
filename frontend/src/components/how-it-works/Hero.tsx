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
          class="group flex flex-col items-center gap-2 text-s tracking-[0.25em] text-dim uppercase transition hover:text-star"
        >
          How it works
          <span class="grid size-9 place-items-center rounded-full border border-line transition group-hover:border-star">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="animate-float"
              aria-hidden="true"
            >
              <path d="M12 5v14" />
              <path d="m19 12-7 7-7-7" />
            </svg>
          </span>
        </a>
      </div>
    </div>
  );
}
