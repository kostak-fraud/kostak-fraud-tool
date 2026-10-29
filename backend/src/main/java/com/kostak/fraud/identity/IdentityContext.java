package com.kostak.fraud.identity;

import java.util.List;
import java.util.UUID;

public record IdentityContext(
        UUID userId,
        UUID membershipId,
        UUID tenantId,
        String tenantName,
        List<String> roles,
        List<String> permissions
) {
    public IdentityContext {
        roles = List.copyOf(roles);
        permissions = List.copyOf(permissions);
    }
}
