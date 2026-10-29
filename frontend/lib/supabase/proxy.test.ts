import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it } from "vitest";

import { updateSession } from "@/lib/supabase/proxy";

function sessionResult(authenticated: boolean, configurationError = false) {
  return async () => ({
    authenticated,
    configurationError,
    response: NextResponse.next(),
  });
}

describe("Supabase session proxy", () => {
  it("redirects a user without a verified session away from protected routes", async () => {
    const request = new NextRequest(
      "https://app.example/transactions?channel=wallet",
    );
    const response = await updateSession(request, sessionResult(false));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://app.example/login?next=%2Ftransactions%3Fchannel%3Dwallet",
    );
  });

  it("redirects an authenticated user away from login using only a safe path", async () => {
    const request = new NextRequest(
      "https://app.example/login?next=https://evil.example/steal",
    );
    const response = await updateSession(request, sessionResult(true));

    expect(response.headers.get("location")).toBe(
      "https://app.example/transactions",
    );
  });

  it("routes protected requests with missing configuration to an explicit login state", async () => {
    const request = new NextRequest("https://app.example/rules");
    const response = await updateSession(
      request,
      sessionResult(false, true),
    );

    expect(response.headers.get("location")).toBe(
      "https://app.example/login?configuration=missing&next=%2Frules",
    );
  });
});
