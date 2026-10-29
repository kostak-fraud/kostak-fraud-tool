package com.kostak.fraud.identity;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class TenantMembershipRepository {

    private final JdbcTemplate jdbcTemplate;

    TenantMembershipRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    List<MembershipRow> findActiveMemberships(UUID userId) {
        return jdbcTemplate.query("""
                SELECT tm.id AS membership_id, tm.tenant_id, tm.user_id, t.name AS tenant_name
                FROM tenant_memberships tm
                JOIN tenants t ON t.id = tm.tenant_id
                WHERE tm.user_id = ? AND tm.status = 'active'
                ORDER BY tm.created_at, tm.id
                """, (rs, rowNum) -> new MembershipRow(
                uuid(rs, "membership_id"),
                uuid(rs, "tenant_id"),
                uuid(rs, "user_id"),
                rs.getString("tenant_name")
        ), userId);
    }

    List<String> findRoles(UUID membershipId) {
        return jdbcTemplate.queryForList("""
                SELECT role_key
                FROM tenant_membership_roles
                WHERE membership_id = ?
                ORDER BY role_key
                """, String.class, membershipId);
    }

    List<String> findPermissions(UUID membershipId) {
        return jdbcTemplate.queryForList("""
                SELECT DISTINCT rp.permission_key
                FROM tenant_membership_roles tmr
                JOIN role_permissions rp ON rp.role_key = tmr.role_key
                WHERE tmr.membership_id = ?
                ORDER BY rp.permission_key
                """, String.class, membershipId);
    }

    List<MembershipSummary> findByTenant(UUID tenantId) {
        List<MembershipBase> memberships = jdbcTemplate.query("""
                SELECT id, tenant_id, user_id, status
                FROM tenant_memberships
                WHERE tenant_id = ?
                ORDER BY created_at, id
                """, (rs, rowNum) -> new MembershipBase(
                uuid(rs, "id"),
                uuid(rs, "tenant_id"),
                uuid(rs, "user_id"),
                rs.getString("status")
        ), tenantId);
        return memberships.stream().map(this::toSummary).toList();
    }

    Optional<MembershipSummary> findByTenantAndId(UUID tenantId, UUID membershipId) {
        List<MembershipBase> memberships = jdbcTemplate.query("""
                SELECT id, tenant_id, user_id, status
                FROM tenant_memberships
                WHERE tenant_id = ? AND id = ?
                """, (rs, rowNum) -> new MembershipBase(
                uuid(rs, "id"),
                uuid(rs, "tenant_id"),
                uuid(rs, "user_id"),
                rs.getString("status")
        ), tenantId, membershipId);
        return memberships.stream().findFirst().map(this::toSummary);
    }

    private MembershipSummary toSummary(MembershipBase membership) {
        return new MembershipSummary(
                membership.membershipId(),
                membership.tenantId(),
                membership.userId(),
                membership.status(),
                findRoles(membership.membershipId())
        );
    }

    private static UUID uuid(ResultSet resultSet, String column) throws SQLException {
        return resultSet.getObject(column, UUID.class);
    }

    record MembershipRow(UUID membershipId, UUID tenantId, UUID userId, String tenantName) {
    }

    record MembershipSummary(UUID membershipId, UUID tenantId, UUID userId, String status, List<String> roles) {
        MembershipSummary {
            roles = List.copyOf(roles);
        }
    }

    private record MembershipBase(UUID membershipId, UUID tenantId, UUID userId, String status) {
    }
}
