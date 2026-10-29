package com.kostak.fraud.simulation;

import com.kostak.fraud.transactions.TransactionChannel;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record SyntheticTransaction(
        UUID id,
        TransactionChannel channel,
        String sourceReference,
        String idempotencyKey,
        Instant occurredAt,
        BigDecimal amount,
        String currency,
        String customerRef,
        String cardRef,
        String merchantRef,
        String merchantRisk,
        String transactionType,
        String senderAccountRef,
        String receiverAccountRef,
        String transferDirection,
        Boolean is3ds,
        String terminalRef,
        boolean riskScenario
) {
}
