export type Channel = "WALLET" | "POS" | "PHYSICAL_POS";
export type Status = "WAITING_FOR_REVIEW" | "IN_REVIEW" | "ON_HOLD" | "FRAUD" | "NOT_FRAUD";

export interface Transaction {
  id: string; tenantId: string; channel: Channel; occurredAt: string; amount: number; currency: string;
  customerRef: string; senderRef?: string; receiverRef?: string; cardRef?: string; merchantRef?: string;
  merchantRisk?: "LOW" | "MEDIUM" | "HIGH"; terminalRef?: string; transactionType: string; threeDs: boolean;
  riskScore: number; reviewStatus: Status; decisionBy: string; assignedAnalyst?: string;
  paymentBlocked: boolean; lockOwner?: string; lockExpiresAt?: string;
}

export interface RuleHit { id: string; ruleName: string; scoreContribution: number; matchedAt: string; }
export interface TxComment { id: string; author: string; content: string; createdAt: string; }
export interface AuditEvent { id: string; actor: string; action: string; detail: string; createdAt: string; }
export interface TransactionDetail { transaction: Transaction; ruleHits: RuleHit[]; comments: TxComment[]; auditTrail: AuditEvent[]; editable: boolean; }
export interface PageResult<T> { content: T[]; totalElements: number; totalPages: number; number: number; size: number; first: boolean; last: boolean; }

export interface Rule {
  id: string; name: string; description: string; channel: Channel; fieldName: string;
  operator: string; expectedValue: string; scoreContribution: number; active: boolean; version: number; updatedAt: string;
}

