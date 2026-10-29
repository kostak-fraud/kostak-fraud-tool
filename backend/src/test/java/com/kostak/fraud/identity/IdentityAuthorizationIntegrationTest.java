package com.kostak.fraud.identity;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "app.mode=api",
        "app.environment=test",
        "app.release-sha=iam-integration-test",
        "spring.flyway.enabled=false",
        "app.auth.jwks-url=https://example.invalid/auth/v1/.well-known/jwks.json",
        "app.auth.issuer=https://test.supabase.co/auth/v1",
        "app.auth.audience=authenticated"
})
@AutoConfigureMockMvc
@Testcontainers
class IdentityAuthorizationIntegrationTest {

    private static final UUID TENANT_A = UUID.fromString("a1111111-1111-4111-8111-111111111111");
    private static final UUID TENANT_B = UUID.fromString("b2222222-2222-4222-8222-222222222222");
    private static final UUID VIEWER_ID = UUID.fromString("c3333333-3333-4333-8333-333333333333");
    private static final UUID ANALYST_ID = UUID.fromString("d4444444-4444-4444-8444-444444444444");
    private static final UUID RULE_AUTHOR_ID = UUID.fromString("e5555555-5555-4555-8555-555555555555");
    private static final UUID ADMIN_A_ID = UUID.fromString("f6666666-6666-4666-8666-666666666666");
    private static final UUID ADMIN_B_ID = UUID.fromString("a7777777-7777-4777-8777-777777777777");
    private static final UUID VIEWER_MEMBERSHIP = UUID.fromString("c1111111-1111-4111-8111-111111111111");
    private static final UUID ANALYST_MEMBERSHIP = UUID.fromString("d1111111-1111-4111-8111-111111111111");
    private static final UUID RULE_AUTHOR_MEMBERSHIP = UUID.fromString("e1111111-1111-4111-8111-111111111111");
    private static final UUID ADMIN_A_MEMBERSHIP = UUID.fromString("f1111111-1111-4111-8111-111111111111");
    private static final UUID ADMIN_B_MEMBERSHIP = UUID.fromString("a2222222-2222-4222-8222-222222222222");

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
    void seedTenantMemberships() {
        jdbcTemplate.update("TRUNCATE TABLE tenant_membership_roles, tenant_memberships, tenants CASCADE");
        jdbcTemplate.update("INSERT INTO tenants (id, slug, name) VALUES (?, ?, ?)", TENANT_A, "tenant-a", "Tenant A");
        jdbcTemplate.update("INSERT INTO tenants (id, slug, name) VALUES (?, ?, ?)", TENANT_B, "tenant-b", "Tenant B");
        addMembership(VIEWER_MEMBERSHIP, TENANT_A, VIEWER_ID, "viewer");
        addMembership(ANALYST_MEMBERSHIP, TENANT_A, ANALYST_ID, "analyst");
        addMembership(RULE_AUTHOR_MEMBERSHIP, TENANT_A, RULE_AUTHOR_ID, "rule_author");
        addMembership(ADMIN_A_MEMBERSHIP, TENANT_A, ADMIN_A_ID, "tenant_admin");
        addMembership(ADMIN_B_MEMBERSHIP, TENANT_B, ADMIN_B_ID, "tenant_admin");
    }

    @Test
    void rejectsAnonymousIdentityRequests() throws Exception {
        mockMvc.perform(get("/api/v1/identity/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void resolvesTenantMembershipAndPermissionsFromDatabase() throws Exception {
        mockMvc.perform(get("/api/v1/identity/me")
                        .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> jwt.subject(VIEWER_ID.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(VIEWER_ID.toString()))
                .andExpect(jsonPath("$.tenantId").value(TENANT_A.toString()))
                .andExpect(jsonPath("$.roles[0]").value("viewer"))
                .andExpect(jsonPath("$.permissions").isArray());
    }

    @Test
    void appliesRolePermissionMatrixAndDeniesViewerTenantAdministration() throws Exception {
        mockMvc.perform(get("/api/v1/identity/me")
                        .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> jwt.subject(ANALYST_ID.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.permissions").value(org.hamcrest.Matchers.hasItem("investigations.decide")))
                .andExpect(jsonPath("$.permissions").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem("rules.write"))));

        mockMvc.perform(get("/api/v1/identity/me")
                        .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> jwt.subject(RULE_AUTHOR_ID.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.permissions").value(org.hamcrest.Matchers.hasItem("rules.write")))
                .andExpect(jsonPath("$.permissions").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem("investigations.decide"))));

        mockMvc.perform(get("/api/v1/identity/memberships")
                        .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> jwt.subject(VIEWER_ID.toString()))))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/identity/memberships")
                        .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> jwt.subject(ADMIN_A_ID.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].tenantId").value(TENANT_A.toString()));
    }

    @Test
    void tenantAdminCannotReadAnotherTenantsMembershipById() throws Exception {
        mockMvc.perform(get("/api/v1/identity/memberships/{membershipId}", ADMIN_B_MEMBERSHIP)
                        .with(SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt -> jwt.subject(ADMIN_A_ID.toString()))))
                .andExpect(status().isNotFound());
    }

    private void addMembership(UUID membershipId, UUID tenantId, UUID userId, String role) {
        jdbcTemplate.update(
                "INSERT INTO tenant_memberships (id, tenant_id, user_id, status) VALUES (?, ?, ?, 'active')",
                membershipId, tenantId, userId
        );
        jdbcTemplate.update(
                "INSERT INTO tenant_membership_roles (membership_id, role_key) VALUES (?, ?)",
                membershipId, role
        );
    }
}
