import { randomBytes } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";

const NORTHFLANK_API_ORIGIN = "https://api.northflank.com";
const RELEASE_TIMEOUT_MS = 40 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 30 * 1000;
const MAX_LIST_PAGES = 10;

function requiredEnvironmentValue(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

const apiToken = requiredEnvironmentValue("NORTHFLANK_API_TOKEN");
const projectId = requiredEnvironmentValue("NORTHFLANK_PROJECT_ID");
const workflowId = requiredEnvironmentValue("NORTHFLANK_WORKFLOW_ID");
const releaseSha = requiredEnvironmentValue("RELEASE_SHA");
const releaseBranch = requiredEnvironmentValue("RELEASE_BRANCH");

if (!/^[0-9a-f]{40}$/.test(releaseSha)) {
  throw new Error("RELEASE_SHA must be a full lowercase commit SHA.");
}

if (releaseBranch !== "main") {
  throw new Error("RELEASE_BRANCH must be main.");
}

const runsEndpoint = new URL(
  `/v1/projects/${encodeURIComponent(projectId)}/workflows/${encodeURIComponent(workflowId)}/runs`,
  NORTHFLANK_API_ORIGIN,
);

async function apiRequest(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const method = options.method ?? "GET";

  try {
    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiToken}`,
          ...options.headers,
        },
        signal: controller.signal,
      });
    } catch {
      throw new Error(`Northflank API ${method} request failed.`);
    }

    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Northflank API ${method} failed with HTTP ${response.status}.`);
    }

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function apiJson(url) {
  const response = await apiRequest(url);
  try {
    return await response.json();
  } catch {
    throw new Error("Northflank API returned invalid JSON.");
  }
}

async function findRunByName(runName) {
  let cursor;

  for (let page = 0; page < MAX_LIST_PAGES; page += 1) {
    const listUrl = new URL(runsEndpoint);
    listUrl.searchParams.set("per_page", "100");
    if (cursor) {
      listUrl.searchParams.set("cursor", cursor);
    }

    const payload = await apiJson(listUrl);
    const runs = payload?.data?.runs;
    if (!Array.isArray(runs)) {
      throw new Error("Northflank workflow run list response is malformed.");
    }

    const matchingRun = runs.find((run) => run?.name === runName);
    if (matchingRun) {
      if (typeof matchingRun.id !== "string" || !matchingRun.id) {
        throw new Error("Northflank workflow run is missing its ID.");
      }
      return matchingRun;
    }

    const pagination = payload?.pagination;
    if (!pagination?.hasNextPage) {
      return null;
    }
    if (typeof pagination.cursor !== "string" || !pagination.cursor) {
      throw new Error("Northflank workflow run pagination is malformed.");
    }
    cursor = pagination.cursor;
  }

  return null;
}

async function waitForVisibleRun(runName, deadline) {
  let delayMs = 1_000;

  while (Date.now() < deadline) {
    const run = await findRunByName(runName);
    if (run) {
      return run;
    }

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      break;
    }
    await sleep(Math.min(delayMs, remainingMs));
    delayMs = Math.min(Math.ceil(delayMs * 1.5), 15_000);
  }

  throw new Error("Timed out waiting for the Northflank workflow run to become visible.");
}

async function workflowRunDetails(runId) {
  const detailUrl = new URL(`${runsEndpoint.pathname}/${encodeURIComponent(runId)}`, runsEndpoint.origin);
  const payload = await apiJson(detailUrl);
  const details = payload?.data;

  if (!details || typeof details !== "object") {
    throw new Error("Northflank workflow run detail response is malformed.");
  }

  return details;
}

async function waitForConclusion(runId, runName, deadline) {
  let delayMs = 5_000;
  let lastStatus;

  while (Date.now() < deadline) {
    const details = await workflowRunDetails(runId);

    if (details.id !== runId || details.name !== runName) {
      throw new Error("Northflank workflow run identity does not match the requested release.");
    }

    if (
      !details.arguments ||
      details.arguments.COMMIT_SHA !== releaseSha ||
      details.arguments.BRANCH !== releaseBranch
    ) {
      throw new Error("Northflank workflow run arguments do not match the requested release.");
    }

    if (typeof details.status !== "string" || typeof details.concluded !== "boolean") {
      throw new Error("Northflank workflow run status response is malformed.");
    }

    if (details.status !== lastStatus) {
      console.log(`Northflank workflow status: ${details.status}`);
      lastStatus = details.status;
    }

    if (details.concluded) {
      if (details.status !== "success") {
        throw new Error(`Northflank workflow concluded with status ${details.status}.`);
      }

      console.log("Northflank workflow completed successfully.");
      return;
    }

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      break;
    }
    await sleep(Math.min(delayMs, remainingMs));
    delayMs = Math.min(Math.ceil(delayMs * 1.5), 30_000);
  }

  throw new Error("Timed out waiting for the Northflank workflow to conclude.");
}

async function main() {
  const deadline = Date.now() + RELEASE_TIMEOUT_MS;
  const runName = `release-${releaseSha.slice(0, 12)}-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
  const requestBody = {
    name: runName,
    arguments: {
      COMMIT_SHA: releaseSha,
      BRANCH: releaseBranch,
    },
  };

  const startResponse = await apiRequest(runsEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
  await startResponse.arrayBuffer();
  console.log(`Northflank workflow start accepted as ${runName}.`);

  const run = await waitForVisibleRun(runName, deadline);
  await waitForConclusion(run.id, runName, deadline);
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown release gate failure.";
  console.error(`Release gate failed: ${message}`);
  process.exitCode = 1;
}
