import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getApiBaseUrl,
  getSupabasePublicConfig,
  PublicConfigurationError,
} from "@/lib/config/public-env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("public environment configuration", () => {
  it("does not fail during module import and reports missing values on use", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    expect(() => getSupabasePublicConfig()).toThrow(PublicConfigurationError);
  });

  it("does not silently fall back for a missing or invalid API base URL", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    expect(() => getApiBaseUrl()).toThrow(PublicConfigurationError);

    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "/api");
    expect(() => getApiBaseUrl()).toThrow(PublicConfigurationError);
  });
});
