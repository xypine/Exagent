import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@solidjs/testing-library";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSearch } from "../api";
import { INDUSTRIES } from "../industries";
import { SearchForm } from "./SearchForm";

vi.mock("../api", () => ({ createSearch: vi.fn() }));

const createSearchMock = vi.mocked(createSearch);

describe("SearchForm", () => {
  afterEach(cleanup);

  afterEach(() => vi.useRealTimers());

  beforeEach(() => {
    createSearchMock.mockReset();
    createSearchMock.mockResolvedValue({
      job_id: "job-1",
      status: "queued",
    });
  });

  it("submits with the prefilled area and company size", async () => {
    const queryClient = new QueryClient();
    const onStarted = vi.fn();
    render(() => (
      <QueryClientProvider client={queryClient}>
        <SearchForm onStarted={onStarted} />
      </QueryClientProvider>
    ));

    const submit = screen.getByRole("button", {
      name: /Search/,
    }) as HTMLButtonElement;
    const startup = screen.getByRole("radio", {
      name: "Startup",
    }) as HTMLInputElement;
    expect(startup.checked).toBe(true);
    expect(screen.getByRole("radio", { name: "Mid-size" })).not.toBeNull();
    expect(screen.getByRole("radio", { name: "Enterprise" })).not.toBeNull();
    expect(submit.disabled).toBe(true);

    const area = screen.getByRole("combobox", {
      name: "Area",
    }) as HTMLInputElement;
    expect(area.value).toBe("Helsinki, Finland");

    fireEvent.input(screen.getByRole("combobox", { name: "Industry" }), {
      target: { value: "Fintech" },
    });
    expect(submit.disabled).toBe(false);

    fireEvent.click(submit);

    await waitFor(() => expect(createSearchMock).toHaveBeenCalledOnce());
    expect(createSearchMock.mock.calls[0]?.[0]).toEqual({
      area: "Helsinki, Finland",
      industry: "Fintech",
      company_size: "small",
    });
    await waitFor(() =>
      expect(onStarted).toHaveBeenCalledWith("job-1", {
        area: "Helsinki, Finland",
        industry: "Fintech",
        company_size: "small",
      }),
    );
  });

  it("briefly holds cached results before opening them", async () => {
    vi.useFakeTimers();
    createSearchMock.mockResolvedValue({ job_id: "job-1", status: "done" });
    const queryClient = new QueryClient();
    const onStarted = vi.fn();
    render(() => (
      <QueryClientProvider client={queryClient}>
        <SearchForm onStarted={onStarted} />
      </QueryClientProvider>
    ));

    fireEvent.input(screen.getByRole("combobox", { name: "Industry" }), {
      target: { value: "Fintech" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await vi.advanceTimersByTimeAsync(499);
    expect(onStarted).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(onStarted).toHaveBeenCalledWith("job-1", {
      area: "Helsinki, Finland",
      industry: "Fintech",
      company_size: "small",
    });
  });

  it("shows all industry options on focus and filters them when typing", () => {
    const queryClient = new QueryClient();
    render(() => (
      <QueryClientProvider client={queryClient}>
        <SearchForm onStarted={vi.fn()} />
      </QueryClientProvider>
    ));

    const industry = screen.getByRole("combobox", {
      name: "Industry",
    }) as HTMLInputElement;
    fireEvent.focus(industry);

    expect(screen.getAllByRole("option")).toHaveLength(INDUSTRIES.length);
    for (const label of INDUSTRIES) {
      expect(screen.getByRole("option", { name: label })).not.toBeNull();
    }
    for (const option of screen.getAllByRole("option")) {
      expect(option.getAttribute("aria-selected")).toBe("false");
    }

    const investmentBanking = screen.getByRole("option", {
      name: "Investment banking",
    });
    fireEvent.mouseEnter(investmentBanking);
    expect(investmentBanking.getAttribute("aria-selected")).toBe("true");
    fireEvent.mouseLeave(screen.getByRole("listbox"));
    expect(investmentBanking.getAttribute("aria-selected")).toBe("false");

    fireEvent.input(industry, { target: { value: "saas" } });
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option", { name: "SaaS company" })).not.toBeNull();

    fireEvent.click(industry);
    expect(screen.getAllByRole("option")).toHaveLength(INDUSTRIES.length);
  });

  it("clears the prefilled area", () => {
    const queryClient = new QueryClient();
    render(() => (
      <QueryClientProvider client={queryClient}>
        <SearchForm onStarted={vi.fn()} />
      </QueryClientProvider>
    ));

    const area = screen.getByRole("combobox", {
      name: "Area",
    }) as HTMLInputElement;
    expect(area.value).toBe("Helsinki, Finland");

    const clearArea = screen.getByRole("button", { name: "Clear area" });
    expect(clearArea.className).toContain("opacity-0");
    expect(clearArea.className).toContain("group-hover:opacity-100");
    expect(clearArea.className).toContain("group-focus-within:opacity-100");
    fireEvent.click(clearArea);

    expect(area.value).toBe("");
    expect(screen.queryByRole("button", { name: "Clear area" })).toBeNull();
  });
});
