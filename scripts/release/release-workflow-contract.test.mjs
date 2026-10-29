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

test("production release fails closed until Railway orchestration is verified", () => {
  assert.match(ciWorkflow, /DEPLOYMENT_AUTOMATION_ENABLED == 'true'/);
  assert.match(ciWorkflow, /Fail closed until Railway production release is configured/);
  assert.doesNotMatch(ciWorkflow, /NORTHFLANK_API_TOKEN|NORTHFLANK_PROJECT_ID|NORTHFLANK_WORKFLOW_ID/);
  assert.doesNotMatch(ciWorkflow, /run-northflank-workflow\.mjs/);
  assert.doesNotMatch(ciWorkflow, /Smoke production API readiness and revision/);
  assert.match(manualWorkflow, /Fail closed until Railway production release is configured/);
  assert.doesNotMatch(manualWorkflow, /NORTHFLANK|run-northflank-workflow\.mjs/);
});

test("automatic release validates latest main before the fail-closed stop", () => {
  const guard = ciWorkflow.indexOf("- name: Verify release is latest main before release");
  const stop = ciWorkflow.indexOf("- name: Fail closed until Railway production release is configured");
  const guardInvocations = ciWorkflow.match(/run: node scripts\/release\/verify-latest-main\.mjs/g);
  assert.ok(guard >= 0 && guard < stop);
  assert.equal(guardInvocations?.length, 1);
});

test("manual recovery cannot publish the release-ready deployment check", () => {
  assert.match(manualWorkflow, /\n  manual-release:\n    name: manual-release\n/);
  assert.doesNotMatch(manualWorkflow, /workflow_run/);
  assert.doesNotMatch(manualWorkflow, /\n  release-ready:/);
  assert.match(manualWorkflow, /git merge-base --is-ancestor "\$RELEASE_SHA" refs\/remotes\/origin\/main/);
});
