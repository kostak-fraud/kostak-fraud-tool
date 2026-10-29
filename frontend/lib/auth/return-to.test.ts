import { describe, expect, it } from "vitest";

import { loginPathFor, safeReturnTo } from "@/lib/auth/return-to";

describe("safe return-to handling", () => {
  it("keeps local paths and their query string", () => {
    expect(safeReturnTo("/transactions?channel=wallet")).toBe(
      "/transactions?channel=wallet",
    );
  });

  it.each([
    "https://evil.example/steal",
    "//evil.example/steal",
    "/\\evil.example/steal",
    "javascript:alert(1)",
  ])("rejects unsafe return-to value %s", (candidate) => {
    expect(safeReturnTo(candidate)).toBe("/transactions");
  });

  it("encodes the local destination in the login URL", () => {
    expect(loginPathFor("/rules?mode=active")).toBe(
      "/login?next=%2Frules%3Fmode%3Dactive",
    );
  });
});
