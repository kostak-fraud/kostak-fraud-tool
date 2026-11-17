import { Channel, PageResult, Rule, Status, Transaction, TransactionDetail } from "./types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

async function request<T>(path: string, user: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-Demo-User": user, ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `API hatas� (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  transactions: (user: string, filters: { channel: Channel; status?: string; minScore?: string; search?: string; page: number; size: number }) => {
    const q = new URLSearchParams({ channel: filters.channel, page: String(filters.page), size: String(filters.size) });
    if (filters.status) q.set("status", filters.status);
    if (filters.minScore) q.set("minScore", filters.minScore);
    if (filters.search) q.set("search", filters.search);
    return request<PageResult<Transaction>>(`/transactions?${q}`, user);
  },
  detail: (id: string, user: string) => request<TransactionDetail>(`/transactions/${id}`, user),
  comment: (id: string, content: string, user: string) => request<TransactionDetail>(`/transactions/${id}/comments`, user, { method: "POST", body: JSON.stringify({ content }) }),
  decide: (id: string, status: Status, user: string) => request<TransactionDetail>(`/transactions/${id}/decision`, user, { method: "POST", body: JSON.stringify({ status }) }),
  bulk: (ids: string[], status: Status, user: string) => request<{ updated: number }>("/transactions/bulk-decision", user, { method: "POST", body: JSON.stringify({ ids, status }) }),
  rules: (user: string) => request<Rule[]>("/rules", user),
  createRule: (input: Omit<Rule, "id" | "version" | "updatedAt">, user: string) => request<Rule>("/rules", user, { method: "POST", body: JSON.stringify(input) }),
  toggleRule: (id: string, user: string) => request<Rule>(`/rules/${id}/toggle`, user, { method: "POST" }),
  generate: (channel: Channel, user: string) => request<{ generated: number }>(`/generator/generate?count=15&channel=${channel}`, user, { method: "POST" }),
  generatorStatus: (user: string) => request<{ running: boolean; rate: number }>("/generator/status", user),
  startGenerator: (user: string) => request<{ running: boolean; rate: number }>("/generator/start?rate=2", user, { method: "POST" }),
  stopGenerator: (user: string) => request<{ running: boolean; rate: number }>("/generator/stop", user, { method: "POST" }),
};
