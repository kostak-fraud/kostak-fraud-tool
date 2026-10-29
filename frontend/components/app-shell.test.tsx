import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AppShell } from "@/components/app-shell";

function renderShell() {
  return render(
    <AppShell
      activePage="transactions"
      pageTitle="Transactions"
      pageDescription="Review incoming payment activity."
    >
      <p>Workspace content</p>
    </AppShell>,
  );
}

describe("AppShell", () => {
  it("renders semantic navigation and marks the active route", () => {
    renderShell();

    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Transactions" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Transactions" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Rules" })).not.toHaveAttribute("aria-current");
    expect(screen.getByText("Workspace content")).toBeInTheDocument();
  });

  it("keeps the sidebar toggle and navigation keyboard accessible", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.tab();
    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("link", { name: "Transactions" })).toHaveFocus();
  });

  it("collapses and expands the sidebar with an accessible state", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));

    expect(screen.getByRole("button", { name: "Expand sidebar" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("link", { name: "Transactions" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Expand sidebar" }));

    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toHaveAttribute("aria-expanded", "true");
  });
});
