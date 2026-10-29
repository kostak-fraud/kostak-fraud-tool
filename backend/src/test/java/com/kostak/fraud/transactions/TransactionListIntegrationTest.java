package com.kostak.fraud.transactions;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "app.mode=api",
        "app.environment=test",
        "app.release-sha=transaction-list-integration-test",
        "spring.flyway.enabled=false",
        "app.auth.jwks-url=https://example.invalid/auth/v1/.well-known/jwks.json",
        "app.auth.issuer=https://test.supabase.co/auth/v1",
        "app.auth.audience=authenticated"
})
@AutoConfigureMockMvc
@Testcontainers
class TransactionListIntegrationTest {

    private static final UUID TENANT_A = UUID.fromString("a1111111-1111-4111-8111-111111111111");
    private static final UUID TENANT_B = UUID.fromString("b2222222-2222-4222-8222-222222222222");
    private static final UUID READER_ID = UUID.fromString("c3333333-3333-4333-8333-333333333333");
    private static final UUID NO_PERMISSION_ID = UUID.fromString("d4444444-4444-4444-8444-444444444444");
    private static final UUID READER_MEMBERSHIP = UUID.fromString("c1111111-1111-4111-8111-111111111111");
    private static final UUID NO_PERMISSION_MEMBERSHIP = UUID.fromString("d1111111-1111-4111-8111-111111111111");
    private static final Instant BASE_TIME = Instant.parse("2026-10-29T10:00:00Z");

    @Container
    @ServiceConnection
    static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.3-alpine3.23");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeAll
    static void migrateSchema() {
        Flyway.configure()
                .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .schemas("public")
                .defaultSchema("public")
                .load()
                .migrate();
    }

    @BeforeEach
    void seedIdentity() {
        jdbcTemplate.update("""
                TRUNCATE TABLE transactions, simulation_controls, tenant_membership_roles,
                               tenant_memberships, tenants CASCADE
                """);
        jdbcTemplate.update("INSERT INTO tenants (id, slug, name) VALUES (?, 'tenant-a', 'Tenant A')", TENANT_A);
        jdbcTemplate.update("INSERT INTO tenants (id, slug, name) VALUES (?, 'tenant-b', 'Tenant B')", TENANT_B);
        addMembership(READER_MEMBERSHIP, TENANT_A, READER_ID, "viewer");
        addMembership(NO_PERMISSION_MEMBERSHIP, TENANT_A, NO_PERMISSION_ID, null);
    }

    @Test
    void rejectsMissingBlankUnknownChannelAndInvalidPagination() throws Exception {
        mockMvc.perform(get("/api/v1/transactions").with(readerJwt()))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/transactions").param("channel", " ").with(readerJwt()))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/transactions").param("channel", "unknown").with(readerJwt()))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/transactions")
                        .param("channel", "wallet").param("page", "-1").with(readerJwt()))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/transactions")
                        .param("channel", "wallet").param("page", "not-a-number").with(readerJwt()))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/transactions")
                        .param("channel", "wallet").param("pageSize", "0").with(readerJwt()))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/transactions")
                        .param("channel", "wallet").param("pageSize", "not-a-number").with(readerJwt()))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/transactions")
                        .param("channel", "wallet").param("pageSize", "101").param("size", "1").with(readerJwt()))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/v1/transactions")
                        .param("channel", "wallet")
                        .param("page", Long.toString(Long.MAX_VALUE))
                        .param("pageSize", "100")
                        .with(readerJwt()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void requiresAuthenticationAndTransactionsReadPermission() throws Exception {
        mockMvc.perform(get("/api/v1/transactions").param("channel", "wallet"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/transactions")
                        .param("channel", "wallet")
                        .with(jwt().jwt(token -> token.subject(NO_PERMISSION_ID.toString()))))
                .andExpect(status().isForbidden());
    }

    @Test
    void scopesRowsAndCountsToAuthenticatedTenantAndRequestedChannel() throws Exception {
        UUID tenantAFirst = UUID.fromString("00000000-0000-4000-8000-000000000101");
        UUID tenantASecond = UUID.fromString("00000000-0000-4000-8000-000000000102");
        UUID tenantBWallet = UUID.fromString("00000000-0000-4000-8000-000000000201");
        UUID tenantAPos = UUID.fromString("00000000-0000-4000-8000-000000000301");
        addWallet(tenantAFirst, TENANT_A, "processed", BASE_TIME.plusSeconds(1));
        addWallet(tenantASecond, TENANT_A, "processed", BASE_TIME.plusSeconds(2));
        addWallet(tenantBWallet, TENANT_B, "processed", BASE_TIME.plusSeconds(3));
        addPos(tenantAPos, TENANT_A, "processed", BASE_TIME.plusSeconds(4));

        mockMvc.perform(get("/api/v1/transactions")
                        .param("channel", "wallet")
                        .param("tenantId", TENANT_B.toString())
                        .param("pageSize", "1")
                        .with(readerJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].id", contains(tenantASecond.toString())))
                .andExpect(jsonPath("$.items[*].id", everyItem(not(is(tenantBWallet.toString())))))
                .andExpect(jsonPath("$.items[*].channel", everyItem(is("wallet"))))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.pageSize").value(1))
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.totalPages").value(2));

        mockMvc.perform(get("/api/v1/transactions")
                        .param("channel", "wallet")
                        .param("tenantId", TENANT_B.toString())
                        .param("page", "1")
                        .param("pageSize", "1")
                        .with(readerJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].id", contains(tenantAFirst.toString())))
                .andExpect(jsonPath("$.items[*].id", everyItem(not(is(tenantBWallet.toString())))))
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.totalPages").value(2));
    }

    @Test
    void returnsOnlyProcessedTransactionsAndKeepsCountConsistent() throws Exception {
        UUID processed = UUID.fromString("00000000-0000-4000-8000-000000000401");
        addWallet(processed, TENANT_A, "processed", BASE_TIME.plusSeconds(4));
        addWallet(UUID.fromString("00000000-0000-4000-8000-000000000402"), TENANT_A,
                "pending", BASE_TIME.plusSeconds(3));
        addWallet(UUID.fromString("00000000-0000-4000-8000-000000000403"), TENANT_A,
                "processing", BASE_TIME.plusSeconds(2));
        addWallet(UUID.fromString("00000000-0000-4000-8000-000000000404"), TENANT_A,
                "failed", BASE_TIME.plusSeconds(1));

        mockMvc.perform(get("/api/v1/transactions")
                        .param("channel", "wallet")
                        .with(readerJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].id", contains(processed.toString())))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.items[0].evaluationState").doesNotExist())
                .andExpect(jsonPath("$.items[0].tenantId").doesNotExist())
                .andExpect(jsonPath("$.items[0].sourceReference").doesNotExist())
                .andExpect(jsonPath("$.items[0].idempotencyKey").doesNotExist());
    }

    @Test
    void ordersByOccurredAtThenIdAndPaginatesWithoutDuplicatesOrGaps() throws Exception {
        UUID oldest = UUID.fromString("00000000-0000-4000-8000-000000000501");
        UUID middleLow = UUID.fromString("00000000-0000-4000-8000-000000000502");
        UUID middleHigh = UUID.fromString("00000000-0000-4000-8000-000000000503");
        UUID newestLow = UUID.fromString("00000000-0000-4000-8000-000000000504");
        UUID newestHigh = UUID.fromString("00000000-0000-4000-8000-000000000505");
        addWallet(oldest, TENANT_A, "processed", BASE_TIME);
        addWallet(middleLow, TENANT_A, "processed", BASE_TIME.plusSeconds(1));
        addWallet(middleHigh, TENANT_A, "processed", BASE_TIME.plusSeconds(1));
        addWallet(newestLow, TENANT_A, "processed", BASE_TIME.plusSeconds(2));
        addWallet(newestHigh, TENANT_A, "processed", BASE_TIME.plusSeconds(2));

        mockMvc.perform(pageRequest(0, 2))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].id", contains(newestHigh.toString(), newestLow.toString())))
                .andExpect(jsonPath("$.totalElements").value(5))
                .andExpect(jsonPath("$.totalPages").value(3));
        mockMvc.perform(pageRequest(1, 2))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].id", contains(middleHigh.toString(), middleLow.toString())));
        mockMvc.perform(pageRequest(2, 2))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].id", contains(oldest.toString())))
                .andExpect(jsonPath("$.totalPages").value(3));
        mockMvc.perform(pageRequest(3, 2))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", empty()))
                .andExpect(jsonPath("$.totalElements").value(5))
                .andExpect(jsonPath("$.totalPages").value(3));
    }

    @Test
    void supportsEveryChannelAndReturnsAValidEmptyPage() throws Exception {
        UUID wallet = UUID.fromString("00000000-0000-4000-8000-000000000601");
        UUID pos = UUID.fromString("00000000-0000-4000-8000-000000000602");
        UUID physicalPos = UUID.fromString("00000000-0000-4000-8000-000000000603");
        addWallet(wallet, TENANT_A, "processed", BASE_TIME);
        addPos(pos, TENANT_A, "processed", BASE_TIME);
        addPhysicalPos(physicalPos, TENANT_A, "processed", BASE_TIME);

        assertChannelContains("wallet", wallet);
        assertChannelContains("pos", pos);
        assertChannelContains("physical_pos", physicalPos);

        mockMvc.perform(get("/api/v1/transactions")
                        .param("channel", "wallet")
                        .param("page", "1")
                        .with(readerJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", empty()))
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.pageSize").value(50))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.totalPages").value(1));
    }

    @Test
    void representativePageAndCountPlansUseNaturalPostgresPlanner() {
        insertPlanRows(TENANT_A, "A", 40_000);
        insertPlanRows(TENANT_B, "B", 10_000);
        jdbcTemplate.execute("ANALYZE transactions");

        List<String> pagePlan = explain("""
                EXPLAIN (ANALYZE, BUFFERS)
                SELECT id
                FROM transactions
                WHERE tenant_id = ?
                  AND channel = 'wallet'
                  AND evaluation_state = 'processed'
                ORDER BY occurred_at DESC, id DESC
                LIMIT 50 OFFSET 0
                """, TENANT_A);
        List<String> countPlan = explain("""
                EXPLAIN (ANALYZE, BUFFERS)
                SELECT COUNT(*)
                FROM transactions
                WHERE tenant_id = ?
                  AND channel = 'wallet'
                  AND evaluation_state = 'processed'
                """, TENANT_A);

        String pagePlanText = String.join(System.lineSeparator(), pagePlan);
        String countPlanText = String.join(System.lineSeparator(), countPlan);
        System.out.println("TX003_PAGE_PLAN" + System.lineSeparator() + pagePlanText);
        System.out.println("TX003_COUNT_PLAN" + System.lineSeparator() + countPlanText);

        org.assertj.core.api.Assertions.assertThat(pagePlanText)
                .contains("transactions_tenant_channel_occurred_id_idx")
                .contains("tenant_id")
                .contains("channel")
                .contains("evaluation_state")
                .contains("actual time");
        org.assertj.core.api.Assertions.assertThat(countPlanText)
                .contains("tenant_id")
                .contains("channel")
                .contains("evaluation_state")
                .contains("actual time");
    }

    private void assertChannelContains(String channel, UUID expectedId) throws Exception {
        mockMvc.perform(get("/api/v1/transactions").param("channel", channel).with(readerJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].id", contains(expectedId.toString())))
                .andExpect(jsonPath("$.items[0].channel").value(channel));
    }

    private void insertPlanRows(UUID tenantId, String tenantSuffix, int rowCount) {
        jdbcTemplate.update("""
                INSERT INTO transactions (
                    tenant_id, channel, source_reference, idempotency_key, occurred_at, received_at,
                    amount, currency, customer_ref, transaction_type, receiver_account_ref,
                    transfer_direction, evaluation_state
                )
                SELECT ?,
                       'wallet',
                       'MOCK-PLAN-SRC-' || ? || '-' || series,
                       'MOCK-PLAN-IDEM-' || ? || '-' || series,
                       TIMESTAMPTZ '2026-10-29 10:00:00+00' - (series * INTERVAL '1 second'),
                       TIMESTAMPTZ '2026-10-29 10:00:01+00' - (series * INTERVAL '1 second'),
                       10.00,
                       'TRY',
                       'MOCK-PLAN-CUST-' || ? || '-' || series,
                       'transfer',
                       'MOCK-PLAN-ACCT-' || ? || '-' || series,
                       'in',
                       CASE WHEN series % 10 = 0 THEN 'processed' ELSE 'pending' END
                FROM generate_series(1, ?) AS series
                """, tenantId, tenantSuffix, tenantSuffix, tenantSuffix, tenantSuffix, rowCount);
    }

    private List<String> explain(String sql, UUID tenantId) {
        return jdbcTemplate.query(sql, (resultSet, rowNumber) -> resultSet.getString(1), tenantId);
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder pageRequest(
            long page,
            int pageSize
    ) {
        return get("/api/v1/transactions")
                .param("channel", "wallet")
                .param("page", Long.toString(page))
                .param("pageSize", Integer.toString(pageSize))
                .with(readerJwt());
    }

    private SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor readerJwt() {
        return jwt().jwt(token -> token.subject(READER_ID.toString()));
    }

    private void addMembership(UUID membershipId, UUID tenantId, UUID userId, String role) {
        jdbcTemplate.update(
                "INSERT INTO tenant_memberships (id, tenant_id, user_id, status) VALUES (?, ?, ?, 'active')",
                membershipId, tenantId, userId
        );
        if (role != null) {
            jdbcTemplate.update(
                    "INSERT INTO tenant_membership_roles (membership_id, role_key) VALUES (?, ?)",
                    membershipId, role
            );
        }
    }

    private void addWallet(UUID id, UUID tenantId, String evaluationState, Instant occurredAt) {
        String suffix = id.toString().toUpperCase();
        jdbcTemplate.update("""
                INSERT INTO transactions (
                    id, tenant_id, channel, source_reference, idempotency_key, occurred_at, received_at,
                    amount, currency, customer_ref, transaction_type, review_status, risk_score,
                    payment_blocked, receiver_account_ref, transfer_direction, evaluation_state
                ) VALUES (?, ?, 'wallet', ?, ?, ?, ?, ?, 'TRY', ?, 'transfer', 'not_fraud', 0,
                          FALSE, ?, 'in', ?)
                """,
                id, tenantId, "MOCK-SRC-" + suffix, "MOCK-IDEM-" + suffix,
                occurredAt, occurredAt.plusSeconds(1), new BigDecimal("42.50"),
                "MOCK-CUST-" + suffix, "MOCK-ACCT-" + suffix, evaluationState
        );
    }

    private void addPos(UUID id, UUID tenantId, String evaluationState, Instant occurredAt) {
        String suffix = id.toString().toUpperCase();
        jdbcTemplate.update("""
                INSERT INTO transactions (
                    id, tenant_id, channel, source_reference, idempotency_key, occurred_at, received_at,
                    amount, currency, customer_ref, card_ref, merchant_ref, transaction_type, is_3ds,
                    evaluation_state
                ) VALUES (?, ?, 'pos', ?, ?, ?, ?, 15.25, 'TRY', ?, ?, ?, 'payment', TRUE, ?)
                """,
                id, tenantId, "MOCK-SRC-" + suffix, "MOCK-IDEM-" + suffix,
                occurredAt, occurredAt.plusSeconds(1), "MOCK-CUST-" + suffix,
                "MOCK-CARD-" + suffix, "MOCK-MERCH-" + suffix, evaluationState
        );
    }

    private void addPhysicalPos(UUID id, UUID tenantId, String evaluationState, Instant occurredAt) {
        String suffix = id.toString().toUpperCase();
        jdbcTemplate.update("""
                INSERT INTO transactions (
                    id, tenant_id, channel, source_reference, idempotency_key, occurred_at, received_at,
                    amount, currency, customer_ref, card_ref, merchant_ref, transaction_type, terminal_ref,
                    evaluation_state
                ) VALUES (?, ?, 'physical_pos', ?, ?, ?, ?, 18.75, 'TRY', ?, ?, ?, 'purchase', ?, ?)
                """,
                id, tenantId, "MOCK-SRC-" + suffix, "MOCK-IDEM-" + suffix,
                occurredAt, occurredAt.plusSeconds(1), "MOCK-CUST-" + suffix,
                "MOCK-CARD-" + suffix, "MOCK-MERCH-" + suffix, "MOCK-TERM-" + suffix,
                evaluationState
        );
    }
}
