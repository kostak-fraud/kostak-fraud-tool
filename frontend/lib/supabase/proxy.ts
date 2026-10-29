import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { loginPathFor, safeReturnTo } from "@/lib/auth/return-to";
import {
  getSupabasePublicConfig,
  PublicConfigurationError,
} from "@/lib/config/public-env";

type SessionRefreshResult = {
  authenticated: boolean;
  response: NextResponse;
  configurationError: boolean;
};

type SessionResolver = (request: NextRequest) => Promise<SessionRefreshResult>;

function responseWithCookies(
  source: NextResponse,
  destination: NextResponse,
) {
  source.cookies.getAll().forEach((cookie) => destination.cookies.set(cookie));
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = source.headers.get(header);
    if (value) destination.headers.set(header, value);
  }

  return destination;
}

export async function refreshSupabaseSession(
  request: NextRequest,
): Promise<SessionRefreshResult> {
  let response = NextResponse.next({ request });

  try {
    const config = getSupabasePublicConfig();
    const supabase = createServerClient(config.url, config.publishableKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const { data, error } = await supabase.auth.getClaims();
    return {
      authenticated: !error && Boolean(data?.claims?.sub),
      response,
      configurationError: false,
    };
  } catch (error) {
    if (error instanceof PublicConfigurationError) {
      return { authenticated: false, response, configurationError: true };
    }
    return { authenticated: false, response, configurationError: false };
  }
}

export async function updateSession(
  request: NextRequest,
  resolveSession: SessionResolver = refreshSupabaseSession,
) {
  const result = await resolveSession(request);
  const pathname = request.nextUrl.pathname;
  const isLoginRoute = pathname === "/login";
  const isProtectedRoute =
    pathname === "/transactions" ||
    pathname.startsWith("/transactions/") ||
    pathname === "/rules" ||
    pathname.startsWith("/rules/");

  if (result.configurationError && isProtectedRoute) {
    const target = request.nextUrl.clone();
    target.pathname = "/login";
    target.search = "";
    target.searchParams.set("configuration", "missing");
    target.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return responseWithCookies(
      result.response,
      NextResponse.redirect(target),
    );
  }

  if (isProtectedRoute && !result.authenticated) {
    const target = new URL(
      loginPathFor(`${pathname}${request.nextUrl.search}`),
      request.url,
    );
    return responseWithCookies(
      result.response,
      NextResponse.redirect(target),
    );
  }

  if (isLoginRoute && result.authenticated) {
    const target = new URL(
      safeReturnTo(request.nextUrl.searchParams.get("next")),
      request.url,
    );
    return responseWithCookies(
      result.response,
      NextResponse.redirect(target),
    );
  }

  return result.response;
}
