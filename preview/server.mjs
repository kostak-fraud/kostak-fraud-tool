import http from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const root = dirname(fileURLToPath(import.meta.url));
const publicDir = join(root, "public");
const dataFile = process.env.KOSTAK_DATA_FILE || join(root, "data", "kostak.json");
const dataDir = dirname(dataFile);
const port = Number(process.env.PORT || 3000);
const threshold = 60;
let stream = null;
let state;

const json = (res, status, body) => {
  const content = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(content) });
  res.end(content);
};
const now = () => new Date().toISOString();
const choice = values => values[Math.floor(Math.random() * values.length)];
const between = (min, max) => Math.round((min + Math.random() * (max - min)) * 100) / 100;
const ref = (prefix, max) => `${prefix}-${String(Math.floor(Math.random() * max)).padStart(5, "0")}`;
const firstNames = ["Ahmet", "Ayse", "Mehmet", "Zeynep", "Can", "Elif", "Burak", "Selin", "Mert", "Derya"];
const lastNames = ["Yilmaz", "Kaya", "Demir", "Celik", "Sahin", "Aydin", "Arslan", "Koc", "Kurt", "Ozdemir"];
const fullName = () => `${choice(firstNames)} ${choice(lastNames)}`;
const randomDigits = length => Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
const iban = () => `TR${Math.floor(10 + Math.random() * 90)}${randomDigits(22)}`;
const pastDate = (minYears, maxYears) => new Date(Date.now() - between(minYears, maxYears) * 365.25 * 24 * 60 * 60 * 1000).toISOString();
const slug = value => String(value).toLocaleLowerCase("tr-TR").replaceAll("ı", "i").replaceAll("ş", "s").replaceAll("ğ", "g").replaceAll("ü", "u").replaceAll("ö", "o").replaceAll("ç", "c").replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");

function enrichWalletTransaction(tx) {
  if (tx.channel !== "WALLET") return tx;
  const transactionDate = tx.transactionDate || tx.occurredAt || now();
  let senderIsCustomer = tx.senderIsCustomer ?? Math.random() < .72;
  let receiverIsCustomer = tx.receiverIsCustomer ?? Math.random() < .68;
  if (!senderIsCustomer && !receiverIsCustomer) {
    if (Math.random() < .5) senderIsCustomer = true; else receiverIsCustomer = true;
  }
  const senderName = tx.senderAccountHolderName || fullName();
  const receiverName = tx.receiverAccountHolderName || fullName();
  Object.assign(tx, {
    transactionDate,
    createdAt: tx.createdAt || new Date(new Date(transactionDate).getTime() + between(2, 180) * 1000).toISOString(),
    senderIsCustomer,
    receiverIsCustomer,
    senderAccountNumber: senderIsCustomer ? (tx.senderAccountNumber || ref("CUS", 5000)) : null,
    receiverAccountNumber: receiverIsCustomer ? (tx.receiverAccountNumber || ref("CUS", 5000)) : null,
    senderIban: tx.senderIban || iban(),
    receiverIban: tx.receiverIban || iban(),
    senderAccountHolderName: senderName,
    receiverAccountHolderName: receiverName,
    senderAccountCreatedDate: senderIsCustomer ? (tx.senderAccountCreatedDate || pastDate(1, 9)) : null,
    receiverAccountCreatedDate: receiverIsCustomer ? (tx.receiverAccountCreatedDate || pastDate(1, 9)) : null,
    senderKycLevel: senderIsCustomer ? (tx.senderKycLevel ?? Math.floor(between(35, 100))) : null,
    receiverKycLevel: receiverIsCustomer ? (tx.receiverKycLevel ?? Math.floor(between(35, 100))) : null,
    senderAccountEmail: senderIsCustomer ? (tx.senderAccountEmail || `${slug(senderName)}${Math.floor(Math.random() * 100)}@example.com`) : null,
    receiverAccountEmail: receiverIsCustomer ? (tx.receiverAccountEmail || `${slug(receiverName)}${Math.floor(Math.random() * 100)}@example.com`) : null,
    senderAge: senderIsCustomer ? (tx.senderAge ?? Math.floor(between(18, 74))) : null,
    receiverAge: receiverIsCustomer ? (tx.receiverAge ?? Math.floor(between(18, 74))) : null,
    description: tx.description || choice(["Kira odemesi", "Borc odemesi", "Havale", "Urun bedeli", "Aile destegi", "Diger"])
  });
  return tx;
}

const merchantNames = ["Nova Market", "Atlas Travel", "Mavi Teknoloji", "Limon Giyim", "Pusula Kitap", "Rota Elektronik", "Kuzey Mobilya", "Vega Kozmetik"];
const cities = [["Istanbul", "Istanbul", "34000"], ["Ankara", "Ankara", "06000"], ["Izmir", "Izmir", "35000"], ["Bursa", "Bursa", "16000"], ["Sakarya", "Sakarya", "54000"]];
const bankErrors = { "00": "Approved", "05": "Do not honor", "51": "Insufficient funds", "54": "Expired card", "91": "Issuer unavailable" };
const cardPrograms = ["Bankkart Combo", "World", "Axess", "Bonus", "Maximum", "CardFinans", "Paraf"];
const occupations = ["Software Developer", "Teacher", "Engineer", "Accountant", "Sales Specialist", "Student", "Self-employed", "Healthcare Worker"];
const incomeSources = ["Salary", "Commercial income", "Family support", "Freelance income", "Pension", "Investment income"];
const deviceBrands = [["Apple", "iPhone 15", "iOS"], ["Samsung", "Galaxy S24", "Android"], ["Xiaomi", "Redmi Note 13", "Android"], ["Huawei", "P60", "Android"], ["Apple", "iPhone 13", "iOS"]];

function validCustomerNumber(value) {
  const normalized = String(value ?? "").trim();
  return Boolean(normalized) && normalized.toLocaleUpperCase("tr-TR") !== "N/A";
}

function buildPersonalCustomer(accountNumber, tx, role) {
  const prefix = role === "sender" ? "sender" : "receiver";
  const fullNameValue = tx[`${prefix}AccountHolderName`] || fullName();
  const createdAt = tx[`${prefix}AccountCreatedDate`] || pastDate(1, 9);
  const age = Number(tx[`${prefix}Age`]) || Math.floor(between(18, 74));
  const city = choice(cities);
  const nationalId = `${Math.floor(between(1, 9))}${randomDigits(10)}`;
  const walletCount = Math.floor(between(1, 3));
  const wallets = Array.from({ length: walletCount }, (_, index) => ({
    walletNumber: `WAL-${accountNumber.replace(/[^a-z0-9]/gi, "").slice(-10)}-${index + 1}`,
    customerNumber: accountNumber,
    fullName: fullNameValue,
    nationalId,
    fastIban: iban(),
    totalBalance: between(250, 85000),
    currency: "TRY",
    status: index === 0 || Math.random() < .82 ? "ACTIVE" : "INACTIVE",
    createdAt: index === 0 ? createdAt : pastDate(.1, 4)
  }));
  const cards = wallets.flatMap((wallet, walletIndex) => Array.from({ length: walletIndex === 0 ? Math.floor(between(1, 2)) : Math.floor(between(0, 2)) }, () => ({
    id: randomUUID(),
    maskedCardNumber: `5355 88** **** ${randomDigits(4)}`,
    cardHolderName: fullNameValue.toLocaleUpperCase("tr-TR"),
    walletNumber: wallet.walletNumber,
    cardType: "PREPAID",
    status: Math.random() < .88 ? "ACTIVE" : "PASSIVE",
    expireDate: new Date(Date.now() + between(1, 5) * 365.25 * 86400000).toISOString(),
    createdAt: pastDate(.05, 4),
    updatedAt: pastDate(0, .05)
  })));
  const devices = Array.from({ length: Math.floor(between(1, 3)) }, () => {
    const device = choice(deviceBrands);
    return {
      deviceId: `DEV-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`,
      brand: device[0], model: device[1], platform: device[2],
      ipAddress: `${Math.floor(between(20, 220))}.${Math.floor(between(0, 255))}.${Math.floor(between(0, 255))}.${Math.floor(between(1, 254))}`,
      browser: choice(["Wallet App", "Chrome Mobile", "Safari Mobile"]),
      updatedAt: pastDate(0, .03), createdAt: pastDate(.05, 3)
    };
  });
  const contractDate = new Date(new Date(createdAt).getTime() + between(0, 14) * 86400000).toISOString();
  const walletStatus = choice(["ACTIVE", "ACTIVE", "ACTIVE", "BLOCKED", "CLOSED"]);
  const statusHistory = [{ status: "ACTIVE", changedAt: contractDate, actor: "System", reason: "Wallet account opened" }];
  if (walletStatus !== "ACTIVE") statusHistory.push({ status: walletStatus, changedAt: pastDate(0, .5), actor: "risk.operations", reason: walletStatus === "BLOCKED" ? "Risk review restriction" : "Customer request" });
  return {
    accountNumber,
    customerNumber: accountNumber,
    accountCreatedAt: createdAt,
    fullName: fullNameValue,
    countryCode: "TR",
    email: tx[`${prefix}AccountEmail`] || `${slug(fullNameValue)}@example.com`,
    phoneNumber: `+90 5${randomDigits(9)}`,
    address: `${Math.floor(between(1, 240))}. Sokak No:${Math.floor(between(1, 90))}`,
    postalCode: city[2], city: city[0],
    walletStatus,
    monthlyIncome: Math.floor(between(18000, 180000)),
    occupation: choice(occupations),
    incomeSource: choice(incomeSources),
    birthDate: new Date(new Date().getFullYear() - age, Math.floor(Math.random() * 12), Math.floor(between(1, 28))).toISOString(),
    motherName: choice(firstNames), fatherName: choice(firstNames),
    nviCode: `NVI-${randomDigits(8)}`,
    nationalId,
    contractDate,
    statusHistory,
    wallets, cards, devices,
    activities: [
      { id: randomUUID(), type: "PROFILE_CREATED", description: "Customer profile created", actor: "System", ipAddress: null, deviceId: null, createdAt: createdAt },
      { id: randomUUID(), type: "CONTRACT_ACCEPTED", description: "Wallet agreement accepted", actor: fullNameValue, ipAddress: devices[0]?.ipAddress || null, deviceId: devices[0]?.deviceId || null, createdAt: contractDate },
      ...wallets.map(wallet => ({ id: randomUUID(), type: "WALLET_CREATED", description: `${wallet.walletNumber} created`, actor: "System", ipAddress: null, deviceId: null, createdAt: wallet.createdAt })),
      ...cards.map(card => ({ id: randomUUID(), type: "CARD_CREATED", description: `${card.maskedCardNumber} prepaid card created`, actor: "System", ipAddress: null, deviceId: null, createdAt: card.createdAt })),
      ...devices.map(device => ({ id: randomUUID(), type: "DEVICE_REGISTERED", description: `${device.brand} ${device.model} registered`, actor: fullNameValue, ipAddress: device.ipAddress, deviceId: device.deviceId, createdAt: device.createdAt }))
    ]
  };
}

function ensurePersonalCustomer(accountNumber, tx, role) {
  if (!validCustomerNumber(accountNumber)) return null;
  if (!Array.isArray(state.personalCustomers)) state.personalCustomers = [];
  let customer = state.personalCustomers.find(item => item.accountNumber === accountNumber);
  if (!customer) {
    customer = buildPersonalCustomer(accountNumber, tx, role);
    state.personalCustomers.push(customer);
  }
  const prefix = role === "sender" ? "sender" : "receiver";
  tx[`${prefix}IsCustomer`] = true;
  tx[`${prefix}AccountHolderName`] = customer.fullName;
  tx[`${prefix}AccountCreatedDate`] = customer.accountCreatedAt;
  tx[`${prefix}AccountEmail`] = customer.email;
  tx[`${prefix}Age`] = Math.max(18, new Date().getFullYear() - new Date(customer.birthDate).getFullYear());
  return customer;
}

function syncWalletCustomers(tx) {
  if (tx.channel !== "WALLET") return;
  if (validCustomerNumber(tx.senderAccountNumber)) ensurePersonalCustomer(tx.senderAccountNumber, tx, "sender");
  if (validCustomerNumber(tx.receiverAccountNumber)) ensurePersonalCustomer(tx.receiverAccountNumber, tx, "receiver");
}

function enrichVirtualPosTransaction(tx) {
  if (tx.channel !== "POS") return tx;
  const transactionDate = tx.transactionDate || tx.occurredAt || now();
  const holder = tx.ccHolderName || fullName();
  const merchantName = tx.merchantName || choice(merchantNames);
  const merchantSlug = slug(merchantName).replaceAll(".", "-");
  const city = choice(cities);
  const recurring = tx.isRecurringPayment ?? Math.random() < .22;
  const binValue = tx.bin || choice(["415792", "454360", "520922", "540667", "552608", "979203"]);
  const bankErrorCode = tx.bankErrorCode || (tx.paymentBlocked ? "05" : Math.random() < .9 ? "00" : choice(["05", "51", "54", "91"]));
  const merchantRiskLevel = tx.merchantRiskLevel || (tx.merchantRisk === "MEDIUM" ? "MID" : tx.merchantRisk || "LOW");
  const merchantRiskScore = tx.merchantRiskScore ?? Math.floor(merchantRiskLevel === "HIGH" ? between(70, 100) : merchantRiskLevel === "MID" ? between(35, 69) : between(1, 34));
  Object.assign(tx, {
    transactionDate,
    createdAt: tx.createdAt || new Date(new Date(transactionDate).getTime() + between(1, 90) * 1000).toISOString(),
    ccHolderName: holder,
    ccNo: tx.ccNo || `${binValue.slice(0, 4)} ${binValue.slice(4)}** **** ${randomDigits(4)}`,
    merchantName,
    resolution: tx.resolution || (tx.riskScore >= threshold ? "ESCALATED" : bankErrorCode === "00" ? "APPROVED" : "DECLINED"),
    billAddress: tx.billAddress || `${Math.floor(between(1, 250))}. Sokak No:${Math.floor(between(1, 80))}`,
    billCity: tx.billCity || city[0],
    billState: tx.billState || city[1],
    billPostcode: tx.billPostcode || city[2],
    billCountry: tx.billCountry || "Turkey",
    billEmail: tx.billEmail || `${slug(holder)}${Math.floor(Math.random() * 100)}@example.com`,
    billPhone: tx.billPhone || `+90 5${randomDigits(9)}`,
    cardProgram: tx.cardProgram || choice(cardPrograms),
    isRecurringPayment: recurring,
    paymentFrequency: recurring ? (tx.paymentFrequency || choice(["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"])) : null,
    bin: binValue,
    responseCode: tx.responseCode || bankErrorCode,
    merchantId: tx.merchantId || tx.merchantRef || ref("MER", 5000),
    cardCountry: tx.cardCountry || choice(["Turkey", "Germany", "United Kingdom", "France", "Netherlands"]),
    merchantMcc: tx.merchantMcc || choice(["5411", "5732", "5812", "5942", "7011", "7995"]),
    nonSecureStatus: tx.nonSecureStatus || (tx.threeDs ? "3D_SECURE" : "2D_NON_SECURE"),
    bankErrorCode,
    bankErrorDescription: tx.bankErrorDescription || bankErrors[bankErrorCode] || "Unknown error",
    cardExpireDate: tx.cardExpireDate || new Date(Date.now() + between(1, 5) * 365.25 * 24 * 60 * 60 * 1000).toISOString(),
    merchantCreateDate: tx.merchantCreateDate || pastDate(.2, 7),
    merchantRiskLevel,
    merchantRiskScore,
    cardToken: tx.cardToken || `tok_${randomUUID().replaceAll("-", "").slice(0, 24)}`,
    merchantWebsite: tx.merchantWebsite || `https://www.${merchantSlug}.example`,
    callbackUrl3d: tx.callbackUrl3d || `https://api.${merchantSlug}.example/payments/3d/callback`,
    merchantWebsiteDomainRegistryMonthDuration: tx.merchantWebsiteDomainRegistryMonthDuration ?? Math.floor(between(2, 120)),
    merchantIp: tx.merchantIp || `${Math.floor(between(20, 220))}.${Math.floor(between(0, 255))}.${Math.floor(between(0, 255))}.${Math.floor(between(1, 254))}`,
    merchantIpCountry: tx.merchantIpCountry || choice(["Turkey", "Germany", "United Kingdom", "Netherlands"]),
    invoiceId: tx.invoiceId || ref("INV", 100000),
    invoiceDescription: tx.invoiceDescription || choice(["Online order", "Subscription payment", "Travel booking", "Digital service", "Retail purchase"])
  });
  return tx;
}

function enrichPhysicalPosTransaction(tx) {
  if (tx.channel !== "PHYSICAL_POS") return tx;
  const transactionDate = tx.transactionDate || tx.occurredAt || now();
  const createdAt = tx.createdAt || new Date(new Date(transactionDate).getTime() + between(1, 45) * 1000).toISOString();
  const merchantName = tx.merchantName || choice(merchantNames);
  const binValue = tx.bin || choice(["415792", "454360", "520922", "540667", "552608", "979203"]);
  const bankErrorCode = tx.bankErrorCode || (tx.paymentBlocked ? "05" : Math.random() < .94 ? "00" : choice(["05", "51", "54", "91"]));
  Object.assign(tx, {
    transactionDate,
    createdAt,
    ccNo: tx.ccNo || `${binValue.slice(0, 4)} ${binValue.slice(4)}** **** ${randomDigits(4)}`,
    merchantName,
    bankErrorCode,
    bankErrorDescription: tx.bankErrorDescription || bankErrors[bankErrorCode] || "Unknown error",
    resolution: tx.resolution || (tx.riskScore >= threshold ? "ESCALATED" : bankErrorCode === "00" ? "APPROVED" : "DECLINED"),
    invoiceId: tx.invoiceId || ref("INV", 100000),
    invoiceDescription: tx.invoiceDescription || choice(["Store purchase", "Restaurant payment", "Fuel purchase", "Hotel payment", "Retail purchase"]),
    cardProgram: tx.cardProgram || choice(cardPrograms),
    bin: binValue,
    merchantId: tx.merchantId || tx.merchantRef || ref("MER", 5000),
    cardCountry: tx.cardCountry || choice(["Turkey", "Germany", "United Kingdom", "France", "Netherlands"]),
    merchantMcc: tx.merchantMcc || choice(["5411", "5541", "5812", "5912", "7011", "7995"]),
    merchantCreatedDate: tx.merchantCreatedDate || pastDate(.2, 7),
    terminalUid: tx.terminalUid || `TUID-${randomDigits(12)}`,
    terminalSerialNo: tx.terminalSerialNo || `SN-${randomDigits(10)}`,
    imei: tx.imei || randomDigits(15),
    locationTime: tx.locationTime || new Date(new Date(transactionDate).getTime() - between(1, 120) * 1000).toISOString(),
    lastPingTime: tx.lastPingTime || new Date(new Date(createdAt).getTime() + between(1, 90) * 1000).toISOString(),
    timeOnTerminal: tx.timeOnTerminal ?? Math.floor(between(1, 1440)),
    batteryLevel: tx.batteryLevel ?? Math.floor(between(8, 100)),
    networkType: tx.networkType || choice(["WIFI", "ETHERNET", "4G", "5G"]),
    terminalIpAddress: tx.terminalIpAddress || `${Math.floor(between(20, 220))}.${Math.floor(between(0, 255))}.${Math.floor(between(0, 255))}.${Math.floor(between(1, 254))}`
  });
  return tx;
}

function baseState() {
  const timestamp = now();
  return {
    rules: [
      rule("High-risk merchant", "High risk merchant transactions require review", "POS", "merchantRisk", "EQ", "HIGH", 35, timestamp),
      rule("Non-3DS payment", "Non-3DS POS payment signal", "POS", "threeDs", "EQ", "false", 30, timestamp),
      rule("Large wallet transfer", "Large electronic money transfer", "WALLET", "amount", "GTE", "15000", 70, timestamp),
      rule("Large terminal payment", "Large physical terminal payment", "PHYSICAL_POS", "amount", "GTE", "20000", 65, timestamp),
    ], transactions: [], comments: [], audits: [], defaultViews: [], personalCustomers: [], generator: { running: false, rate: 2 }
  };
}

function rule(name, description, channel, fieldName, operator, expectedValue, scoreContribution, timestamp = now()) {
  return { id: randomUUID(), name, description, channel, fieldName, operator, expectedValue, scoreContribution, active: true, version: 1, createdAt: timestamp, updatedAt: timestamp };
}

function makeTransaction(channel = choice(["WALLET", "POS", "PHYSICAL_POS"]), forceSuspicious = false) {
  const suspicious = forceSuspicious || Math.random() < .24;
  const tx = {
    id: randomUUID(), tenantId: "demo-tenant", channel,
    occurredAt: new Date(Date.now() - Math.random() * 45 * 60 * 1000).toISOString(),
    amount: 0, currency: Math.random() < .92 ? "TRY" : "USD", customerRef: ref("CUS", 500),
    senderRef: ref("ACC", 700), receiverRef: ref("ACC", 700), cardRef: null, merchantRef: null,
    merchantRisk: null, terminalRef: null, transactionType: "", threeDs: false,
    riskScore: 0, reviewStatus: "NOT_FRAUD", decisionBy: "System", assignedAnalyst: null,
    paymentBlocked: false, lockOwner: null, lockExpiresAt: null, ruleHits: []
  };
  if (channel === "WALLET") {
    tx.transactionType = Math.random() < .5 ? "WALLET_TRANSFER" : "CASH_IN";
    tx.amount = suspicious ? between(15000, 45000) : between(50, 9000);
    enrichWalletTransaction(tx);
    if (forceSuspicious) {
      tx.transactionType = "WALLET_TRANSFER";
      tx.senderIsCustomer = true;
      tx.senderAccountNumber = "CUS-VELOCITY-001";
    } else if (Math.random() < .35) {
      tx.transactionType = "WALLET_TRANSFER";
      tx.receiverIsCustomer = true;
      tx.receiverAccountNumber = "CUS-FUNNEL-001";
      tx.senderIsCustomer = true;
      tx.senderAccountNumber = ref("CUS", 100000);
    }
    syncWalletCustomers(tx);
  } else {
    tx.cardRef = ref("CARD", 300); tx.merchantRef = ref("MER", 120);
    tx.merchantRisk = suspicious ? "HIGH" : choice(["LOW", "MEDIUM", "HIGH"]);
    tx.threeDs = !suspicious && Math.random() < .78;
    tx.amount = suspicious ? between(8000, 35000) : between(25, 12000);
    tx.transactionType = channel === "POS" ? "ECOM_PURCHASE" : "TERMINAL_PURCHASE";
    if (channel === "PHYSICAL_POS") tx.terminalRef = ref("TERM", 160);
  }
  evaluate(tx);
  enrichVirtualPosTransaction(tx);
  enrichPhysicalPosTransaction(tx);
  return tx;
}

function compare(actual, operator, expected) {
  if (typeof actual === "number") {
    const right = Number(expected); if (Number.isNaN(right)) return false;
    return operator === "EQ" ? actual === right : operator === "NE" ? actual !== right : operator === "GT" ? actual > right : operator === "GTE" ? actual >= right : operator === "LT" ? actual < right : actual <= right;
  }
  const left = String(actual).toLowerCase(), right = String(expected).toLowerCase();
  if (operator === "CONTAINS") return left.includes(right);
  if (operator === "NOT_CONTAINS") return !left.includes(right);
  if (operator === "STARTS_WITH") return left.startsWith(right);
  if (operator === "ENDS_WITH") return left.endsWith(right);
  const cmp = left.localeCompare(right);
  return operator === "EQ" ? cmp === 0 : operator === "NE" ? cmp !== 0 : operator === "GT" ? cmp > 0 : operator === "GTE" ? cmp >= 0 : operator === "LT" ? cmp < 0 : cmp <= 0;
}

const RULE_EXCLUDED_FIELDS = new Set(["id", "ruleSummary", "riskScore", "reviewStatus", "assignedAnalyst"]);
const RULE_LOGIC_OPERATORS = new Set(["EQ", "NE", "CONTAINS", "NOT_CONTAINS", "STARTS_WITH", "ENDS_WITH", "GT", "GTE", "LT", "LTE"]);
const RULE_AGGREGATES = new Set(["COUNT", "SUM", "AVG", "MIN", "MAX", "DISTINCT"]);
const RULE_COMPARATORS = new Set(["EQ", "NE", "GT", "GTE", "LT", "LTE"]);
const RULE_FORMULA_COMPARATORS = new Set(["EQ", "NE", "GT", "GTE", "LT", "LTE", "CONTAINS", "NOT_CONTAINS"]);
const RULE_ARITHMETIC_OPERATORS = new Set(["ADD", "SUBTRACT", "MULTIPLY", "DIVIDE"]);
const RULE_WINDOW_UNITS = new Set(["MINUTE", "HOUR", "DAY"]);
const NUMERIC_RULE_FIELDS = new Set(["amount", "receiverKycLevel", "senderKycLevel", "senderAge", "receiverAge", "merchantRiskScore", "merchantWebsiteDomainRegistryMonthDuration", "timeOnTerminal", "batteryLevel"]);
const RULE_EXTRA_FIELDS = {
  WALLET: new Set(["transactionType"]),
  POS: new Set(["transactionType", "merchantRisk", "threeDs"]),
  PHYSICAL_POS: new Set(["transactionType", "merchantRisk", "threeDs"])
};

function ruleFieldAllowed(channel, field) {
  return Boolean(field) && !RULE_EXCLUDED_FIELDS.has(field) && Boolean(CHANNEL_FILTER_FIELDS[channel]?.has(field) || RULE_EXTRA_FIELDS[channel]?.has(field));
}

function validRuleConnector(value) { return value === "AND" || value === "OR"; }

function validateRuleWindow(window) {
  const value = Number(window?.value);
  return Number.isFinite(value) && value > 0 && value <= 10000 && RULE_WINDOW_UNITS.has(window?.unit);
}

function validateRuleMetric(channel, item) {
  if (!item || typeof item.id !== "string" || !/^[a-zA-Z0-9_-]{1,40}$/.test(item.id) || !RULE_AGGREGATES.has(item.metric) || !validateRuleWindow(item.window)) return false;
  if (item.groupBy && !ruleFieldAllowed(channel, item.groupBy)) return false;
  if (item.metric === "COUNT") return !item.field;
  if (!ruleFieldAllowed(channel, item.field)) return false;
  return !["SUM", "AVG", "MIN", "MAX"].includes(item.metric) || NUMERIC_RULE_FIELDS.has(item.field);
}

function validateRuleFormula(metrics, expression) {
  if (!expression || !RULE_FORMULA_COMPARATORS.has(expression.comparator) || typeof expression.value !== "string" || expression.value.length > 200) return false;
  const metricIds = new Set(metrics.map(item => item.id));
  if (metricIds.size !== metrics.length || !metricIds.has(expression.startMetric)) return false;
  const operations = Array.isArray(expression.operations) ? expression.operations : [];
  if (operations.length > 12 || !operations.every(item => RULE_ARITHMETIC_OPERATORS.has(item.operator) && metricIds.has(item.metricId))) return false;
  return ["CONTAINS", "NOT_CONTAINS"].includes(expression.comparator) || Number.isFinite(Number(expression.value));
}

function validateRuleDefinition(channel, definition) {
  if (!definition || definition.timeField !== "transactionDate") return false;
  const filters = Array.isArray(definition.filters) ? definition.filters : [];
  if (filters.length > 8 || !filters.every((item, index) => ruleFieldAllowed(channel, item.field) && RULE_LOGIC_OPERATORS.has(item.operator) &&
    typeof item.value === "string" && item.value.length <= 200 && (index === 0 || validRuleConnector(item.connector)))) return false;
  if (Array.isArray(definition.metrics)) {
    if (definition.metrics.length < 1 || definition.metrics.length > 8 || !definition.metrics.every(item => validateRuleMetric(channel, item))) return false;
    return validateRuleFormula(definition.metrics, definition.expression);
  }
  const windowValue = Number(definition.window?.value);
  if (!Number.isFinite(windowValue) || windowValue <= 0 || windowValue > 10000 || !RULE_WINDOW_UNITS.has(definition.window?.unit)) return false;
  if (definition.groupBy && !ruleFieldAllowed(channel, definition.groupBy)) return false;
  const aggregates = Array.isArray(definition.aggregates) ? definition.aggregates : [];
  if (filters.length > 8 || aggregates.length < 1 || aggregates.length > 8) return false;
  return aggregates.every((item, index) => {
    if (!RULE_AGGREGATES.has(item.metric) || !RULE_COMPARATORS.has(item.operator) || !Number.isFinite(Number(item.value)) || (index > 0 && !validRuleConnector(item.connector))) return false;
    if (item.metric === "COUNT") return !item.field;
    if (!ruleFieldAllowed(channel, item.field)) return false;
    return !["SUM", "AVG", "MIN", "MAX"].includes(item.metric) || NUMERIC_RULE_FIELDS.has(item.field);
  });
}

function compareRuleValue(actual, operator, expected) {
  if (["GT", "GTE", "LT", "LTE"].includes(operator) || typeof actual === "number") {
    const left = Number(actual), right = Number(expected);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
    return operator === "EQ" ? left === right : operator === "NE" ? left !== right : operator === "GT" ? left > right : operator === "GTE" ? left >= right : operator === "LT" ? left < right : left <= right;
  }
  const left = String(actual ?? "").toLocaleLowerCase("tr-TR"), right = String(expected ?? "").toLocaleLowerCase("tr-TR");
  if (operator === "EQ") return left === right;
  if (operator === "NE") return left !== right;
  if (operator === "CONTAINS") return left.includes(right);
  if (operator === "NOT_CONTAINS") return !left.includes(right);
  if (operator === "STARTS_WITH") return left.startsWith(right);
  if (operator === "ENDS_WITH") return left.endsWith(right);
  return false;
}

function combineRuleResults(items, predicate) {
  if (!items.length) return true;
  let result = predicate(items[0]);
  for (let index = 1; index < items.length; index++) result = items[index].connector === "OR" ? result || predicate(items[index]) : result && predicate(items[index]);
  return result;
}

function windowMilliseconds(window) {
  const multiplier = window.unit === "DAY" ? 86400000 : window.unit === "HOUR" ? 3600000 : 60000;
  return Number(window.value) * multiplier;
}

function aggregateRuleValue(items, condition) {
  if (condition.metric === "COUNT") return items.length;
  if (condition.metric === "DISTINCT") return new Set(items.map(item => item[condition.field]).filter(value => value !== null && value !== undefined && value !== "")).size;
  const values = items.map(item => Number(item[condition.field])).filter(Number.isFinite);
  if (!values.length) return 0;
  if (condition.metric === "SUM") return values.reduce((sum, value) => sum + value, 0);
  if (condition.metric === "AVG") return values.reduce((sum, value) => sum + value, 0) / values.length;
  if (condition.metric === "MIN") return Math.min(...values);
  return Math.max(...values);
}

function usableRuleIdentity(value) {
  const normalized = String(value ?? "").trim();
  return Boolean(normalized) && normalized.toLocaleUpperCase("tr-TR") !== "N/A";
}

function calculateMetric(tx, subject, definition, metric, pool, anchor) {
  const start = anchor - windowMilliseconds(metric.window);
  const filters = definition.filters || [];
  const candidates = pool.filter(item => {
    if (item.channel !== tx.channel) return false;
    const candidateTime = Date.parse(item.transactionDate || item.occurredAt);
    if (!Number.isFinite(candidateTime) || candidateTime < start || candidateTime > anchor) return false;
    if (metric.groupBy) {
      const identity = item[metric.groupBy];
      if (!usableRuleIdentity(identity) || identity !== subject) return false;
    }
    return !filters.length || combineRuleResults(filters, filter => compareRuleValue(item[filter.field], filter.operator, filter.value));
  });
  return { value: Math.round(aggregateRuleValue(candidates, metric) * 100) / 100, sampleSize: candidates.length };
}

function evaluateMetricFormula(values, expression) {
  const operands = [Number(values[expression.startMetric])], operators = [];
  for (const operation of expression.operations || []) {
    operands.push(Number(values[operation.metricId]));
    operators.push(operation.operator);
  }
  if (operands.some(value => !Number.isFinite(value))) return { matched: false, result: null };
  for (let index = 0; index < operators.length;) {
    if (operators[index] !== "MULTIPLY" && operators[index] !== "DIVIDE") { index++; continue; }
    if (operators[index] === "DIVIDE" && operands[index + 1] === 0) return { matched: false, result: null };
    operands.splice(index, 2, operators[index] === "MULTIPLY" ? operands[index] * operands[index + 1] : operands[index] / operands[index + 1]);
    operators.splice(index, 1);
  }
  let result = operands[0];
  for (let index = 0; index < operators.length; index++) result = operators[index] === "ADD" ? result + operands[index + 1] : result - operands[index + 1];
  result = typeof result === "number" ? Math.round(result * 100) / 100 : result;
  return { matched: compareRuleValue(result, expression.comparator, expression.value), result };
}

function evaluateMetricRule(tx, definition, pool, anchor) {
  const groupedMetrics = definition.metrics.filter(item => item.groupBy);
  const subjects = groupedMetrics.length ? [...new Set(groupedMetrics.map(item => tx[item.groupBy]).filter(usableRuleIdentity))] : [null];
  if (!subjects.length) return { matched: false, evidence: [], sampleSize: 0 };
  let fallback = null;
  for (const subject of subjects) {
    const values = {}, evidence = [];
    let sampleSize = 0;
    for (const metric of definition.metrics) {
      const calculated = calculateMetric(tx, subject, definition, metric, pool, anchor);
      values[metric.id] = calculated.value;
      sampleSize += calculated.sampleSize;
      evidence.push({ id: metric.id, metric: metric.metric, field: metric.field || null, groupBy: metric.groupBy || null, window: metric.window, subject, actual: calculated.value, sampleSize: calculated.sampleSize });
    }
    const formula = evaluateMetricFormula(values, definition.expression);
    const result = { matched: formula.matched, evidence, sampleSize, subject, formulaResult: formula.result };
    if (result.matched) return result;
    fallback ||= result;
  }
  return fallback || { matched: false, evidence: [], sampleSize: 0 };
}

function evaluateNoCodeRule(tx, ruleDefinition) {
  const anchor = Date.parse(tx.transactionDate || tx.occurredAt);
  if (!Number.isFinite(anchor)) return { matched: false, evidence: [] };
  const filters = ruleDefinition.filters || [];
  if (filters.length && !combineRuleResults(filters, item => compareRuleValue(tx[item.field], item.operator, item.value))) return { matched: false, evidence: [] };
  const pool = state.transactions.some(item => item.id === tx.id) ? state.transactions : [...state.transactions, tx];
  if (Array.isArray(ruleDefinition.metrics)) return evaluateMetricRule(tx, ruleDefinition, pool, anchor);
  const start = anchor - windowMilliseconds(ruleDefinition.window);
  const candidates = pool.filter(item => {
    if (item.channel !== tx.channel) return false;
    const candidateTime = Date.parse(item.transactionDate || item.occurredAt);
    if (!Number.isFinite(candidateTime) || candidateTime < start || candidateTime > anchor) return false;
    if (ruleDefinition.groupBy && (tx[ruleDefinition.groupBy] == null || item[ruleDefinition.groupBy] !== tx[ruleDefinition.groupBy])) return false;
    return !filters.length || combineRuleResults(filters, filter => compareRuleValue(item[filter.field], filter.operator, filter.value));
  });
  const evidence = ruleDefinition.aggregates.map(condition => ({
    metric: condition.metric,
    field: condition.field || null,
    actual: Math.round(aggregateRuleValue(candidates, condition) * 100) / 100,
    operator: condition.operator,
    expected: Number(condition.value)
  }));
  const matched = combineRuleResults(ruleDefinition.aggregates, condition => {
    const found = evidence.find(item => item.metric === condition.metric && item.field === (condition.field || null) && item.operator === condition.operator && item.expected === Number(condition.value));
    return compareRuleValue(found?.actual, condition.operator, condition.value);
  });
  return { matched, evidence, sampleSize: candidates.length };
}

const PHYSICAL_POS_FILTER_FIELDS = new Set([
  "id", "createdAt", "transactionDate", "ccNo", "amount", "currency", "merchantName",
  "bankErrorCode", "bankErrorDescription", "assignedAnalyst", "reviewStatus", "riskScore",
  "ruleSummary", "resolution", "invoiceId", "invoiceDescription", "cardProgram", "bin",
  "merchantId", "cardCountry", "merchantMcc", "merchantCreatedDate", "terminalUid",
  "terminalSerialNo", "imei", "locationTime", "lastPingTime", "timeOnTerminal",
  "batteryLevel", "networkType", "terminalIpAddress"
]);
const POS_FILTER_FIELDS = new Set([
  "id", "createdAt", "transactionDate", "ccHolderName", "ccNo", "merchantName", "amount",
  "riskScore", "ruleSummary", "resolution", "reviewStatus", "assignedAnalyst", "billAddress",
  "billCity", "billState", "billPostcode", "billCountry", "billEmail", "billPhone", "cardProgram",
  "isRecurringPayment", "paymentFrequency", "bin", "responseCode", "merchantId", "cardCountry",
  "merchantMcc", "nonSecureStatus", "bankErrorCode", "bankErrorDescription", "cardExpireDate",
  "merchantCreateDate", "merchantRiskLevel", "merchantRiskScore", "cardToken", "merchantWebsite",
  "callbackUrl3d", "merchantWebsiteDomainRegistryMonthDuration", "merchantIp", "merchantIpCountry",
  "invoiceId", "invoiceDescription", "currency"
]);
const WALLET_FILTER_FIELDS = new Set([
  "id", "createdAt", "transactionDate", "receiverAccountNumber", "senderAccountNumber",
  "senderIban", "receiverIban", "amount", "currency", "senderAccountHolderName",
  "receiverAccountHolderName", "senderAccountCreatedDate", "receiverAccountCreatedDate",
  "receiverKycLevel", "senderKycLevel", "senderAccountEmail", "receiverAccountEmail",
  "senderAge", "receiverAge", "ruleSummary", "riskScore", "assignedAnalyst", "reviewStatus", "description"
]);
const CHANNEL_FILTER_FIELDS = { WALLET: WALLET_FILTER_FIELDS, POS: POS_FILTER_FIELDS, PHYSICAL_POS: PHYSICAL_POS_FILTER_FIELDS };
const FILTER_FIELDS = new Set([...POS_FILTER_FIELDS, ...PHYSICAL_POS_FILTER_FIELDS, ...WALLET_FILTER_FIELDS]);
const STRING_FILTERS = new Set(["EQ", "NE", "CONTAINS", "STARTS_WITH", "ENDS_WITH", "REGEX"]);
const ORDER_FILTERS = new Set(["EQ", "NE", "GT", "GTE", "LT", "LTE"]);

function columnValue(tx, field) {
  if (field === "instrument") return tx.cardRef || tx.senderRef || "";
  if (field === "counterparty") return tx.merchantRef || tx.receiverRef || "";
  if (field === "ruleSummary") return `Detected by ${tx.ruleHits?.length || 0} rule${tx.ruleHits?.length === 1 ? "" : "s"}`;
  return tx[field];
}

function matchesColumnFilter(tx, filter) {
  const { field, operator, value } = filter || {};
  if (!FILTER_FIELDS.has(field) || typeof value !== "string" || value.length > 200) return false;
  const actual = columnValue(tx, field);
  const numeric = ["amount", "riskScore", "receiverKycLevel", "senderKycLevel", "senderAge", "receiverAge", "merchantRiskScore", "merchantWebsiteDomainRegistryMonthDuration", "timeOnTerminal", "batteryLevel"].includes(field);
  const date = ["occurredAt", "createdAt", "transactionDate", "senderAccountCreatedDate", "receiverAccountCreatedDate", "cardExpireDate", "merchantCreateDate", "merchantCreatedDate", "locationTime", "lastPingTime"].includes(field);
  const enumLike = ["currency", "merchantRisk", "threeDs", "reviewStatus", "paymentBlocked", "resolution", "cardProgram", "isRecurringPayment", "paymentFrequency", "merchantRiskLevel", "nonSecureStatus", "networkType"].includes(field);
  const allowed = numeric || date ? ORDER_FILTERS : enumLike ? new Set(["EQ", "NE"]) : STRING_FILTERS;
  if (!allowed.has(operator)) return false;

  if (actual == null) {
    const expectsEmpty = value === "" || value.toLocaleLowerCase("tr-TR") === "n/a";
    return operator === "EQ" ? expectsEmpty : operator === "NE" ? !expectsEmpty : false;
  }

  if (numeric || date) {
    const left = date ? Date.parse(actual) : Number(actual);
    const right = date ? Date.parse(value) : Number(value);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
    return operator === "EQ" ? left === right : operator === "NE" ? left !== right :
      operator === "GT" ? left > right : operator === "GTE" ? left >= right :
      operator === "LT" ? left < right : left <= right;
  }

  const left = String(actual ?? "").toLocaleLowerCase("tr-TR");
  const right = value.toLocaleLowerCase("tr-TR");
  if (operator === "EQ") return left === right;
  if (operator === "NE") return left !== right;
  if (operator === "CONTAINS") return left.includes(right);
  if (operator === "STARTS_WITH") return left.startsWith(right);
  if (operator === "ENDS_WITH") return left.endsWith(right);
  if (operator === "REGEX") {
    if (value.length > 120) return false;
    try { return new RegExp(value, "iu").test(String(actual ?? "")); }
    catch { return false; }
  }
  return false;
}

function evaluate(tx) {
  const manualDecision = tx.decisionBy && tx.decisionBy !== "System";
  tx.ruleHits = state.rules.filter(r => r.active && r.channel === tx.channel).map(ruleItem => {
    if (ruleItem.definition) {
      const result = evaluateNoCodeRule(tx, ruleItem.definition);
      return result.matched ? { id: randomUUID(), ruleId: ruleItem.id, ruleName: ruleItem.name, scoreContribution: ruleItem.scoreContribution, matchedAt: now(), evidence: result.evidence, sampleSize: result.sampleSize, subject: result.subject ?? null, formulaResult: result.formulaResult ?? null } : null;
    }
    return tx[ruleItem.fieldName] != null && compare(tx[ruleItem.fieldName], ruleItem.operator, ruleItem.expectedValue) ?
      { id: randomUUID(), ruleId: ruleItem.id, ruleName: ruleItem.name, scoreContribution: ruleItem.scoreContribution, matchedAt: now() } : null;
  }).filter(Boolean);
  tx.riskScore = Math.min(100, tx.ruleHits.reduce((sum, hit) => sum + hit.scoreContribution, 0));
  tx.paymentBlocked = tx.riskScore === 100;
  if (!manualDecision) {
    tx.reviewStatus = tx.riskScore >= threshold ? "WAITING_FOR_REVIEW" : "NOT_FRAUD";
    tx.decisionBy = "System";
  }
}

function reEvaluateAllTransactions() {
  for (const transaction of [...state.transactions].sort((a, b) => String(a.transactionDate || a.occurredAt).localeCompare(String(b.transactionDate || b.occurredAt)))) evaluate(transaction);
}

async function save() { await mkdir(dataDir, { recursive: true }); await writeFile(dataFile, JSON.stringify(state, null, 2)); }
async function load() {
  if (existsSync(dataFile)) state = JSON.parse(await readFile(dataFile, "utf8")); else {
    state = baseState();
    for (let i = 0; i < 96; i++) state.transactions.push(makeTransaction());
    await save();
  }
  if (!Array.isArray(state.defaultViews)) state.defaultViews = [];
  if (!Array.isArray(state.personalCustomers)) state.personalCustomers = [];
  let migrated = false;
  const validTransactions = state.transactions.filter(tx => tx.channel !== "WALLET" || validCustomerNumber(tx.senderAccountNumber) || validCustomerNumber(tx.receiverAccountNumber));
  if (validTransactions.length !== state.transactions.length) { state.transactions = validTransactions; migrated = true; }
  for (const tx of state.transactions) {
    if (tx.channel === "WALLET" && (!tx.createdAt || !tx.transactionDate || !tx.senderIban || !tx.receiverIban)) {
      enrichWalletTransaction(tx); migrated = true;
    }
    if (tx.channel === "WALLET") {
      const before = state.personalCustomers.length;
      syncWalletCustomers(tx);
      if (state.personalCustomers.length !== before) migrated = true;
    }
    if (tx.channel === "POS" && (!tx.createdAt || !tx.transactionDate || !tx.ccNo || !tx.merchantName)) {
      enrichVirtualPosTransaction(tx); migrated = true;
    }
    if (tx.channel === "PHYSICAL_POS" && (!tx.createdAt || !tx.transactionDate || !tx.terminalUid || !tx.terminalSerialNo)) {
      enrichPhysicalPosTransaction(tx); migrated = true;
    }
  }
  state.generator.running = false;
  if (migrated) await save();
}

function user(req) { return String(req.headers["x-demo-user"] || "analyst.one"); }
function canEdit(actor) { return !["viewer", "rule.author"].includes(actor.toLowerCase()); }
async function body(req) {
  let raw = ""; for await (const chunk of req) { raw += chunk; if (raw.length > 1_000_000) throw new Error("Body too large"); }
  return raw ? JSON.parse(raw) : {};
}
function audit(tx, actor, action, detail) { state.audits.push({ id: randomUUID(), transactionId: tx.id, actor, action, detail, createdAt: now() }); }
function txById(id) { return state.transactions.find(t => t.id === id); }
function detail(tx, actor) {
  const editable = canEdit(actor) && (!tx.lockOwner || new Date(tx.lockExpiresAt) < new Date() || tx.lockOwner === actor);
  return { transaction: tx, ruleHits: tx.ruleHits, comments: state.comments.filter(c => c.transactionId === tx.id).sort((a,b) => a.createdAt.localeCompare(b.createdAt)), auditTrail: state.audits.filter(a => a.transactionId === tx.id).sort((a,b) => b.createdAt.localeCompare(a.createdAt)), editable };
}
function claim(tx, actor) {
  const final = ["FRAUD", "NOT_FRAUD"].includes(tx.reviewStatus);
  const free = !tx.lockOwner || new Date(tx.lockExpiresAt) < new Date() || tx.lockOwner === actor;
  if (free && canEdit(actor)) {
    if (tx.lockOwner !== actor) audit(tx, actor, "ASSIGNED", "İşlem inceleme için atandı");
    tx.lockOwner = actor; tx.lockExpiresAt = new Date(Date.now() + 300000).toISOString(); tx.assignedAnalyst = actor;
    if (!final) tx.reviewStatus = "IN_REVIEW";
  }
}
function assertEditable(tx, actor) {
  if (!canEdit(actor)) return "Bu kullanıcı salt okunur";
  if (tx.lockOwner && new Date(tx.lockExpiresAt) > new Date() && tx.lockOwner !== actor) return "İşlem başka bir analist tarafından inceleniyor";
  tx.lockOwner = actor; tx.lockExpiresAt = new Date(Date.now() + 300000).toISOString(); tx.assignedAnalyst = actor; return null;
}

function personalTransactionView(tx, accountNumber) {
  const sent = tx.senderAccountNumber === accountNumber;
  const received = tx.receiverAccountNumber === accountNumber;
  return {
    id: tx.id,
    transactionDate: tx.transactionDate || tx.occurredAt,
    createdAt: tx.createdAt || tx.occurredAt,
    direction: sent && received ? "INTERNAL" : sent ? "SENT" : "RECEIVED",
    counterpartyAccountNumber: sent ? tx.receiverAccountNumber : tx.senderAccountNumber,
    counterpartyName: sent ? tx.receiverAccountHolderName : tx.senderAccountHolderName,
    counterpartyIban: sent ? tx.receiverIban : tx.senderIban,
    amount: tx.amount,
    currency: tx.currency,
    description: tx.description,
    status: tx.reviewStatus,
    score: tx.riskScore
  };
}

function personalProfile(accountNumber, from, to) {
  const customer = state.personalCustomers.find(item => item.accountNumber === accountNumber);
  if (!customer) return null;
  const allTransactions = state.transactions.filter(tx => tx.channel === "WALLET" && (tx.senderAccountNumber === accountNumber || tx.receiverAccountNumber === accountNumber));
  const fromTime = from ? Date.parse(`${from}T00:00:00`) : null;
  const toTime = to ? Date.parse(`${to}T23:59:59.999`) : null;
  const transactions = allTransactions.filter(tx => {
    const timestamp = Date.parse(tx.transactionDate || tx.occurredAt);
    return (!Number.isFinite(fromTime) || timestamp >= fromTime) && (!Number.isFinite(toTime) || timestamp <= toTime);
  }).sort((a, b) => String(b.transactionDate || b.occurredAt).localeCompare(String(a.transactionDate || a.occurredAt))).map(tx => personalTransactionView(tx, accountNumber));
  const monthStart = Date.now() - 30 * 86400000;
  const monthlyTransactions = allTransactions.filter(tx => Date.parse(tx.transactionDate || tx.occurredAt) >= monthStart);
  const transactionActivities = allTransactions.map(tx => {
    const sent = tx.senderAccountNumber === accountNumber;
    const received = tx.receiverAccountNumber === accountNumber;
    return {
      id: `tx-${tx.id}`,
      type: sent && received ? "INTERNAL_TRANSFER" : sent ? "MONEY_SENT" : "MONEY_RECEIVED",
      description: `${tx.amount} ${tx.currency} ${sent && received ? "internal transfer" : sent ? "sent" : "received"}`,
      actor: customer.fullName,
      ipAddress: null,
      deviceId: null,
      transactionId: tx.id,
      createdAt: tx.transactionDate || tx.occurredAt
    };
  });
  return {
    customer: {
      ...customer,
      monthlyTransactionVolume: Math.round(monthlyTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0) * 100) / 100,
      monthlyTransactionCount: monthlyTransactions.length
    },
    transactions,
    transactionRange: { from: from || null, to: to || null, total: transactions.length },
    activities: [...customer.activities, ...transactionActivities].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  };
}

async function api(req, res, url) {
  const method = req.method, path = url.pathname, actor = user(req);
  if (path === "/api/health" && method === "GET") return json(res, 200, { status: "UP", service: "kostak-local-preview", time: now() });
  const personalMatch = path.match(/^\/api\/personal\/([^/]+)$/i);
  if (personalMatch && method === "GET") {
    const accountNumber = decodeURIComponent(personalMatch[1]);
    const result = personalProfile(accountNumber, url.searchParams.get("from"), url.searchParams.get("to"));
    if (!result) return json(res, 404, { message: "Customer not found" });
    return json(res, 200, result);
  }
  if (path === "/api/views/default" && method === "GET") {
    const channel = url.searchParams.get("channel");
    if (!["WALLET", "POS", "PHYSICAL_POS"].includes(channel)) return json(res, 400, { message: "Geçersiz kanal" });
    const view = state.defaultViews.find(item => item.user === actor && item.channel === channel) || null;
    return json(res, 200, { view });
  }
  if (path === "/api/views/default" && method === "PUT") {
    const input = await body(req), channel = input.channel;
    const filters = Array.isArray(input.filters) ? input.filters : [];
    const columnOrder = Array.isArray(input.columnOrder) ? input.columnOrder : [];
    const validChannel = ["WALLET", "POS", "PHYSICAL_POS"].includes(channel);
    const channelFields = CHANNEL_FILTER_FIELDS[channel] || new Set();
    const validFilters = filters.length <= 60 && filters.every(filter =>
      channelFields.has(filter?.field) && typeof filter?.operator === "string" &&
      typeof filter?.value === "string" && filter.value.length <= 200
    );
    const validOrder = columnOrder.length === channelFields.size &&
      new Set(columnOrder).size === channelFields.size && columnOrder.every(field => channelFields.has(field));
    if (!validChannel || !validFilters || !validOrder) return json(res, 400, { message: "Varsayılan görünüm geçersiz" });
    const savedView = { user: actor, channel, filters, columnOrder, updatedAt: now() };
    const existingIndex = state.defaultViews.findIndex(item => item.user === actor && item.channel === channel);
    if (existingIndex >= 0) state.defaultViews[existingIndex] = savedView; else state.defaultViews.push(savedView);
    await save();
    return json(res, 200, savedView);
  }
  if (path === "/api/transactions" && method === "GET") {
    const channel = url.searchParams.get("channel"), status = url.searchParams.get("status"), minScore = Number(url.searchParams.get("minScore") || 0), search = (url.searchParams.get("search") || "").toLowerCase();
    const page = Math.max(0, Number(url.searchParams.get("page") || 0)), size = Math.min(100, Math.max(1, Number(url.searchParams.get("size") || 20)));
    let columnFilters = [];
    try {
      const parsed = JSON.parse(url.searchParams.get("filters") || "[]");
      if (Array.isArray(parsed) && parsed.length <= 60) columnFilters = parsed;
      else return json(res, 400, { message: "Geçersiz kolon filtreleri" });
    } catch { return json(res, 400, { message: "Kolon filtreleri okunamadı" }); }
    const items = state.transactions.filter(t =>
      (!channel || t.channel === channel) &&
      (!status || t.reviewStatus === status) &&
      t.riskScore >= minScore &&
      (!search || [t.id,t.customerRef,t.cardRef,t.merchantRef,t.senderAccountNumber,t.receiverAccountNumber,t.senderIban,t.receiverIban,t.senderAccountHolderName,t.receiverAccountHolderName,t.senderAccountEmail,t.receiverAccountEmail,t.description,t.ccHolderName,t.ccNo,t.merchantName,t.billEmail,t.billPhone,t.merchantId,t.bin,t.cardToken,t.merchantWebsite,t.merchantIp,t.invoiceId,t.invoiceDescription,t.terminalUid,t.terminalSerialNo,t.imei,t.terminalIpAddress].some(v => String(v || "").toLowerCase().includes(search))) &&
      columnFilters.every(filter => matchesColumnFilter(t, filter))
    ).sort((a,b) => b.occurredAt.localeCompare(a.occurredAt));
    return json(res, 200, { content: items.slice(page*size, page*size+size), totalElements: items.length, totalPages: Math.ceil(items.length/size), number: page, size, first: page===0, last: page>=Math.ceil(items.length/size)-1 });
  }
  const txMatch = path.match(/^\/api\/transactions\/([^/]+)$/);
  if (txMatch && method === "GET") { const tx = txById(txMatch[1]); if (!tx) return json(res,404,{message:"İşlem bulunamadı"}); claim(tx,actor); await save(); return json(res,200,detail(tx,actor)); }
  const commentMatch = path.match(/^\/api\/transactions\/([^/]+)\/comments$/);
  if (commentMatch && method === "POST") { const tx=txById(commentMatch[1]); if(!tx)return json(res,404,{message:"İşlem bulunamadı"}); const denied=assertEditable(tx,actor); if(denied)return json(res,409,{message:denied}); const input=await body(req); if(!String(input.content||"").trim())return json(res,400,{message:"Yorum boş olamaz"}); state.comments.push({id:randomUUID(),transactionId:tx.id,author:actor,content:String(input.content).trim(),createdAt:now()}); audit(tx,actor,"COMMENT_ADDED",String(input.content).trim()); await save(); return json(res,200,detail(tx,actor)); }
  const decisionMatch = path.match(/^\/api\/transactions\/([^/]+)\/decision$/);
  if (decisionMatch && method === "POST") { const tx=txById(decisionMatch[1]); if(!tx)return json(res,404,{message:"İşlem bulunamadı"}); const denied=assertEditable(tx,actor); if(denied)return json(res,409,{message:denied}); const input=await body(req); if(!["FRAUD","NOT_FRAUD","ON_HOLD"].includes(input.status))return json(res,400,{message:"Geçersiz karar"}); tx.reviewStatus=input.status;tx.decisionBy=actor;if(input.status!=="ON_HOLD"){tx.lockOwner=null;tx.lockExpiresAt=null}audit(tx,actor,"DECISION",input.status);await save();return json(res,200,detail(tx,actor)); }
  if (path === "/api/transactions/bulk-decision" && method === "POST") { const input=await body(req); if(!canEdit(actor))return json(res,403,{message:"Bu kullanıcı salt okunur"});let updated=0;for(const id of input.ids||[]){const tx=txById(id);if(!tx)continue;const locked=tx.lockOwner&&new Date(tx.lockExpiresAt)>new Date()&&tx.lockOwner!==actor;if(locked)continue;tx.reviewStatus=input.status;tx.decisionBy=actor;tx.assignedAnalyst=actor;tx.lockOwner=null;tx.lockExpiresAt=null;audit(tx,actor,"BULK_DECISION",input.status);updated++}await save();return json(res,200,{updated}); }
  if (path === "/api/rules" && method === "GET") return json(res,200,[...state.rules].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));
  if (path === "/api/rules" && method === "POST") {
    const input = await body(req), scoreContribution = Number(input.scoreContribution);
    if (input.definition) {
      if (!input.name || !["WALLET", "POS", "PHYSICAL_POS"].includes(input.channel) || !Number.isFinite(scoreContribution) || scoreContribution < 1 || scoreContribution > 100) return json(res,400,{message:"Rule fields are missing or invalid"});
      if (!validateRuleDefinition(input.channel, input.definition)) return json(res,400,{message:"Invalid no-code rule definition"});
      const created = { ...rule(input.name, input.description || "", input.channel, null, null, null, scoreContribution), definition: { ...input.definition, timeField: "transactionDate" }, builderVersion: Array.isArray(input.definition.metrics) ? 3 : 2, active: input.active !== false };
      state.rules.push(created); reEvaluateAllTransactions(); await save(); return json(res,200,created);
    }
    if (!input.name || !input.fieldName || !input.expectedValue || !["WALLET", "POS", "PHYSICAL_POS"].includes(input.channel) || !Number.isFinite(scoreContribution)) return json(res,400,{message:"Rule fields are missing"});
    const legacyRule = { ...rule(input.name,input.description||"",input.channel,input.fieldName,input.operator,input.expectedValue,scoreContribution),active:input.active!==false };
    state.rules.push(legacyRule); reEvaluateAllTransactions(); await save(); return json(res,200,legacyRule);
  }
  const toggleMatch = path.match(/^\/api\/rules\/([^/]+)\/toggle$/);
  if(toggleMatch&&method==="POST"){
    const found=state.rules.find(r=>r.id===toggleMatch[1]);
    if(!found)return json(res,404,{message:"Rule not found"});
    found.active=!found.active;found.version++;found.updatedAt=now();reEvaluateAllTransactions();await save();return json(res,200,found);
  }
  if(path==="/api/generator/status"&&method==="GET")return json(res,200,state.generator);
  if(path==="/api/generator/generate"&&method==="POST"){const count=Math.min(250,Math.max(1,Number(url.searchParams.get("count")||12))),channel=url.searchParams.get("channel");for(let i=0;i<count;i++)state.transactions.push(makeTransaction(channel||undefined,i===0));await save();return json(res,200,{generated:count})}
  if(path==="/api/generator/start"&&method==="POST"){state.generator.running=true;state.generator.rate=Math.min(20,Math.max(1,Number(url.searchParams.get("rate")||2)));startStream();await save();return json(res,200,state.generator)}
  if(path==="/api/generator/stop"&&method==="POST"){state.generator.running=false;if(stream){clearInterval(stream);stream=null}await save();return json(res,200,state.generator)}
  return json(res,404,{message:"Endpoint bulunamadı"});
}

function startStream(){if(stream)clearInterval(stream);stream=setInterval(async()=>{for(let i=0;i<state.generator.rate;i++)state.transactions.push(makeTransaction());await save()},1500)}
async function staticFile(res,path){const relative=path==="/"||/^\/Personal\/[^/]+$/i.test(path)?"index.html":path.slice(1);const target=join(publicDir,relative);if(!target.startsWith(publicDir)||!existsSync(target))return false;const data=await readFile(target);const types={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml"};res.writeHead(200,{"Content-Type":types[extname(target)]||"application/octet-stream"});res.end(data);return true}

await load();
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,`http://${req.headers.host}`);if(url.pathname.startsWith("/api/"))return await api(req,res,url);if(!await staticFile(res,url.pathname))json(res,404,{message:"Dosya bulunamadı"})}catch(error){console.error(error);json(res,500,{message:error.message||"Internal error"})}});
server.listen(port,"127.0.0.1",()=>console.log(`Kostak Fraud Tool: http://localhost:${port}`));
