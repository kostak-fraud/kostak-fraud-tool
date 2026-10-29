package com.kostak.fraud.transactions;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/v1/transactions")
public class TransactionFieldController {

    private final TransactionFieldRegistry registry;

    public TransactionFieldController(TransactionFieldRegistry registry) {
        this.registry = registry;
    }

    @GetMapping("/fields")
    @PreAuthorize("@identityAuthorization.hasPermission(authentication, 'transactions.read')")
    public List<TransactionFieldDefinition> fields(@RequestParam(required = false) String channel) {
        if (channel == null || channel.isBlank()) {
            return registry.allFields();
        }

        try {
            return registry.fieldsFor(TransactionChannel.fromApiValue(channel));
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported transaction channel");
        }
    }
}
