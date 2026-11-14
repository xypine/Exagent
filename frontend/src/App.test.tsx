import { render, screen } from "@solidjs/testing-library";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { describe, expect, it } from "vitest";

import App from "./App";

describe("App", () => {
  it("renders the bootstrap message", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(() => (
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    ));

    expect(screen.getByText(/Find the people behind/i)).not.toBeNull();
  });
});
