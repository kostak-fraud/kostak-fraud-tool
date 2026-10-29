const DEFAULT_RETURN_TO = "/transactions";
const LOCAL_ORIGIN = "https://kostak.local";

export function safeReturnTo(
  candidate: string | null | undefined,
  fallback = DEFAULT_RETURN_TO,
): string {
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\")
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, LOCAL_ORIGIN);
    if (parsed.origin !== LOCAL_ORIGIN) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function loginPathFor(returnTo: string): string {
  const parameters = new URLSearchParams({ next: safeReturnTo(returnTo) });
  return `/login?${parameters.toString()}`;
}
