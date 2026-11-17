import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const port = 3187;
const baseUrl = `http://127.0.0.1:${port}/api`;
const temporaryDirectory = await mkdtemp(join(tmpdir(), "kostak-ci-"));
const environment = {
  ...process.env,
  PORT: String(port),
  BASE_URL: baseUrl,
  KOSTAK_DATA_FILE: join(temporaryDirectory, "kostak.json")
};

function run(script) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], { env: environment, stdio: "inherit" });
    child.on("exit", code => code === 0 ? resolve() : reject(new Error(`${script} exited with ${code}`)));
    child.on("error", reject);
  });
}

const server = spawn(process.execPath, ["preview/server.mjs"], { env: environment, stdio: ["ignore", "pipe", "pipe"] });
server.stdout.pipe(process.stdout);
server.stderr.pipe(process.stderr);

try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) { ready = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error("Preview server did not become healthy");
  await run("preview/smoke-test.mjs");
  await run("preview/invariant-test.mjs");
  console.log("Integration suite PASS");
} finally {
  server.kill("SIGTERM");
  await rm(temporaryDirectory, { recursive: true, force: true });
}
