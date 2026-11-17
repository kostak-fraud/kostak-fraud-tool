const base = process.env.BASE_URL || "http://127.0.0.1:3000/api";
const headers = { "Content-Type": "application/json", "X-Demo-User": "analyst.smoke" };

async function call(path, options = {}) {
  const response = await fetch(base + path, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const body = await response.json();
  if (!response.ok) throw new Error(`${path}: ${body.message || response.status}`);
  return body;
}

function assert(condition, message) { if (!condition) throw new Error(message); }

const health = await call("/health");
assert(health.status === "UP", "Health check failed");

const before = await call("/transactions?channel=WALLET&page=0&size=20");
const generated = await call("/generator/generate?count=4&channel=WALLET", { method: "POST" });
const after = await call("/transactions?channel=WALLET&page=0&size=20");
assert(generated.generated === 4, "Generator count mismatch");
assert(after.totalElements === before.totalElements + 4, "Generated transactions were not persisted");
const filterPayload = encodeURIComponent(JSON.stringify([
  { field: "amount", operator: "GTE", value: "15000" },
  { field: "transactionDate", operator: "LTE", value: new Date().toISOString() }
]));
const columnFiltered = await call(`/transactions?channel=WALLET&page=0&size=100&filters=${filterPayload}`);
assert(columnFiltered.content.length > 0, "Combined column filters returned no demo result");
assert(columnFiltered.content.every(item => item.amount >= 15000 && item.transactionDate), "Column filters returned an invalid row");

const physicalGenerated = await call("/generator/generate?count=4&channel=PHYSICAL_POS", { method: "POST" });
assert(physicalGenerated.generated === 4, "Physical POS generator count mismatch");
const physical = await call("/transactions?channel=PHYSICAL_POS&page=0&size=20");
assert(physical.content.length > 0, "Physical POS transactions missing");
const physicalFields = ["createdAt", "transactionDate", "ccNo", "merchantName", "bankErrorCode", "bankErrorDescription", "resolution", "invoiceId", "cardProgram", "bin", "merchantId", "cardCountry", "merchantMcc", "merchantCreatedDate", "terminalUid", "terminalSerialNo", "imei", "locationTime", "lastPingTime", "timeOnTerminal", "batteryLevel", "networkType", "terminalIpAddress"];
assert(physical.content.every(item => physicalFields.every(field => item[field] !== undefined && item[field] !== null)), "Physical POS field enrichment failed");
const terminalFilter = encodeURIComponent(JSON.stringify([{ field: "batteryLevel", operator: "GTE", value: "0" }]));
const filteredPhysical = await call(`/transactions?channel=PHYSICAL_POS&page=0&size=100&filters=${terminalFilter}`);
assert(filteredPhysical.content.length > 0, "Physical POS numeric filter failed");

const tx = after.content.find(item => item.reviewStatus === "WAITING_FOR_REVIEW") || after.content[0];
const detail = await call(`/transactions/${tx.id}`);
assert(detail.transaction.id === tx.id, "Detail mismatch");
const secondAnalyst = await call(`/transactions/${tx.id}`, { headers: { "X-Demo-User": "analyst.other" } });
assert(secondAnalyst.editable === false, "Second analyst should be read-only while the lease is active");
assert(after.content.some(item => item.reviewStatus === "WAITING_FOR_REVIEW"), "Forced fraud pattern was not scored");

const commented = await call(`/transactions/${tx.id}/comments`, {
  method: "POST", body: JSON.stringify({ content: "Automated smoke test note" })
});
assert(commented.comments.some(comment => comment.content === "Automated smoke test note"), "Comment was not stored");

const decided = await call(`/transactions/${tx.id}/decision`, {
  method: "POST", body: JSON.stringify({ status: "FRAUD" })
});
assert(decided.transaction.reviewStatus === "FRAUD", "Decision was not stored");

const rule = await call("/rules", {
  method: "POST",
  body: JSON.stringify({ name: `Smoke rule ${Date.now()}`, description: "Automated verification", channel: "WALLET", fieldName: "amount", operator: "GTE", expectedValue: "30000", scoreContribution: 85, active: true })
});
assert(rule.id && rule.active, "Rule creation failed");

console.log(JSON.stringify({ status: "PASS", generated: 4, transaction: tx.id, decision: "FRAUD", rule: rule.name }, null, 2));
