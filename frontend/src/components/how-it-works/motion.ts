import { onCleanup, onMount } from "solid-js";

let observer: IntersectionObserver | undefined;

/** `ref={reveal}` — fades/blurs an element in the first time it scrolls into view. */
export function reveal(el: HTMLElement) {
  el.classList.add("reveal");
  if (typeof IntersectionObserver === "undefined") {
    el.dataset.in = "true";
    return;
  }
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        (entry.target as HTMLElement).dataset.in = "true";
        observer?.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.15 },
  );
  observer.observe(el);
}

/**
 * Writes scroll progress (0 → 1 over the element's own height) into the
 * `--recede` CSS variable so the hero can sink away as the page scrolls.
 */
export function createRecede(el: () => HTMLElement | undefined) {
  onMount(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const node = el();
      if (!node) return;
      const h = Math.max(node.offsetHeight, 1);
      const p = Math.min(1, Math.max(0, window.scrollY / (h * 0.85)));
      node.style.setProperty("--recede", p.toFixed(3));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    onCleanup(() => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    });
  });
}
