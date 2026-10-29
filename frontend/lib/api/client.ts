import type { SupabaseClient } from "@supabase/supabase-js";

import { getApiBaseUrl } from "@/lib/config/public-env";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type AuthenticatedApiClientOptions = {
  supabase: SupabaseClient;
  fetchImplementation?: typeof fetch;
  onUnauthorized?: () => void | Promise<void>;
};

export type AuthenticatedApiClient = {
  request<T>(path: string, init?: RequestInit): Promise<T>;
};

function messageForStatus(status: number) {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "Your membership or permissions do not allow this request.";
  if (status >= 500) return "The service cannot complete this request right now. Please try again.";
  return "The request could not be completed. Check the details and try again.";
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!response.ok) {
    throw new ApiError(response.status, messageForStatus(response.status));
  }

  if (!text) return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(
      response.status,
      "The service returned an unexpected response. Please try again.",
    );
  }
}

export function createAuthenticatedApiClient({
  supabase,
  fetchImplementation = fetch,
  onUnauthorized,
}: AuthenticatedApiClientOptions): AuthenticatedApiClient {
  async function endUnauthorizedSession() {
    await supabase.auth.signOut();
    await onUnauthorized?.();
  }

  async function requestWithToken(
    url: string,
    accessToken: string,
    init: RequestInit,
  ) {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    headers.set("Authorization", `Bearer ${accessToken}`);

    try {
      return await fetchImplementation(url, { ...init, headers });
    } catch {
      throw new ApiError(
        0,
        "The service could not be reached. Check your network connection and try again.",
      );
    }
  }

  return {
    async request<T>(path: string, init: RequestInit = {}) {
      if (!path.startsWith("/") || path.startsWith("//")) {
        throw new ApiError(0, "The API path is invalid.");
      }

      const baseUrl = getApiBaseUrl();
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        await endUnauthorizedSession();
        throw new ApiError(401, messageForStatus(401));
      }

      const url = `${baseUrl}${path}`;
      let response = await requestWithToken(url, accessToken, init);

      if (response.status === 401) {
        const { data: refreshed, error } = await supabase.auth.refreshSession();
        const refreshedToken = refreshed.session?.access_token;

        if (error || !refreshedToken) {
          await endUnauthorizedSession();
          throw new ApiError(401, messageForStatus(401));
        }

        response = await requestWithToken(url, refreshedToken, init);
        if (response.status === 401) {
          await endUnauthorizedSession();
        }
      }

      return parseResponse<T>(response);
    },
  };
}
