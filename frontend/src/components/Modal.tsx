import { type JSX, onCleanup, onMount } from "solid-js";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

function focusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((element) => element.getAttribute("aria-hidden") !== "true");
}

export function Modal(props: {
  ariaLabel: string;
  children: JSX.Element;
  contentClass: string;
  overlayClass?: string;
  onClose: () => void;
}) {
  let dialog: HTMLElement | undefined;
  let opener: HTMLElement | null = null;

  onMount(() => {
    opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog?.focus();
  });

  onCleanup(() => {
    if (opener?.isConnected) opener.focus();
  });

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      props.onClose();
      return;
    }

    if (event.key !== "Tab" || !dialog) return;

    const focusable = focusableElements(dialog);
    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable.at(-1);
    if (!last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      class={`fixed inset-0 z-50 grid place-items-center bg-paper/35 p-5 ${props.overlayClass ?? ""}`}
    >
      <button
        type="button"
        aria-label="Close dialog"
        class="absolute inset-0 cursor-default"
        onClick={props.onClose}
      />
      <section
        ref={dialog}
        class={`relative ${props.contentClass}`}
        role="dialog"
        aria-modal="true"
        aria-label={props.ariaLabel}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {props.children}
      </section>
    </div>
  );
}
