import { fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSearch } from "../api";
import { SearchForm } from "./SearchForm";

vi.mock("../api", () => ({ createSearch: vi.fn() }));

const createSearchMock = vi.mocked(createSearch);

describe("SearchForm", () => {
  beforeEach(() => {
    createSearchMock.mockReset();
    createSearchMock.mockResolvedValue({ job_id: "job-1" });
  });

  it("requires and submits a company size", async () => {
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
    expect(screen.getByRole("radio", { name: "Startup" })).not.toBeNull();
    expect(screen.getByRole("radio", { name: "Mid-size" })).not.toBeNull();
    expect(screen.getByRole("radio", { name: "Enterprise" })).not.toBeNull();
    expect(submit.disabled).toBe(true);

    fireEvent.input(screen.getByRole("combobox", { name: "Area" }), {
      target: { value: "Helsinki" },
    });
    fireEvent.input(screen.getByRole("combobox", { name: "Industry" }), {
      target: { value: "Fintech" },
    });
    expect(submit.disabled).toBe(true);

    fireEvent.click(screen.getByRole("radio", { name: "Mid-size" }));
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);

    await waitFor(() => expect(createSearchMock).toHaveBeenCalledOnce());
    expect(createSearchMock.mock.calls[0]?.[0]).toEqual({
      area: "Helsinki",
      industry: "Fintech",
      company_size: "medium",
    });
    await waitFor(() =>
      expect(onStarted).toHaveBeenCalledWith("job-1", {
        area: "Helsinki",
        industry: "Fintech",
        company_size: "medium",
      }),
    );
  });
});
