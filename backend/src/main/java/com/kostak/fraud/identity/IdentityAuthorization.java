package com.kostak.fraud.identity;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

@Component("identityAuthorization")
public class IdentityAuthorization {

    private final IdentityContextService identityContextService;

    IdentityAuthorization(IdentityContextService identityContextService) {
        this.identityContextService = identityContextService;
    }

    public boolean hasPermission(Authentication authentication, String permission) {
        if (!(authentication instanceof JwtAuthenticationToken jwtAuthentication)) {
            return false;
        }
        try {
            return identityContextService.current(jwtAuthentication.getToken())
                    .permissions()
                    .contains(permission);
        } catch (AccessDeniedException exception) {
            return false;
        }
    }
}
