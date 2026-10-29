import assert from "node:assert/strict";
import test from "node:test";

import {
  releaseProbeUrls,
  releaseShaFromInfo,
  verifyApiRelease,
} from "./verify-api-release.mjs";

const releaseSha = "0123456789abcdef0123456789abcdef01234567";

test("builds credential-free HTTPS probe URLs", () => {
  const urls = releaseProbeUrls("https://api.example.test/base/");

  assert.equal(urls.readinessUrl.href, "https://api.example.test/base/actuator/health/readiness");
  assert.equal(urls.infoUrl.href, "https://api.example.test/base/actuator/info");
  assert.throws(() => releaseProbeUrls("http://api.example.test"), /credential-free HTTPS/);
  assert.throws(() => releaseProbeUrls("https://user:pass@api.example.test"), /credential-free HTTPS/);
});

test("extracts the exact release SHA from actuator info", () => {
  assert.equal(releaseShaFromInfo({ app: { release: { sha: releaseSha } } }), releaseSha);
  assert.equal(releaseShaFromInfo({}), undefined);
});

test("accepts only an UP API serving the requested release", async () => {
  const responses = [
    new Response(JSON.stringify({ status: "UP" }), { status: 200 }),
    new Response(JSON.stringify({ app: { release: { sha: releaseSha } } }), { status: 200 }),
  ];

  await verifyApiRelease({
    baseUrl: "https://api.example.test",
    releaseSha,
    fetchImplementation: async () => responses.shift(),
    sleepImplementation: async () => {},
  });
});

test("fails closed when the running revision differs", async () => {
  const responses = [
    new Response(JSON.stringify({ status: "UP" }), { status: 200 }),
    new Response(JSON.stringify({ app: { release: { sha: "f".repeat(40) } } }), { status: 200 }),
  ];

  await assert.rejects(
    verifyApiRelease({
      baseUrl: "https://api.example.test",
      releaseSha,
      fetchImplementation: async () => responses.shift(),
      sleepImplementation: async () => {},
    }),
    /does not match/,
  );
});
