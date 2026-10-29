package com.kostak.fraud.transactions;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers
class TransactionSchemaIntegrationTest {

    private static final UUID TENANT_ID = UUID.fromString("a1111111-1111-4111-8111-111111111111");
    private static final Instant OCCURRED_AT = Instant.parse("2026-10-29T00:00:00Z");

    @Container
    static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.3-alpine3.23");

    @BeforeAll
    static void migrateSchema() {
        Flyway.configure()
                .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .schemas("public")
                .defaultSchema("public")
                .locations("classpath:db/migration")
                .cleanDisabled(true)
                .load()
                .migrate();
    }

    @BeforeEach
    void resetFixtures() throws SQLException {
        try (Connection connection = connection(); Statement statement = connection.createStatement()) {
            statement.execute("TRUNCATE TABLE transactions, tenants CASCADE");
            try (PreparedStatement tenant = connection.prepareStatement(
                    "INSERT INTO tenants (id, slug, name) VALUES (?, ?, ?)")) {
                tenant.setObject(1, TENANT_ID);
                tenant.setString(2, "tx-schema-test");
                tenant.setString(3, "Transaction Schema Test");
                tenant.executeUpdate();
            }
        }
    }

    @Test
    void storesExactDecimalAndAllowsDocumentedNullableWalletFields() throws SQLException {
        UUID id = UUID.fromString("00000000-0000-4000-8000-000000000001");
        BigDecimal amount = new BigDecimal("1234567890123456.78");

        try (Connection connection = connection()) {
            insertWallet(connection, id, "MOCK-REF-001", "MOCK-IDEMP-001", amount, "TRY", "MOCK-CUST-001",
                    "MOCK-ACCT-001", OCCURRED_AT);

            try (PreparedStatement query = connection.prepareStatement("""
                    SELECT amount, currency, card_ref, merchant_ref, review_status, risk_score,
                           assignment_source, assigned_user_id, payment_blocked
                    FROM transactions WHERE id = ?
                    """)) {
                query.setObject(1, id);
                try (ResultSet result = query.executeQuery()) {
                    assertThat(result.next()).isTrue();
                    assertThat(result.getBigDecimal("amount")).isEqualByComparingTo(amount);
                    assertThat(result.getString("currency").trim()).isEqualTo("TRY");
                    assertThat(result.getString("card_ref")).isNull();
                    assertThat(result.getString("merchant_ref")).isNull();
                    assertThat(result.getString("review_status")).isEqualTo("not_fraud");
                    assertThat(result.getInt("risk_score")).isZero();
                    assertThat(result.getString("assignment_source")).isEqualTo("system");
                    assertThat(result.getObject("assigned_user_id")).isNull();
                    assertThat(result.getBoolean("payment_blocked")).isFalse();
                }
            }
        }
    }

    @Test
    void rejectsRealLookingReferencesNegativeAmountsAndInvalidCurrency() throws SQLException {
        try (Connection connection = connection()) {
            assertThatThrownBy(() -> insertWallet(connection, UUID.randomUUID(), "MOCK-REF-002", "MOCK-IDEMP-002",
                    new BigDecimal("-1.00"), "TRY", "MOCK-CUST-002", "MOCK-ACCT-002", OCCURRED_AT))
                    .isInstanceOf(SQLException.class);

            assertThatThrownBy(() -> insertWallet(connection, UUID.randomUUID(), "REF-REAL-123456", "MOCK-IDEMP-003",
                    new BigDecimal("10.00"), "TRY", "MOCK-CUST-003", "MOCK-ACCT-003", OCCURRED_AT))
                    .isInstanceOf(SQLException.class);

            assertThatThrownBy(() -> insertWallet(connection, UUID.randomUUID(), "MOCK-REF-004", "MOCK-IDEMP-004",
                    new BigDecimal("10.00"), "try", "MOCK-CUST-004", "MOCK-ACCT-004", OCCURRED_AT))
                    .isInstanceOf(SQLException.class);

            assertThatThrownBy(() -> insertWallet(connection, UUID.randomUUID(), "MOCK-REF-005", "MOCK-IDEMP-005",
                    new BigDecimal("12345678901234567.89"), "TRY", "MOCK-CUST-005", "MOCK-ACCT-005", OCCURRED_AT))
                    .isInstanceOf(SQLException.class);
        }
    }

    @Test
    void rejectsDuplicateIdempotencyKeysWithinTenantAndChannel() throws SQLException {
        try (Connection connection = connection()) {
            insertWallet(connection, UUID.randomUUID(), "MOCK-REF-006", "MOCK-IDEMP-DUPLICATE",
                    new BigDecimal("10.00"), "TRY", "MOCK-CUST-006", "MOCK-ACCT-006", OCCURRED_AT);

            assertThatThrownBy(() -> insertWallet(connection, UUID.randomUUID(), "MOCK-REF-007", "MOCK-IDEMP-DUPLICATE",
                    new BigDecimal("11.00"), "TRY", "MOCK-CUST-007", "MOCK-ACCT-007", OCCURRED_AT))
                    .isInstanceOf(SQLException.class);
        }
    }

    @Test
    void enforcesChannelSpecificColumnsAndUsesStableNewestFirstIndex() throws SQLException {
        try (Connection connection = connection()) {
            insertWallet(connection, UUID.fromString("00000000-0000-4000-8000-000000000001"),
                    "MOCK-REF-008", "MOCK-IDEMP-008", new BigDecimal("10.00"), "TRY", "MOCK-CUST-008",
                    "MOCK-ACCT-008", OCCURRED_AT);
            insertWallet(connection, UUID.fromString("00000000-0000-4000-8000-000000000002"),
                    "MOCK-REF-009", "MOCK-IDEMP-009", new BigDecimal("20.00"), "TRY", "MOCK-CUST-009",
                    "MOCK-ACCT-009", OCCURRED_AT);
            insertPos(connection, UUID.randomUUID(), "MOCK-REF-010", "MOCK-IDEMP-010", OCCURRED_AT);
            insertPhysicalPos(connection, UUID.randomUUID(), "MOCK-REF-011", "MOCK-IDEMP-011", OCCURRED_AT);

            try (PreparedStatement query = connection.prepareStatement("""
                    SELECT id FROM transactions
                    WHERE tenant_id = ? AND channel = 'wallet'
                    ORDER BY occurred_at DESC, id DESC
                    """)) {
                query.setObject(1, TENANT_ID);
                try (ResultSet result = query.executeQuery()) {
                    assertThat(result.next()).isTrue();
                    assertThat(result.getObject("id", UUID.class))
                            .isEqualTo(UUID.fromString("00000000-0000-4000-8000-000000000002"));
                    assertThat(result.next()).isTrue();
                    assertThat(result.getObject("id", UUID.class))
                            .isEqualTo(UUID.fromString("00000000-0000-4000-8000-000000000001"));
                    assertThat(result.next()).isFalse();
                }
            }

            assertThatThrownBy(() -> {
                try (PreparedStatement invalid = connection.prepareStatement("""
                        INSERT INTO transactions (
                            tenant_id, channel, source_reference, idempotency_key, occurred_at, amount, currency,
                            customer_ref, transaction_type, transfer_direction, is_3ds
                        ) VALUES (?, 'pos', 'MOCK-REF-012', 'MOCK-IDEMP-012', ?, 10.00, 'TRY',
                                  'MOCK-CUST-012', 'payment', 'in', TRUE)
                        """)) {
                    invalid.setObject(1, TENANT_ID);
                    invalid.setTimestamp(2, Timestamp.from(OCCURRED_AT));
                    invalid.executeUpdate();
                }
            }).isInstanceOf(SQLException.class);

            try (Statement statement = connection.createStatement()) {
                statement.execute("SET enable_seqscan = off");
            }
            List<String> plan = new ArrayList<>();
            try (PreparedStatement explain = connection.prepareStatement("""
                    EXPLAIN SELECT id FROM transactions
                    WHERE tenant_id = ? AND channel = 'wallet'
                    ORDER BY occurred_at DESC, id DESC LIMIT 50
                    """)) {
                explain.setObject(1, TENANT_ID);
                try (ResultSet result = explain.executeQuery()) {
                    while (result.next()) {
                        plan.add(result.getString(1));
                    }
                }
            }
            assertThat(plan).anyMatch(line -> line.contains("transactions_tenant_channel_occurred_id_idx"));
        }
    }

    private static void insertWallet(
            Connection connection,
            UUID id,
            String sourceReference,
            String idempotencyKey,
            BigDecimal amount,
            String currency,
            String customerRef,
            String receiverAccountRef,
            Instant occurredAt
    ) throws SQLException {
        try (PreparedStatement insert = connection.prepareStatement("""
                INSERT INTO transactions (
                    id, tenant_id, channel, source_reference, idempotency_key, occurred_at, amount, currency,
                    customer_ref, transaction_type, transfer_direction, receiver_account_ref
                ) VALUES (?, ?, 'wallet', ?, ?, ?, ?, ?, ?, 'transfer', 'in', ?)
                """)) {
            insert.setObject(1, id);
            insert.setObject(2, TENANT_ID);
            insert.setString(3, sourceReference);
            insert.setString(4, idempotencyKey);
            insert.setTimestamp(5, Timestamp.from(occurredAt));
            insert.setBigDecimal(6, amount);
            insert.setString(7, currency);
            insert.setString(8, customerRef);
            insert.setString(9, receiverAccountRef);
            insert.executeUpdate();
        }
    }

    private static void insertPos(
            Connection connection,
            UUID id,
            String sourceReference,
            String idempotencyKey,
            Instant occurredAt
    ) throws SQLException {
        try (PreparedStatement insert = connection.prepareStatement("""
                INSERT INTO transactions (
                    id, tenant_id, channel, source_reference, idempotency_key, occurred_at, amount, currency,
                    customer_ref, card_ref, merchant_ref, transaction_type, is_3ds
                ) VALUES (?, ?, 'pos', ?, ?, ?, 25.50, 'TRY', 'MOCK-CUST-POS', 'MOCK-CARD-POS',
                          'MOCK-MERCH-POS', 'payment', TRUE)
                """)) {
            insert.setObject(1, id);
            insert.setObject(2, TENANT_ID);
            insert.setString(3, sourceReference);
            insert.setString(4, idempotencyKey);
            insert.setTimestamp(5, Timestamp.from(occurredAt));
            insert.executeUpdate();
        }
    }

    private static void insertPhysicalPos(
            Connection connection,
            UUID id,
            String sourceReference,
            String idempotencyKey,
            Instant occurredAt
    ) throws SQLException {
        try (PreparedStatement insert = connection.prepareStatement("""
                INSERT INTO transactions (
                    id, tenant_id, channel, source_reference, idempotency_key, occurred_at, amount, currency,
                    customer_ref, card_ref, merchant_ref, transaction_type, terminal_ref
                ) VALUES (?, ?, 'physical_pos', ?, ?, ?, 9.99, 'TRY', 'MOCK-CUST-POS', 'MOCK-CARD-POS',
                          'MOCK-MERCH-POS', 'payment', 'MOCK-TERM-001')
                """)) {
            insert.setObject(1, id);
            insert.setObject(2, TENANT_ID);
            insert.setString(3, sourceReference);
            insert.setString(4, idempotencyKey);
            insert.setTimestamp(5, Timestamp.from(occurredAt));
            insert.executeUpdate();
        }
    }

    private static Connection connection() throws SQLException {
        return DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
    }
}
