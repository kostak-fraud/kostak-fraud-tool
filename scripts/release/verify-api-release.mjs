import { setTimeout as sleep } from "node:timers/promises";
import { pathToFileURL } from "node:url";

const REQUEST_TIMEOUT_MS = 30_000;
const RETRY_DELAYS_MS = [0, 5_000, 10_000, 15_000];

export function releaseProbeUrls(rawBaseUrl) {
  if (!rawBaseUrl?.trim()) {
    throw new Error("PRODUCTION_API_BASE_URL is required.");
  }

  let baseUrl;
  try {
    baseUrl = new URL(rawBaseUrl.trim());
  } catch {
    throw new Error("PRODUCTION_API_BASE_URL must be a valid absolute URL.");
  }

  if (
    baseUrl.protocol !== "https:" ||
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.search ||
    baseUrl.hash
  ) {
    throw new Error(
      "PRODUCTION_API_BASE_URL must be a credential-free HTTPS URL without query or fragment data.",
    );
  }

  const basePath = baseUrl.pathname.replace(/\/+$/, "");
  const readinessUrl = new URL(baseUrl);
  readinessUrl.pathname = `${basePath}/actuator/health/readiness`;
  const infoUrl = new URL(baseUrl);
  infoUrl.pathname = `${basePath}/actuator/info`;

  return { readinessUrl, infoUrl };
}

export function releaseShaFromInfo(payload) {
  return payload?.app?.release?.sha;
}

async function fetchJson(url, fetchImplementation, sleepImplementation) {
  let lastFailure;

  for (const delayMs of RETRY_DELAYS_MS) {
    if (delayMs > 0) {
      await sleepImplementation(delayMs);
    }

    try {
      const response = await fetchImplementation(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        lastFailure = new Error(`HTTP ${response.status}`);
        continue;
      }
      return await response.json();
    } catch (failure) {
      lastFailure = failure;
    }
  }

  const failureType = lastFailure instanceof Error ? lastFailure.name : "UnknownError";
  throw new Error(`Production API probe failed after retries (error_type=${failureType}).`);
}

export async function verifyApiRelease({
  baseUrl,
  releaseSha,
  fetchImplementation = fetch,
  sleepImplementation = sleep,
}) {
  if (!/^[0-9a-f]{40}$/.test(releaseSha ?? "")) {
    throw new Error("RELEASE_SHA must be a full lowercase commit SHA.");
  }

  const { readinessUrl, infoUrl } = releaseProbeUrls(baseUrl);
  const readiness = await fetchJson(readinessUrl, fetchImplementation, sleepImplementation);
  if (readiness?.status !== "UP") {
    throw new Error("Production readiness response did not report UP.");
  }

  const info = await fetchJson(infoUrl, fetchImplementation, sleepImplementation);
  if (releaseShaFromInfo(info) !== releaseSha) {
    throw new Error("Production API release SHA does not match the requested release.");
  }
}

async function main() {
  await verifyApiRelease({
    baseUrl: process.env.PRODUCTION_API_BASE_URL,
    releaseSha: process.env.RELEASE_SHA,
  });
  console.log("Production API readiness and release SHA verified.");
}

const entryPoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (entryPoint === import.meta.url) {
  try {
    await main();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown production API verification failure.";
    console.error(`Release gate failed: ${message}`);
    process.exitCode = 1;
  }
}
