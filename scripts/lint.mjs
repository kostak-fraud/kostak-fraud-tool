import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = new URL("../", import.meta.url);
const sourceRoots = ["preview", "scripts", "frontend/src", "backend/src"];
const textExtensions = new Set([".js", ".mjs", ".ts", ".tsx", ".css", ".html", ".java", ".yml", ".yaml", ".xml", ".md"]);
const ignoredDirectories = new Set(["node_modules", ".next", "target", ".npm-cache", "data"]);
const failures = [];

async function walk(directory) {
  const entries = await readdir(new URL(`${directory}/`, root), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const child = `${directory}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await walk(child));
    else if (textExtensions.has(extname(entry.name))) files.push(child);
  }
  return files;
}

const files = (await Promise.all(sourceRoots.map(async directory => {
  try { return await walk(directory); } catch { return []; }
}))).flat();

for (const file of files) {
  const url = new URL(file, root);
  const content = await readFile(url, "utf8");
  const info = await stat(url);
  if (content.includes("\uFFFD")) failures.push(`${file}: invalid UTF-8 replacement character`);
  if (/\r(?!\n)/.test(content)) failures.push(`${file}: isolated carriage return`);
  if (info.size > 500_000) failures.push(`${file}: source file exceeds 500 KB`);
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content)) failures.push(`${file}: private key material detected`);
  if (/\b(?:SUPABASE_SERVICE_ROLE_KEY|AWS_SECRET_ACCESS_KEY)\s*=\s*[^\s$]/.test(content)) failures.push(`${file}: secret-like assignment detected`);
}

const server = await readFile(new URL("preview/server.mjs", root), "utf8");
const routeChecks = [
  ["rules POST handler", 'path === "/api/rules" && method === "POST"'],
  ["rule toggle handler", 'toggleMatch&&method==="POST"']
];
for (const [label, token] of routeChecks) {
  const occurrences = server.split(token).length - 1;
  if (occurrences !== 1) failures.push(`preview/server.mjs: ${label} occurs ${occurrences} times`);
}

if (failures.length) {
  console.error(`Lint failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Lint PASS (${files.length} source files checked)`);
