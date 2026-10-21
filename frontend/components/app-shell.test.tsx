import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AppShell } from "@/components/app-shell";

describe("AppShell", () => {
  it("renders semantic navigation and the active page heading", () => {
    render(<AppShell />);

    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText(/No fraud workflow is simulated on this page\./)).toBeInTheDocument();
  });

  it("exposes navigation in keyboard focus order", async () => {
    const user = userEvent.setup();
    render(<AppShell />);

    await user.tab();

    expect(screen.getByRole("link", { name: "Overview" })).toHaveFocus();
  });
});
