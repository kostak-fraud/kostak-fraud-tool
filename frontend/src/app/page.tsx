"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Channel, PageResult, Rule, Status, Transaction, TransactionDetail } from "@/lib/types";

const channelLabels: Record<Channel, string> = { WALLET: "Wallet", POS: "Virtual POS", PHYSICAL_POS: "Physical POS" };
const statusLabels: Record<Status, string> = {
  WAITING_FOR_REVIEW: "Waiting for Review", IN_REVIEW: "In Review", ON_HOLD: "On Hold", FRAUD: "Fraud", NOT_FRAUD: "Not Fraud",
};
const emptyPage: PageResult<Transaction> = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20, first: true, last: true };

function shortId(id: string) { return id.slice(0, 8).toUpperCase(); }
function money(value: number, currency: string) { return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(value); }
function date(value: string) { return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value)); }
function statusClass(status: Status) { return `badge status-${status.toLowerCase().replaceAll("_", "-")}`; }

export default function Home() {
  const [section, setSection] = useState<"transactions" | "rules" | "settings">("transactions");
  const [channel, setChannel] = useState<Channel>("POS");
  const [user, setUser] = useState("analyst.one");
  const [pageData, setPageData] = useState(emptyPage);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const [minScore, setMinScore] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<TransactionDetail | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [generatorRunning, setGeneratorRunning] = useState(false);
  const [ruleModal, setRuleModal] = useState(false);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2800); };
  const loadTransactions = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await api.transactions(user, { channel, status, minScore, search: query, page, size: 20 });
      setPageData(data); setSelected(new Set());
    } catch (e) { setError(e instanceof Error ? e.message : "API bağlantısı kurulamadı"); }
    finally { setLoading(false); }
  }, [user, channel, status, minScore, query, page]);

  const loadRules = useCallback(async () => {
    try { setRules(await api.rules(user)); }
    catch (e) { setError(e instanceof Error ? e.message : "Kurallar alınamadı"); }
  }, [user]);

  useEffect(() => { void loadTransactions(); }, [loadTransactions]);
  useEffect(() => { void loadRules(); void api.generatorStatus(user).then(s => setGeneratorRunning(s.running)).catch(() => {}); }, [loadRules, user]);
  useEffect(() => { setPage(0); }, [channel, status, minScore, query]);
  useEffect(() => {
    if (!generatorRunning) return;
    const timer = window.setInterval(() => void loadTransactions(), 3000);
    return () => window.clearInterval(timer);
  }, [generatorRunning, loadTransactions]);

  const openDetail = async (tx: Transaction) => {
    try { setDetail(await api.detail(tx.id, user)); await loadTransactions(); }
    catch (e) { notify(e instanceof Error ? e.message : "Detay açılamadı"); }
  };

  const bulk = async (nextStatus: Status) => {
    const ids = selected.size ? [...selected] : pageData.content.map(tx => tx.id);
    if (!ids.length) return;
    try {
      const result = await api.bulk(ids, nextStatus, user);
      notify(`${result.updated} işlem güncellendi`); await loadTransactions();
    } catch (e) { notify(e instanceof Error ? e.message : "Toplu aksiyon başarısız"); }
  };

  const generate = async () => {
    try { const r = await api.generate(channel, user); notify(`${r.generated} yeni işlem üretildi`); await loadTransactions(); }
    catch (e) { notify(e instanceof Error ? e.message : "Üretim başarısız"); }
  };

  const toggleGenerator = async () => {
    try {
      const result = generatorRunning ? await api.stopGenerator(user) : await api.startGenerator(user);
      setGeneratorRunning(result.running); notify(result.running ? "Canlı üretim başladı" : "Canlı üretim durduruldu");
    } catch (e) { notify(e instanceof Error ? e.message : "Generator kontrol edilemedi"); }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">K</div><div><strong>KOSTAK</strong><span>FRAUD COMMAND</span></div></div>
        <nav>
          <button className={section === "transactions" ? "nav-item active" : "nav-item"} onClick={() => setSection("transactions")}><span>⌁</span> Transactions <em>{pageData.totalElements}</em></button>
          <button className={section === "rules" ? "nav-item active" : "nav-item"} onClick={() => setSection("rules")}><span>⌘</span> Rules <em>{rules.filter(r => r.active).length}</em></button>
          <button className={section === "settings" ? "nav-item active" : "nav-item"} onClick={() => setSection("settings")}><span>⚙</span> Settings</button>
        </nav>
        <div className="sidebar-foot"><span className="pulse-dot" /> LOCAL ENVIRONMENT<br/><small>demo-tenant · API :8080</small></div>
      </aside>

      <main>
        <header className="topbar">
          <div><p className="eyebrow">FRAUD OPERATIONS / {section.toUpperCase()}</p><h1>{section === "transactions" ? "Transaction Monitoring" : section === "rules" ? "Detection Rules" : "Workspace Settings"}</h1></div>
          <div className="user-tools"><span className="system-health"><i /> System operational</span><select value={user} onChange={e => setUser(e.target.value)}><option>analyst.one</option><option>analyst.two</option><option>rule.author</option><option>viewer</option></select><div className="avatar">{user.slice(0, 2).toUpperCase()}</div></div>
        </header>

        {section === "transactions" && <section className="content">
          <div className="metric-grid">
            <Metric label="Channel volume" value={String(pageData.totalElements)} note={`${channelLabels[channel]} records`} />
            <Metric label="Visible high risk" value={String(pageData.content.filter(t => t.riskScore >= 60).length)} note="Score ≥ 60" danger />
            <Metric label="Awaiting analyst" value={String(pageData.content.filter(t => t.reviewStatus === "WAITING_FOR_REVIEW").length)} note="Current page" warning />
            <Metric label="Live generator" value={generatorRunning ? "RUNNING" : "PAUSED"} note="Synthetic data only" live={generatorRunning} />
          </div>

          <div className="panel transaction-panel">
            <div className="channel-tabs">
              {(Object.keys(channelLabels) as Channel[]).map(c => <button key={c} className={channel === c ? "channel active" : "channel"} onClick={() => setChannel(c)}>{channelLabels[c]}</button>)}
              <div className="channel-actions"><button className="btn ghost" onClick={toggleGenerator}><span className={generatorRunning ? "stop-icon" : "play-icon"}>{generatorRunning ? "■" : "▶"}</span>{generatorRunning ? "Stop stream" : "Start stream"}</button><button className="btn primary" onClick={generate}>＋ Generate 15</button></div>
            </div>

            <div className="filters">
              <form onSubmit={(e) => { e.preventDefault(); setQuery(search); }} className="search"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ID, customer, card, merchant…" /></form>
              <select value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              <select value={minScore} onChange={e => setMinScore(e.target.value)}><option value="">Any score</option><option value="30">Score ≥ 30</option><option value="60">Score ≥ 60</option><option value="90">Score ≥ 90</option></select>
              <button className="btn ghost" onClick={() => { setSearch(""); setQuery(""); setStatus(""); setMinScore(""); }}>Clear</button>
              <div className="bulk-actions"><span>{selected.size ? `${selected.size} selected` : "Current page"}</span><button className="btn danger" onClick={() => void bulk("FRAUD")}>Mark Fraud</button><button className="btn success" onClick={() => void bulk("NOT_FRAUD")}>Not Fraud</button></div>
            </div>

            {error && <div className="error-state"><strong>API bağlantısı kurulamadı</strong><span>{error}</span><button className="btn primary" onClick={() => void loadTransactions()}>Retry</button></div>}
            {!error && <div className="table-wrap"><table>
              <thead><tr><th className="check"><input type="checkbox" checked={!!pageData.content.length && selected.size === pageData.content.length} onChange={e => setSelected(e.target.checked ? new Set(pageData.content.map(t => t.id)) : new Set())} /></th><th>Transaction</th><th>Timestamp</th><th>Customer / Instrument</th><th>Merchant / Type</th><th className="right">Amount</th><th>Risk</th><th>Status</th><th>Assigned</th><th /></tr></thead>
              <tbody>{loading ? Array.from({ length: 8 }).map((_, i) => <tr className="skeleton-row" key={i}><td colSpan={10}><span /></td></tr>) : pageData.content.map(tx => <tr key={tx.id} className={tx.riskScore >= 60 ? "high-risk-row" : ""}>
                <td className="check"><input type="checkbox" checked={selected.has(tx.id)} onChange={e => { const next = new Set(selected); e.target.checked ? next.add(tx.id) : next.delete(tx.id); setSelected(next); }} onClick={e => e.stopPropagation()} /></td>
                <td onClick={() => void openDetail(tx)}><strong className="mono">{shortId(tx.id)}</strong><small>{channelLabels[tx.channel]}</small></td>
                <td onClick={() => void openDetail(tx)}>{date(tx.occurredAt)}</td>
                <td onClick={() => void openDetail(tx)}><strong>{tx.customerRef}</strong><small>{tx.cardRef ?? tx.senderRef ?? "—"}</small></td>
                <td onClick={() => void openDetail(tx)}><strong>{tx.merchantRef ?? tx.receiverRef ?? "Internal"}</strong><small>{tx.transactionType.replaceAll("_", " ")}{tx.merchantRisk ? ` · ${tx.merchantRisk}` : ""}</small></td>
                <td onClick={() => void openDetail(tx)} className="right amount">{money(tx.amount, tx.currency)}</td>
                <td onClick={() => void openDetail(tx)}><Risk score={tx.riskScore} /></td>
                <td onClick={() => void openDetail(tx)}><span className={statusClass(tx.reviewStatus)}>{statusLabels[tx.reviewStatus]}</span>{tx.paymentBlocked && <small className="blocked">PAYMENT BLOCKED</small>}</td>
                <td onClick={() => void openDetail(tx)}>{tx.assignedAnalyst ? <span className="analyst">{tx.assignedAnalyst}</span> : <span className="muted">Unassigned</span>}</td>
                <td><button className="icon-btn" onClick={() => void openDetail(tx)}>→</button></td>
              </tr>)}</tbody>
            </table>{!loading && !pageData.content.length && <div className="empty">No transactions match these filters.</div>}</div>}

            <div className="pagination"><span>Showing {pageData.content.length} of {pageData.totalElements} records</span><div><button disabled={page === 0} onClick={() => setPage(p => p - 1)}>←</button><span>Page {page + 1} / {Math.max(1, pageData.totalPages)}</span><button disabled={pageData.last} onClick={() => setPage(p => p + 1)}>→</button></div></div>
          </div>
        </section>}

        {section === "rules" && <Rules rules={rules} user={user} onReload={loadRules} onNew={() => setRuleModal(true)} notify={notify} />}
        {section === "settings" && <Settings user={user} />}
      </main>

      {detail && <DetailDrawer data={detail} user={user} onClose={() => setDetail(null)} onChanged={async d => { setDetail(d); await loadTransactions(); }} notify={notify} />}
      {ruleModal && <RuleModal user={user} onClose={() => setRuleModal(false)} onCreated={async () => { setRuleModal(false); await loadRules(); notify("Rule created and activated"); }} />}
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </div>
  );
}

function Metric({ label, value, note, danger, warning, live }: { label: string; value: string; note: string; danger?: boolean; warning?: boolean; live?: boolean }) {
  return <div className={`metric ${danger ? "danger-metric" : warning ? "warning-metric" : ""}`}><span>{label}</span><strong>{live && <i className="pulse-dot" />}{value}</strong><small>{note}</small></div>;
}

function Risk({ score }: { score: number }) {
  return <div className={`risk risk-${score >= 80 ? "critical" : score >= 60 ? "high" : score >= 30 ? "medium" : "low"}`}><strong>{score}</strong><div><i style={{ width: `${score}%` }} /></div></div>;
}

function Rules({ rules, user, onReload, onNew, notify }: { rules: Rule[]; user: string; onReload: () => Promise<void>; onNew: () => void; notify: (s: string) => void }) {
  const toggle = async (id: string) => { try { await api.toggleRule(id, user); await onReload(); notify("Rule status updated"); } catch (e) { notify(e instanceof Error ? e.message : "Rule update failed"); } };
  return <section className="content"><div className="section-head"><div><h2>Detection rule library</h2><p>Field comparison rules execute against every generated transaction.</p></div><button className="btn primary" onClick={onNew}>＋ Create rule</button></div><div className="rule-grid">{rules.map(rule => <article className="rule-card" key={rule.id}><div className="rule-top"><span className={`rule-state ${rule.active ? "on" : "off"}`}>{rule.active ? "ACTIVE" : "INACTIVE"}</span><span className="channel-chip">{channelLabels[rule.channel]}</span></div><h3>{rule.name}</h3><p>{rule.description || "No description"}</p><div className="condition"><span>IF</span><code>{rule.fieldName} {rule.operator} {rule.expectedValue}</code></div><div className="rule-score"><span>Risk contribution</span><strong>+{rule.scoreContribution}</strong></div><footer><small>v{rule.version} · {date(rule.updatedAt)}</small><button className="switch" aria-label="Toggle rule" data-on={rule.active} onClick={() => void toggle(rule.id)}><i /></button></footer></article>)}</div></section>;
}

function Settings({ user }: { user: string }) {
  return <section className="content"><div className="settings-grid"><div className="panel settings-card"><h2>Demo identity</h2><p>The active identity is sent to the API and enforced for investigation locks.</p><div className="identity"><div className="avatar large">{user.slice(0, 2).toUpperCase()}</div><div><strong>{user}</strong><span>{user === "viewer" ? "Viewer · read only" : user === "rule.author" ? "Rule Author" : "Fraud Analyst"}</span></div></div></div><div className="panel settings-card"><h2>Risk policy</h2><dl><div><dt>Review threshold</dt><dd>60 / 100</dd></div><div><dt>Automatic block</dt><dd>100 / 100</dd></div><div><dt>Lock lease</dt><dd>5 minutes</dd></div><div><dt>Tenant</dt><dd>demo-tenant</dd></div></dl></div><div className="panel settings-card"><h2>Environment</h2><p>This build runs entirely locally. Synthetic records contain no real customer information.</p><span className="badge environment">LOCAL DEMO</span></div></div></section>;
}

function DetailDrawer({ data, user, onClose, onChanged, notify }: { data: TransactionDetail; user: string; onClose: () => void; onChanged: (d: TransactionDetail) => Promise<void>; notify: (s: string) => void }) {
  const tx = data.transaction; const [comment, setComment] = useState(""); const [busy, setBusy] = useState(false);
  const decide = async (status: Status) => { setBusy(true); try { await onChanged(await api.decide(tx.id, status, user)); notify(`Decision saved: ${statusLabels[status]}`); } catch (e) { notify(e instanceof Error ? e.message : "Decision failed"); } finally { setBusy(false); } };
  const addComment = async (e: FormEvent) => { e.preventDefault(); if (!comment.trim()) return; setBusy(true); try { await onChanged(await api.comment(tx.id, comment, user)); setComment(""); notify("Comment added"); } catch (err) { notify(err instanceof Error ? err.message : "Comment failed"); } finally { setBusy(false); } };
  const info = [["Transaction", tx.id], ["Channel", channelLabels[tx.channel]], ["Occurred", date(tx.occurredAt)], ["Type", tx.transactionType], ["Customer", tx.customerRef], ["Card / sender", tx.cardRef ?? tx.senderRef ?? "—"], ["Merchant / receiver", tx.merchantRef ?? tx.receiverRef ?? "—"], ["3D Secure", tx.threeDs ? "Yes" : "No"]];
  return <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><aside className="drawer"><header><div><p className="eyebrow">INVESTIGATION CASE</p><h2>{shortId(tx.id)}</h2></div><button className="close" onClick={onClose}>×</button></header><div className="case-banner"><div><span>Total risk</span><strong>{tx.riskScore}<small>/100</small></strong></div><div><span>Review status</span><b className={statusClass(tx.reviewStatus)}>{statusLabels[tx.reviewStatus]}</b></div><div><span>Assigned analyst</span><b>{tx.assignedAnalyst ?? "Unassigned"}</b></div></div>{!data.editable && <div className="lock-warning">🔒 Read-only — another analyst owns the active lease or this identity has no edit permission.</div>}<div className="drawer-body"><section><h3>Transaction intelligence</h3><div className="info-grid">{info.map(([k, v]) => <div key={k}><span>{k}</span><strong>{v}</strong></div>)}<div><span>Amount</span><strong className="large-amount">{money(tx.amount, tx.currency)}</strong></div><div><span>Payment</span><strong className={tx.paymentBlocked ? "red" : "green"}>{tx.paymentBlocked ? "BLOCKED" : "PASSED"}</strong></div></div></section><section><h3>Rule evidence <em>{data.ruleHits.length}</em></h3>{data.ruleHits.length ? <div className="hit-list">{data.ruleHits.map(hit => <div key={hit.id}><span className="rule-icon">⌁</span><div><strong>{hit.ruleName}</strong><small>Matched {date(hit.matchedAt)}</small></div><b>+{hit.scoreContribution}</b></div>)}</div> : <div className="empty small">No rule matched this transaction.</div>}</section><section><h3>Analyst notes <em>{data.comments.length}</em></h3><div className="comments">{data.comments.map(c => <div className="comment" key={c.id}><div className="avatar tiny">{c.author.slice(0, 2).toUpperCase()}</div><div><strong>{c.author}<small>{date(c.createdAt)}</small></strong><p>{c.content}</p></div></div>)}</div><form className="comment-form" onSubmit={e => void addComment(e)}><textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Add investigation note…" disabled={!data.editable || busy} /><button className="btn primary" disabled={!data.editable || busy || !comment.trim()}>Add note</button></form></section><section><h3>Audit trail</h3><div className="timeline">{data.auditTrail.map(a => <div key={a.id}><i /><p><strong>{a.action.replaceAll("_", " ")}</strong><span>{a.detail}</span><small>{a.actor} · {date(a.createdAt)}</small></p></div>)}</div></section></div><footer className="decision-bar"><button className="btn hold" disabled={!data.editable || busy} onClick={() => void decide("ON_HOLD")}>On Hold</button><button className="btn success" disabled={!data.editable || busy} onClick={() => void decide("NOT_FRAUD")}>✓ Not Fraud</button><button className="btn danger" disabled={!data.editable || busy} onClick={() => void decide("FRAUD")}>⚑ Confirm Fraud</button></footer></aside></div>;
}

function RuleModal({ user, onClose, onCreated }: { user: string; onClose: () => void; onCreated: () => Promise<void> }) {
  const [form, setForm] = useState({ name: "", description: "", channel: "POS" as Channel, fieldName: "amount", operator: "GTE", expectedValue: "10000", scoreContribution: 60, active: true }); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => { e.preventDefault(); setBusy(true); setError(""); try { await api.createRule(form as Omit<Rule, "id" | "version" | "updatedAt">, user); await onCreated(); } catch (err) { setError(err instanceof Error ? err.message : "Rule could not be created"); } finally { setBusy(false); } };
  return <div className="overlay"><form className="modal" onSubmit={e => void submit(e)}><header><div><p className="eyebrow">NO-CODE RULE BUILDER</p><h2>Create detection rule</h2></div><button type="button" className="close" onClick={onClose}>×</button></header><label>Rule name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Large non-3DS payment" /></label><label>Description<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Explain why this behavior is risky" /></label><div className="form-row"><label>Channel<select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value as Channel })}>{Object.entries(channelLabels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label><label>Risk points<input type="number" min="1" max="100" value={form.scoreContribution} onChange={e => setForm({ ...form, scoreContribution: Number(e.target.value) })} /></label></div><div className="builder"><span>IF</span><select value={form.fieldName} onChange={e => setForm({ ...form, fieldName: e.target.value })}><option value="amount">amount</option><option value="currency">currency</option><option value="merchantRisk">merchant risk</option><option value="threeDs">3D Secure</option><option value="transactionType">transaction type</option><option value="merchantRef">merchant</option><option value="customerRef">customer</option></select><select value={form.operator} onChange={e => setForm({ ...form, operator: e.target.value })}><option>EQ</option><option>NE</option><option>GT</option><option>GTE</option><option>LT</option><option>LTE</option><option>CONTAINS</option></select><input value={form.expectedValue} onChange={e => setForm({ ...form, expectedValue: e.target.value })} /></div><label className="check-label"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Activate immediately</label>{error && <div className="form-error">{error}</div>}<footer><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>{busy ? "Creating…" : "Create rule"}</button></footer></form></div>;
}
