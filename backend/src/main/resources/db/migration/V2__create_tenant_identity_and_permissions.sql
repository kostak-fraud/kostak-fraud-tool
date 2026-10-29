CREATE TABLE tenants (
    id UUID PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tenant_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, user_id)
);

CREATE TABLE tenant_membership_roles (
    membership_id UUID NOT NULL REFERENCES tenant_memberships(id) ON DELETE CASCADE,
    role_key TEXT NOT NULL CHECK (role_key IN ('viewer', 'analyst', 'rule_author', 'tenant_admin')),
    PRIMARY KEY (membership_id, role_key)
);

CREATE TABLE role_permissions (
    role_key TEXT NOT NULL CHECK (role_key IN ('viewer', 'analyst', 'rule_author', 'tenant_admin')),
    permission_key TEXT NOT NULL,
    PRIMARY KEY (role_key, permission_key)
);

INSERT INTO role_permissions (role_key, permission_key) VALUES
    ('viewer', 'transactions.read'),
    ('viewer', 'views.save_personal'),
    ('analyst', 'transactions.read'),
    ('analyst', 'investigations.decide'),
    ('analyst', 'investigations.comment'),
    ('analyst', 'views.save_personal'),
    ('rule_author', 'transactions.read'),
    ('rule_author', 'rules.read'),
    ('rule_author', 'rules.write'),
    ('rule_author', 'views.save_personal'),
    ('tenant_admin', 'transactions.read'),
    ('tenant_admin', 'investigations.decide'),
    ('tenant_admin', 'investigations.comment'),
    ('tenant_admin', 'rules.read'),
    ('tenant_admin', 'rules.write'),
    ('tenant_admin', 'users.manage'),
    ('tenant_admin', 'views.save_personal');

CREATE INDEX tenant_memberships_user_status_idx
    ON tenant_memberships (user_id, status);

CREATE INDEX tenant_memberships_tenant_created_idx
    ON tenant_memberships (tenant_id, created_at, id);
