package com.kostak.fraud.identity;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/identity")
public class IdentityController {

    private final IdentityContextService identityContextService;

    IdentityController(IdentityContextService identityContextService) {
        this.identityContextService = identityContextService;
    }

    @GetMapping("/me")
    public IdentityContext currentIdentity(@AuthenticationPrincipal Jwt jwt) {
        return identityContextService.current(jwt);
    }

    @GetMapping("/memberships")
    @PreAuthorize("@identityAuthorization.hasPermission(authentication, 'users.manage')")
    public List<TenantMembershipRepository.MembershipSummary> tenantMemberships(
            @AuthenticationPrincipal Jwt jwt
    ) {
        return identityContextService.listTenantMemberships(jwt);
    }

    @GetMapping("/memberships/{membershipId}")
    @PreAuthorize("@identityAuthorization.hasPermission(authentication, 'users.manage')")
    public TenantMembershipRepository.MembershipSummary tenantMembership(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID membershipId
    ) {
        TenantMembershipRepository.MembershipSummary membership =
                identityContextService.findTenantMembership(jwt, membershipId);
        if (membership == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        return membership;
    }
}
