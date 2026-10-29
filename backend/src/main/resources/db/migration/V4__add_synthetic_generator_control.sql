ALTER TABLE transactions
    ADD COLUMN evaluation_state TEXT NOT NULL DEFAULT 'pending'
        CHECK (evaluation_state IN ('pending', 'processing', 'processed', 'failed'));

CREATE INDEX transactions_tenant_channel_evaluation_received_idx
    ON transactions (tenant_id, channel, evaluation_state, received_at, id)
    WHERE evaluation_state IN ('pending', 'failed');

CREATE TABLE simulation_controls (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    rate_per_second SMALLINT NOT NULL DEFAULT 1 CHECK (rate_per_second BETWEEN 1 AND 10),
    seed BIGINT NOT NULL DEFAULT 42,
    next_sequence BIGINT NOT NULL DEFAULT 1 CHECK (next_sequence > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO role_permissions (role_key, permission_key)
VALUES ('tenant_admin', 'simulation.manage')
ON CONFLICT DO NOTHING;
