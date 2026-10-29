import { pathToFileURL } from "node:url";

const REQUEST_TIMEOUT_MS = 30_000;
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const SHA_PATTERN = /^[0-9a-f]{40}$/;

export async function verifyLatestMain({
  repository,
  releaseSha,
  token,
  apiUrl = "https://api.github.com",
  fetchImplementation = fetch,
}) {
  if (!REPOSITORY_PATTERN.test(repository ?? "")) {
    throw new Error("GITHUB_REPOSITORY must be an owner/repository pair.");
  }
  if (!SHA_PATTERN.test(releaseSha ?? "")) {
    throw new Error("RELEASE_SHA must be a full lowercase commit SHA.");
  }
  if (!token?.trim()) {
    throw new Error("GITHUB_TOKEN is required to verify the latest main revision.");
  }

  const endpoint = new URL(`/repos/${repository}/git/ref/heads/main`, apiUrl);
  let response;
  try {
    response = await fetchImplementation(endpoint, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "kostak-fraud-release-gate",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (failure) {
    const failureType = failure instanceof Error ? failure.name : "UnknownError";
    throw new Error(`Latest main verification request failed (error_type=${failureType}).`);
  }

  if (!response.ok) {
    throw new Error(`Latest main verification returned HTTP ${response.status}.`);
  }

  const payload = await response.json();
  const latestMainSha = payload?.object?.sha;
  if (!SHA_PATTERN.test(latestMainSha ?? "")) {
    throw new Error("Latest main verification returned an invalid commit SHA.");
  }
  if (latestMainSha !== releaseSha) {
    throw new Error(
      `Automatic release is superseded: requested ${releaseSha}, current main is ${latestMainSha}.`,
    );
  }

  return latestMainSha;
}

async function main() {
  const latestMainSha = await verifyLatestMain({
    repository: process.env.GITHUB_REPOSITORY,
    releaseSha: process.env.RELEASE_SHA,
    token: process.env.GITHUB_TOKEN,
    apiUrl: process.env.GITHUB_API_URL,
  });
  console.log(`Latest main guard passed for ${latestMainSha}.`);
}

const entryPoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (entryPoint === import.meta.url) {
  try {
    await main();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown latest main verification failure.";
    console.error(`Release gate failed closed: ${message}`);
    process.exitCode = 1;
  }
}
