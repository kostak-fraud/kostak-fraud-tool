import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  EmptyState,
  ErrorState,
  ForbiddenState,
  LoadingState,
} from "@/components/ui/state-panel";

describe("shared UI states", () => {
  it("announces empty and loading states politely", () => {
    render(
      <>
        <EmptyState title="No transactions" description="There are no transactions to display." />
        <LoadingState title="Loading transactions" description="Please wait while transactions load." />
      </>,
    );

    expect(screen.getByRole("status", { name: "No transactions" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Loading transactions" })).toBeInTheDocument();
  });

  it("announces failures and forbidden access assertively", () => {
    render(
      <>
        <ErrorState title="Request failed" description="Try again later." />
        <ForbiddenState title="Access denied" description="You do not have permission to view this area." />
      </>,
    );

    expect(screen.getByRole("alert", { name: "Request failed" })).toBeInTheDocument();
    expect(screen.getByRole("alert", { name: "Access denied" })).toBeInTheDocument();
  });

  it("supports an accessible retry action", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <ErrorState
        title="Request failed"
        description="The service could not be reached."
        actionLabel="Retry"
        onAction={onRetry}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
