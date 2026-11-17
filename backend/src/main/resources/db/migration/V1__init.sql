CREATE TABLE transactions (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(80) NOT NULL,
  channel VARCHAR(30) NOT NULL,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  customer_ref VARCHAR(80) NOT NULL,
  sender_ref VARCHAR(80), receiver_ref VARCHAR(80), card_ref VARCHAR(80),
  merchant_ref VARCHAR(80), merchant_risk VARCHAR(20), terminal_ref VARCHAR(80),
  transaction_type VARCHAR(60) NOT NULL,
  three_ds BOOLEAN NOT NULL,
  risk_score INTEGER NOT NULL,
  review_status VARCHAR(40) NOT NULL,
  decision_by VARCHAR(80) NOT NULL,
  assigned_analyst VARCHAR(100),
  payment_blocked BOOLEAN NOT NULL,
  lock_owner VARCHAR(100), lock_expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_tx_tenant_channel_time ON transactions(tenant_id, channel, occurred_at DESC);
CREATE INDEX idx_tx_tenant_status ON transactions(tenant_id, review_status);

CREATE TABLE rules (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(80) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description VARCHAR(1000) NOT NULL,
  channel VARCHAR(30) NOT NULL,
  field_name VARCHAR(80) NOT NULL,
  operator VARCHAR(20) NOT NULL,
  expected_value VARCHAR(255) NOT NULL,
  score_contribution INTEGER NOT NULL,
  active BOOLEAN NOT NULL,
  version INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_rule_tenant_channel ON rules(tenant_id, channel, active);

CREATE TABLE rule_hits (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(80) NOT NULL,
  transaction_id VARCHAR(36) NOT NULL,
  rule_id VARCHAR(36) NOT NULL,
  rule_name VARCHAR(200) NOT NULL,
  score_contribution INTEGER NOT NULL,
  matched_at TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT fk_hit_tx FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  CONSTRAINT fk_hit_rule FOREIGN KEY(rule_id) REFERENCES rules(id)
);

CREATE TABLE transaction_comments (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(80) NOT NULL,
  transaction_id VARCHAR(36) NOT NULL,
  author VARCHAR(100) NOT NULL,
  content VARCHAR(2000) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT fk_comment_tx FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

CREATE TABLE audit_events (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(80) NOT NULL,
  transaction_id VARCHAR(36) NOT NULL,
  actor VARCHAR(100) NOT NULL,
  action VARCHAR(80) NOT NULL,
  detail VARCHAR(1000) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT fk_audit_tx FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

