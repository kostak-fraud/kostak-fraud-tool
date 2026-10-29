import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthenticatedWorkspace } from "@/components/authenticated-workspace";
import { ApiError } from "@/lib/api/client";

const mocks = vi.hoisted(() => ({
  getCurrentIdentity: vi.fn(),
  getSession: vi.fn(),
  router: {
    refresh: vi.fn(),
    replace: vi.fn(),
  },
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabaseClient: () => ({
    auth: {
      getSession: mocks.getSession,
      refreshSession: vi.fn(),
      signOut: mocks.signOut,
    },
  }),
}));

vi.mock("@/lib/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/client")>();
  return {
    ...actual,
    createAuthenticatedApiClient: () => ({ request: vi.fn() }),
  };
});

vi.mock("@/lib/api/identity", () => ({
  getCurrentIdentity: mocks.getCurrentIdentity,
}));

const identity = {
  userId: "user-1",
  membershipId: "membership-1",
  tenantId: "tenant-1",
  tenantName: "Synthetic Payments Lab",
  roles: ["Analyst"],
  permissions: ["transactions.read"],
};

function renderWorkspace() {
  return render(
    <AuthenticatedWorkspace
      activePage="transactions"
      pageTitle="Transactions"
      pageDescription="Review payment activity."
      returnTo="/transactions"
    >
      <p>Protected workspace content</p>
    </AuthenticatedWorkspace>,
  );
}

describe("AuthenticatedWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "existing-session-token" } },
      error: null,
    });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.getCurrentIdentity.mockResolvedValue(identity);
  });

  it("restores an existing session and loads backend identity after refresh", async () => {
    renderWorkspace();

    expect(screen.getByRole("status", { name: "Verifying your session" })).toBeInTheDocument();
    expect(await screen.findByText("Protected workspace content")).toBeInTheDocument();
    expect(screen.getByText("Synthetic Payments Lab")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Transactions" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Rules" })).not.toBeInTheDocument();
  });

  it("signs out and returns to login", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(await screen.findByRole("button", { name: "Log out" }));

    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce());
    expect(mocks.router.replace).toHaveBeenCalledWith("/login");
  });

  it("shows membership errors separately and does not sign out on 403", async () => {
    mocks.getCurrentIdentity.mockRejectedValue(
      new ApiError(403, "membership missing"),
    );
    renderWorkspace();

    expect(
      await screen.findByRole("alert", { name: "Tenant membership unavailable" }),
    ).toBeInTheDocument();
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });
});
