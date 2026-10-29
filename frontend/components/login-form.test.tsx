import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoginForm } from "@/components/login-form";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
  signInWithPassword: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh, replace: mocks.replace }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabaseClient: () => ({
    auth: { signInWithPassword: mocks.signInWithPassword },
  }),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
  });

  it("renders accessible email and password fields", () => {
    render(<LoginForm />);

    expect(screen.getByRole("textbox", { name: "Email" })).toBeRequired();
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("redirects to the protected local page after successful login", async () => {
    const user = userEvent.setup();
    mocks.signInWithPassword.mockResolvedValue({ data: {}, error: null });
    render(<LoginForm returnTo="/rules" />);

    await user.type(screen.getByRole("textbox", { name: "Email" }), "analyst@example.test");
    await user.type(screen.getByLabelText("Password"), "synthetic-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/rules"));
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "analyst@example.test",
      password: "synthetic-password",
    });
  });

  it("shows a safe error for invalid credentials without exposing the password", async () => {
    const user = userEvent.setup();
    mocks.signInWithPassword.mockResolvedValue({
      data: {},
      error: new Error("invalid synthetic-password"),
    });
    render(<LoginForm />);

    await user.type(screen.getByRole("textbox", { name: "Email" }), "analyst@example.test");
    await user.type(screen.getByLabelText("Password"), "synthetic-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The email or password is incorrect",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent("synthetic-password");
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("rejects an external return-to value after login", async () => {
    const user = userEvent.setup();
    mocks.signInWithPassword.mockResolvedValue({ data: {}, error: null });
    render(<LoginForm returnTo="//evil.example/steal" />);

    await user.type(screen.getByRole("textbox", { name: "Email" }), "analyst@example.test");
    await user.type(screen.getByLabelText("Password"), "synthetic-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith("/transactions"),
    );
  });

  it("disables login and explains missing configuration", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    render(<LoginForm />);

    expect(screen.getByRole("alert")).toHaveTextContent("Sign-in configuration is missing");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
  });
});
