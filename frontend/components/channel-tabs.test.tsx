import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ChannelTabs } from "@/components/channel-tabs";

describe("ChannelTabs", () => {
  it("renders the three supported channels and selects Wallet by default", () => {
    render(<ChannelTabs />);

    expect(screen.getByRole("tablist", { name: "Transaction channels" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Wallet" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "POS" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Physical POS" })).toBeInTheDocument();
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Wallet");
    expect(screen.getByRole("heading", { name: "No Wallet transactions yet" })).toBeInTheDocument();
  });

  it("changes the selected channel using the keyboard and pointer", async () => {
    const user = userEvent.setup();
    render(<ChannelTabs />);

    await user.click(screen.getByRole("tab", { name: "POS" }));

    expect(screen.getByRole("tab", { name: "POS" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Wallet" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("POS");
    expect(screen.getByRole("heading", { name: "No POS transactions yet" })).toBeInTheDocument();
  });
});
