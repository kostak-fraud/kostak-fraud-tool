import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ciWorkflow = await readFile(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
const manualWorkflow = await readFile(
  new URL("../../.github/workflows/release.yml", import.meta.url),
  "utf8",
);

test("automatic release-ready belongs to the exact successful main CI commit", () => {
  assert.match(ciWorkflow, /\n  release-ready:\n    name: release-ready\n/);
  assert.match(ciWorkflow, /needs:\n      - frontend-ci\n      - backend-ci\n/);
  assert.match(ciWorkflow, /github\.event_name == 'push'/);
  assert.match(ciWorkflow, /RELEASE_SHA: \$\{\{ github\.sha \}\}/);
  assert.match(ciWorkflow, /\$GITHUB_SHA" != "\$RELEASE_SHA"/);
  assert.doesNotMatch(ciWorkflow, /workflow_run/);
});

test("manual recovery cannot publish the release-ready deployment check", () => {
  assert.match(manualWorkflow, /\n  manual-release:\n    name: manual-release\n/);
  assert.doesNotMatch(manualWorkflow, /workflow_run/);
  assert.doesNotMatch(manualWorkflow, /\n  release-ready:/);
  assert.match(manualWorkflow, /git merge-base --is-ancestor "\$RELEASE_SHA" refs\/remotes\/origin\/main/);
});
