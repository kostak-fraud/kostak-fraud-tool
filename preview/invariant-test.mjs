const base = process.env.BASE_URL || "http://127.0.0.1:3000/api";
const headers = { "Content-Type": "application/json", "X-Demo-User": "analyst.invariant" };

async function call(path, options = {}) {
  const response = await fetch(base + path, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const responseBody = await response.json();
  if (!response.ok) throw new Error(`${path}: ${responseBody.message || response.status}`);
  return responseBody;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

await call("/generator/generate?count=12&channel=WALLET", { method: "POST" });

const firstPage = await call("/transactions?channel=WALLET&page=0&size=100");
const allTransactions = [];
for (let page = 0; page < firstPage.totalPages; page++) {
  const current = page === 0 ? firstPage : await call(`/transactions?channel=WALLET&page=${page}&size=100`);
  allTransactions.push(...current.content);
}

assert(allTransactions.length > 0, "Wallet transaction data is empty");
assert(allTransactions.every(transaction => transaction.senderAccountNumber !== "N/A" || transaction.receiverAccountNumber !== "N/A"), "A Wallet transaction has no customer side");

const customerNumber = allTransactions
  .flatMap(transaction => [transaction.senderAccountNumber, transaction.receiverAccountNumber])
  .find(value => typeof value === "string" && value !== "N/A");
assert(customerNumber, "No Wallet customer number was generated");

const profile = await call(`/personal/${encodeURIComponent(customerNumber)}`);
assert(profile.customer.customerNumber === customerNumber, "Personal profile customer number mismatch");
assert(profile.customer.wallets.length > 0, "Personal profile has no linked wallet");
assert(profile.customer.cards.every(card => card.cardType === "PREPAID"), "A non-prepaid card was linked to a Wallet profile");
assert(profile.customer.cards.every(card => profile.customer.wallets.some(wallet => wallet.walletNumber === card.walletNumber)), "A prepaid card is not linked to a customer wallet");

const historicRange = await call(`/personal/${encodeURIComponent(customerNumber)}?from=1900-01-01&to=1900-12-31`);
assert(historicRange.transactions.length === 0, "Personal transaction date range was not applied");

const walletColumns = ["id","createdAt","transactionDate","receiverAccountNumber","senderAccountNumber","senderIban","receiverIban","amount","currency","senderAccountHolderName","receiverAccountHolderName","senderAccountCreatedDate","receiverAccountCreatedDate","receiverKycLevel","senderKycLevel","senderAccountEmail","receiverAccountEmail","senderAge","receiverAge","ruleSummary","riskScore","assignedAnalyst","reviewStatus","description"];
const saved = await call("/views/default", {
  method: "PUT",
  body: JSON.stringify({
    channel: "WALLET",
    filters: [{ id: "amount-filter", field: "amount", operator: "GTE", value: "1000" }],
    columnOrder: [...walletColumns].reverse()
  })
});
assert(saved.columnOrder[0] === "description", "Default view column order was not saved");
const loaded = await call("/views/default?channel=WALLET");
assert(loaded.view?.filters?.[0]?.field === "amount", "Default view filters were not loaded");

const formulaRule = await call("/rules", {
  method: "POST",
  body: JSON.stringify({
    name: `Customer total flow ${Date.now()}`,
    description: "Sum sent and received value across independent 24 hour metrics",
    channel: "WALLET",
    scoreContribution: 70,
    active: true,
    definition: {
      timeField: "transactionDate",
      filters: [],
      metrics: [
        { id: "sent", metric: "SUM", field: "amount", window: { value: 24, unit: "HOUR" }, groupBy: "senderAccountNumber" },
        { id: "received", metric: "SUM", field: "amount", window: { value: 24, unit: "HOUR" }, groupBy: "receiverAccountNumber" }
      ],
      expression: {
        startMetric: "sent",
        operations: [{ operator: "ADD", metricId: "received" }],
        comparator: "GT",
        value: "500000"
      }
    }
  })
});
assert(formulaRule.builderVersion === 3, "Formula rule builder version mismatch");
assert(formulaRule.definition.metrics.length === 2, "Formula rule metrics were not persisted");

console.log(JSON.stringify({
  status: "PASS",
  walletTransactions: allTransactions.length,
  customerNumber,
  wallets: profile.customer.wallets.length,
  prepaidCards: profile.customer.cards.length,
  formulaRule: formulaRule.name
}, null, 2));
