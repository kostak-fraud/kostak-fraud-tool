package com.kostak.fraud.transactions;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record TransactionListItem(
        UUID id,
        String channel,
        Instant occurredAt,
        Instant receivedAt,
        BigDecimal amount,
        String currency,
        String customerRef,
        String cardRef,
        String merchantRef,
        String merchantRisk,
        String transactionType,
        String reviewStatus,
        int riskScore,
        UUID assignedUserId,
        boolean paymentBlocked,
        String senderAccountRef,
        String receiverAccountRef,
        String transferDirection,
        Boolean is3ds,
        String terminalRef
) {
}
