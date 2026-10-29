import assert from "node:assert/strict";
import test from "node:test";

import { verifyLatestMain } from "./verify-latest-main.mjs";

const olderMainSha = "1".repeat(40);
const newerMainSha = "2".repeat(40);

function githubRefResponse(sha, status = 200) {
  return new Response(JSON.stringify({ object: { sha } }), { status });
}

test("accepts an automatic release only while it is the latest main revision", async () => {
  const verifiedSha = await verifyLatestMain({
    repository: "kostak-fraud/kostak-fraud-tool",
    releaseSha: newerMainSha,
    token: "synthetic-test-token",
    fetchImplementation: async () => githubRefResponse(newerMainSha),
  });

  assert.equal(verifiedSha, newerMainSha);
});

test("blocks an older CI run that finishes after a rapid newer main push", async () => {
  await assert.rejects(
    verifyLatestMain({
      repository: "kostak-fraud/kostak-fraud-tool",
      releaseSha: olderMainSha,
      token: "synthetic-test-token",
      fetchImplementation: async () => githubRefResponse(newerMainSha),
    }),
    /Automatic release is superseded/,
  );
});

test("fails closed when the current main revision cannot be verified", async () => {
  await assert.rejects(
    verifyLatestMain({
      repository: "kostak-fraud/kostak-fraud-tool",
      releaseSha: newerMainSha,
      token: "synthetic-test-token",
      fetchImplementation: async () => githubRefResponse(newerMainSha, 503),
    }),
    /HTTP 503/,
  );
});
