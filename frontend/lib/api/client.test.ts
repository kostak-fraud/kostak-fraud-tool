import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, createAuthenticatedApiClient } from "@/lib/api/client";
import { PublicConfigurationError } from "@/lib/config/public-env";

type AuthMocks = {
  getSession: ReturnType<typeof vi.fn>;
  refreshSession: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
};

function supabaseWithSession(accessToken = "access-token") {
  const auth: AuthMocks = {
    getSession: vi.fn().mockResolvedValue({
      data: { session: accessToken ? { access_token: accessToken } : null },
      error: null,
    }),
    refreshSession: vi.fn().mockResolvedValue({
      data: { session: { access_token: "refreshed-token" } },
      error: null,
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  };

  return { auth, supabase: { auth } as unknown as SupabaseClient };
}

describe("authenticated API client", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.test");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("adds the current access token to the Authorization header", async () => {
    const { supabase } = supabaseWithSession("secret-access-token");
    const fetchImplementation = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = createAuthenticatedApiClient({
      supabase,
      fetchImplementation,
    });

    await expect(client.request("/api/v1/identity/me")).resolves.toEqual({
      ok: true,
    });

    const [, init] = fetchImplementation.mock.calls[0];
    expect(new Headers(init.headers).get("Authorization")).toBe(
      "Bearer secret-access-token",
    );
  });

  it("refreshes and retries exactly once after a 401", async () => {
    const { auth, supabase } = supabaseWithSession();
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ userId: "user-1" }), { status: 200 }),
      );
    const client = createAuthenticatedApiClient({
      supabase,
      fetchImplementation,
    });

    await expect(client.request("/api/v1/identity/me")).resolves.toEqual({
      userId: "user-1",
    });
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
    expect(auth.refreshSession).toHaveBeenCalledOnce();
    expect(
      new Headers(fetchImplementation.mock.calls[1][1].headers).get(
        "Authorization",
      ),
    ).toBe("Bearer refreshed-token");
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("ends the session after a repeated 401 but not after a 403", async () => {
    const unauthorized = supabaseWithSession();
    const unauthorizedFetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 401 }));
    const unauthorizedClient = createAuthenticatedApiClient({
      supabase: unauthorized.supabase,
      fetchImplementation: unauthorizedFetch,
    });

    await expect(
      unauthorizedClient.request("/api/v1/identity/me"),
    ).rejects.toMatchObject({ status: 401 });
    expect(unauthorizedFetch).toHaveBeenCalledTimes(2);
    expect(unauthorized.auth.signOut).toHaveBeenCalledOnce();

    const forbidden = supabaseWithSession();
    const forbiddenClient = createAuthenticatedApiClient({
      supabase: forbidden.supabase,
      fetchImplementation: vi
        .fn()
        .mockResolvedValue(new Response(null, { status: 403 })),
    });

    await expect(
      forbiddenClient.request("/api/v1/identity/me"),
    ).rejects.toMatchObject({ status: 403 });
    expect(forbidden.auth.refreshSession).not.toHaveBeenCalled();
    expect(forbidden.auth.signOut).not.toHaveBeenCalled();
  });

  it("handles empty, non-JSON, and network responses predictably", async () => {
    const { supabase } = supabaseWithSession();
    const emptyClient = createAuthenticatedApiClient({
      supabase,
      fetchImplementation: vi
        .fn()
        .mockResolvedValue(new Response(null, { status: 204 })),
    });
    await expect(emptyClient.request("/api/v1/empty")).resolves.toBeUndefined();

    const invalidClient = createAuthenticatedApiClient({
      supabase,
      fetchImplementation: vi
        .fn()
        .mockResolvedValue(new Response("not-json", { status: 200 })),
    });
    await expect(invalidClient.request("/api/v1/invalid")).rejects.toBeInstanceOf(
      ApiError,
    );

    const networkClient = createAuthenticatedApiClient({
      supabase,
      fetchImplementation: vi.fn().mockRejectedValue(new Error("offline")),
    });
    await expect(networkClient.request("/api/v1/network")).rejects.toMatchObject({
      status: 0,
    });
  });

  it("reports missing configuration at request time without logging tokens", async () => {
    const { supabase } = supabaseWithSession("do-not-log-this-token");
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    const client = createAuthenticatedApiClient({
      supabase,
      fetchImplementation: vi.fn(),
    });

    await expect(client.request("/api/v1/identity/me")).rejects.toBeInstanceOf(
      PublicConfigurationError,
    );
    expect(consoleLog).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
