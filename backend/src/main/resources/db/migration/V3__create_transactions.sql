CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    channel TEXT NOT NULL CHECK (channel IN ('wallet', 'pos', 'physical_pos')),
    source_reference TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    amount NUMERIC(18, 2) NOT NULL CHECK (amount >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'TRY' CHECK (currency ~ '^[A-Z]{3}$'),
    customer_ref TEXT NOT NULL,
    card_ref TEXT,
    merchant_ref TEXT,
    merchant_risk TEXT CHECK (merchant_risk IN ('low', 'medium', 'high')),
    transaction_type TEXT NOT NULL CHECK (
        transaction_type IN ('transfer', 'payment', 'top_up', 'withdrawal', 'purchase', 'refund')
    ),
    review_status TEXT NOT NULL DEFAULT 'not_fraud' CHECK (
        review_status IN ('fraud', 'not_fraud', 'on_hold', 'in_review', 'waiting_for_review')
    ),
    decision_source TEXT NOT NULL DEFAULT 'system' CHECK (decision_source IN ('system', 'analyst')),
    risk_score SMALLINT NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
    raw_score INTEGER NOT NULL DEFAULT 0 CHECK (raw_score >= 0),
    payment_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    assigned_user_id UUID,
    assignment_source TEXT NOT NULL DEFAULT 'system' CHECK (assignment_source IN ('system', 'analyst')),
    assigned_at TIMESTAMPTZ,
    sender_account_ref TEXT,
    receiver_account_ref TEXT,
    transfer_direction TEXT CHECK (transfer_direction IN ('in', 'out')),
    is_3ds BOOLEAN,
    terminal_ref TEXT,
    extra_data JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(extra_data) = 'object'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT transactions_source_reference_mock_ck
        CHECK (source_reference ~ '^MOCK-[A-Z0-9][A-Z0-9-]{2,95}$'),
    CONSTRAINT transactions_idempotency_key_mock_ck
        CHECK (idempotency_key ~ '^MOCK-[A-Z0-9][A-Z0-9-]{2,95}$'),
    CONSTRAINT transactions_customer_ref_mock_ck
        CHECK (customer_ref ~ '^MOCK-[A-Z0-9][A-Z0-9-]{2,95}$'),
    CONSTRAINT transactions_card_ref_mock_ck
        CHECK (card_ref IS NULL OR card_ref ~ '^MOCK-[A-Z0-9][A-Z0-9-]{2,95}$'),
    CONSTRAINT transactions_merchant_ref_mock_ck
        CHECK (merchant_ref IS NULL OR merchant_ref ~ '^MOCK-[A-Z0-9][A-Z0-9-]{2,95}$'),
    CONSTRAINT transactions_sender_account_ref_mock_ck
        CHECK (sender_account_ref IS NULL OR sender_account_ref ~ '^MOCK-[A-Z0-9][A-Z0-9-]{2,95}$'),
    CONSTRAINT transactions_receiver_account_ref_mock_ck
        CHECK (receiver_account_ref IS NULL OR receiver_account_ref ~ '^MOCK-[A-Z0-9][A-Z0-9-]{2,95}$'),
    CONSTRAINT transactions_terminal_ref_mock_ck
        CHECK (terminal_ref IS NULL OR terminal_ref ~ '^MOCK-[A-Z0-9][A-Z0-9-]{2,95}$'),
    CONSTRAINT transactions_tenant_channel_source_ref_uq
        UNIQUE (tenant_id, channel, source_reference),
    CONSTRAINT transactions_tenant_channel_idempotency_uq
        UNIQUE (tenant_id, channel, idempotency_key),
    CONSTRAINT transactions_assignment_consistency_ck
        CHECK (
            (assignment_source = 'system' AND assigned_user_id IS NULL AND assigned_at IS NULL)
            OR
            (assignment_source = 'analyst' AND assigned_user_id IS NOT NULL AND assigned_at IS NOT NULL)
        ),
    CONSTRAINT transactions_channel_fields_ck
        CHECK (
            (
                channel = 'wallet'
                AND transfer_direction IS NOT NULL
                AND is_3ds IS NULL
                AND terminal_ref IS NULL
                AND (
                    (transfer_direction = 'in' AND receiver_account_ref IS NOT NULL)
                    OR
                    (transfer_direction = 'out' AND sender_account_ref IS NOT NULL)
                )
            )
            OR
            (
                channel = 'pos'
                AND transfer_direction IS NULL
                AND sender_account_ref IS NULL
                AND receiver_account_ref IS NULL
                AND terminal_ref IS NULL
                AND card_ref IS NOT NULL
                AND merchant_ref IS NOT NULL
            )
            OR
            (
                channel = 'physical_pos'
                AND transfer_direction IS NULL
                AND sender_account_ref IS NULL
                AND receiver_account_ref IS NULL
                AND is_3ds IS NULL
                AND terminal_ref IS NOT NULL
                AND card_ref IS NOT NULL
                AND merchant_ref IS NOT NULL
            )
        )
);

CREATE INDEX transactions_tenant_channel_occurred_id_idx
    ON transactions (tenant_id, channel, occurred_at DESC, id DESC);

CREATE INDEX transactions_tenant_channel_received_id_idx
    ON transactions (tenant_id, channel, received_at DESC, id DESC);

CREATE INDEX transactions_tenant_channel_card_received_idx
    ON transactions (tenant_id, channel, card_ref, received_at DESC, id DESC)
    WHERE card_ref IS NOT NULL;

CREATE INDEX transactions_tenant_channel_receiver_received_idx
    ON transactions (tenant_id, channel, receiver_account_ref, received_at DESC, id DESC)
    WHERE receiver_account_ref IS NOT NULL;

CREATE INDEX transactions_tenant_channel_sender_received_idx
    ON transactions (tenant_id, channel, sender_account_ref, received_at DESC, id DESC)
    WHERE sender_account_ref IS NOT NULL;

CREATE INDEX transactions_tenant_channel_merchant_received_idx
    ON transactions (tenant_id, channel, merchant_ref, received_at DESC, id DESC)
    WHERE merchant_ref IS NOT NULL;

CREATE INDEX transactions_tenant_channel_status_occurred_idx
    ON transactions (tenant_id, channel, review_status, occurred_at DESC, id DESC);
