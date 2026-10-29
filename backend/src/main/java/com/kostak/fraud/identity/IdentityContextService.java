package com.kostak.fraud.identity;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class IdentityContextService {

    private final TenantMembershipRepository membershipRepository;

    IdentityContextService(TenantMembershipRepository membershipRepository) {
        this.membershipRepository = membershipRepository;
    }

    public IdentityContext current(Jwt jwt) {
        UUID userId = parseUserId(jwt.getSubject());
        List<TenantMembershipRepository.MembershipRow> memberships =
                membershipRepository.findActiveMemberships(userId);

        if (memberships.size() != 1) {
            throw new AccessDeniedException("A unique active tenant membership is required");
        }

        TenantMembershipRepository.MembershipRow membership = memberships.getFirst();
        return new IdentityContext(
                membership.userId(),
                membership.membershipId(),
                membership.tenantId(),
                membership.tenantName(),
                membershipRepository.findRoles(membership.membershipId()),
                membershipRepository.findPermissions(membership.membershipId())
        );
    }

    public List<TenantMembershipRepository.MembershipSummary> listTenantMemberships(Jwt jwt) {
        IdentityContext identity = current(jwt);
        return membershipRepository.findByTenant(identity.tenantId());
    }

    public TenantMembershipRepository.MembershipSummary findTenantMembership(Jwt jwt, UUID membershipId) {
        IdentityContext identity = current(jwt);
        return membershipRepository.findByTenantAndId(identity.tenantId(), membershipId)
                .orElse(null);
    }

    private UUID parseUserId(String subject) {
        try {
            return UUID.fromString(subject);
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw new AccessDeniedException("Authenticated subject is not a valid Supabase user ID");
        }
    }
}
