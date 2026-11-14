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
  listId: string;
}) {
  const [open, setOpen] = createSignal(false);
  const [active, setActive] = createSignal(0);

  const suggestions = createMemo(() => props.search(props.value));
  const visible = () => open() && suggestions().length > 0;

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
      setActive((i) => (i - 1 + count) % count);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(active());
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div class="relative">
      <input
        class="field"
        placeholder={props.placeholder}
        role="combobox"
        aria-expanded={visible()}
        aria-autocomplete="list"
        aria-controls={props.listId}
        autocomplete="off"
        value={props.value}
        onInput={(e) => {
          props.onChange(e.currentTarget.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setOpen(false)}
      />
      <Show when={visible()}>
        <ul
          id={props.listId}
          role="listbox"
          class="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-line bg-ink-2 shadow-2xl"
        >
          <For each={suggestions()}>
            {(c, i) => (
              <li
                role="option"
                aria-selected={i() === active()}
                class="cursor-pointer px-4 py-2 text-sm"
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
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}
