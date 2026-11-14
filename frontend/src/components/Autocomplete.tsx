import { createMemo, createSignal, For, Show } from "solid-js";

export type Suggestion = {
  /** Text put into the input when picked. */
  value: string;
  label: string;
  /** Dimmed text shown after the label, e.g. the country. */
  hint?: string;
};

export function Autocomplete(props: {
  value: string;
  onChange: (value: string) => void;
  search: (query: string) => Suggestion[];
  placeholder?: string;
  clearLabel?: string;
  showAllOnFocus?: boolean;
  listId: string;
  inputId?: string;
}) {
  const [open, setOpen] = createSignal(false);
  const [active, setActive] = createSignal(-1);
  const [showAll, setShowAll] = createSignal(false);
  let inputRef: HTMLInputElement | undefined;

  const suggestions = createMemo(() =>
    props.search(showAll() ? "" : props.value),
  );
  const visible = () => open() && suggestions().length > 0;
  const activeOptionId = () =>
    visible() && active() >= 0
      ? `${props.listId}-option-${active()}`
      : undefined;

  const openAll = () => {
    if (!props.showAllOnFocus) return;
    setShowAll(true);
    setActive(-1);
    setOpen(true);
  };

  const pick = (index: number) => {
    const match = suggestions()[index];
    if (!match) return;
    props.onChange(match.value);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!visible()) return;
    const count = suggestions().length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % count);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? count : i) - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(active());
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div class="group relative">
      <input
        ref={inputRef}
        class="field"
        classList={{ "pr-10": props.clearLabel !== undefined }}
        id={props.inputId}
        placeholder={props.placeholder}
        role="combobox"
        aria-expanded={visible()}
        aria-autocomplete="list"
        aria-controls={props.listId}
        aria-activedescendant={activeOptionId()}
        autocomplete="off"
        value={props.value}
        onInput={(e) => {
          props.onChange(e.currentTarget.value);
          setShowAll(false);
          setActive(-1);
          setOpen(true);
        }}
        onFocus={openAll}
        onClick={openAll}
        onKeyDown={onKeyDown}
        onBlur={() => {
          setOpen(false);
          setActive(-1);
        }}
      />
      <Show when={props.value && props.clearLabel}>
        <button
          type="button"
          aria-label={props.clearLabel}
          class="pointer-events-none absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-xl text-dim opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 hover:bg-line hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
          onClick={() => {
            props.onChange("");
            setOpen(false);
            setActive(-1);
            inputRef?.focus();
          }}
        >
          <span aria-hidden="true">×</span>
        </button>
      </Show>
      <Show when={visible()}>
        <div
          id={props.listId}
          role="listbox"
          class="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-line bg-ink-2 shadow-2xl"
          onMouseLeave={() => setActive(-1)}
        >
          <For each={suggestions()}>
            {(c, i) => (
              <button
                id={`${props.listId}-option-${i()}`}
                type="button"
                role="option"
                aria-selected={i() === active()}
                tabIndex={-1}
                class="block w-full cursor-pointer px-4 py-2 text-left text-sm"
                classList={{ "bg-line text-signal": i() === active() }}
                onMouseEnter={() => setActive(i())}
                // mousedown fires before the input's blur, which would close the list.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(i());
                }}
              >
                {c.label}
                <Show when={c.hint}>
                  <span class="text-dim">, {c.hint}</span>
                </Show>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
