package com.kostak.fraud.simulation;

import com.kostak.fraud.identity.IdentityContextService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/simulation/control")
public class SimulationControlController {

    private final IdentityContextService identityContextService;
    private final SimulationControlService controlService;

    public SimulationControlController(
            IdentityContextService identityContextService,
            SimulationControlService controlService
    ) {
        this.identityContextService = identityContextService;
        this.controlService = controlService;
    }

    @GetMapping
    @PreAuthorize("@identityAuthorization.hasPermission(authentication, 'simulation.manage')")
    public SimulationControlResponse get(@AuthenticationPrincipal Jwt jwt) {
        return controlService.get(identityContextService.current(jwt).tenantId());
    }

    @PutMapping
    @PreAuthorize("@identityAuthorization.hasPermission(authentication, 'simulation.manage')")
    public SimulationControlResponse update(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody SimulationControlRequest request
    ) {
        try {
            return controlService.update(identityContextService.current(jwt).tenantId(), request);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage());
        } catch (SimulationGloballyDisabledException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, exception.getMessage());
        }
    }
}
