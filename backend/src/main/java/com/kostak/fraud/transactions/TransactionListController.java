package com.kostak.fraud.transactions;

import com.kostak.fraud.identity.IdentityContextService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/transactions")
public class TransactionListController {

    private final IdentityContextService identityContextService;
    private final TransactionListService transactionListService;

    public TransactionListController(
            IdentityContextService identityContextService,
            TransactionListService transactionListService
    ) {
        this.identityContextService = identityContextService;
        this.transactionListService = transactionListService;
    }

    @GetMapping
    @PreAuthorize("@identityAuthorization.hasPermission(authentication, 'transactions.read')")
    public TransactionPageResponse list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam String channel,
            @RequestParam(defaultValue = "0") long page,
            @RequestParam(defaultValue = "50") int pageSize
    ) {
        try {
            TransactionChannel parsedChannel = TransactionChannel.fromApiValue(channel);
            return transactionListService.list(
                    identityContextService.current(jwt).tenantId(),
                    parsedChannel,
                    page,
                    pageSize
            );
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage());
        }
    }
}
