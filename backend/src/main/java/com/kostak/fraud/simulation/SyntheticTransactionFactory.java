package com.kostak.fraud.simulation;

import com.kostak.fraud.transactions.TransactionChannel;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Locale;
import java.util.SplittableRandom;
import java.util.UUID;

@Component
public class SyntheticTransactionFactory {

    public SyntheticTransaction create(UUID tenantId, long seed, long sequence, Instant occurredAt) {
        if (tenantId == null) {
            throw new IllegalArgumentException("Tenant ID is required");
        }
        if (sequence < 1) {
            throw new IllegalArgumentException("Sequence must be positive");
        }
        if (occurredAt == null) {
            throw new IllegalArgumentException("Occurred-at timestamp is required");
        }

        SplittableRandom random = new SplittableRandom(seed ^ (sequence * 0x9E3779B97F4A7C15L));
        boolean riskScenario = random.nextInt(100) < 20;
        TransactionChannel channel = switch ((int) ((sequence - 1) % 3)) {
            case 0 -> TransactionChannel.WALLET;
            case 1 -> TransactionChannel.POS;
            default -> TransactionChannel.PHYSICAL_POS;
        };

        String tenantToken = tenantId.toString().replace("-", "").substring(0, 8).toUpperCase(Locale.ROOT);
        String sequenceToken = String.format(Locale.ROOT, "%012d", sequence);
        UUID id = UUID.nameUUIDFromBytes((tenantId + ":" + sequence).getBytes(StandardCharsets.UTF_8));
        String sourceReference = "MOCK-TXN-" + tenantToken + "-" + sequenceToken;
        String idempotencyKey = "MOCK-INGEST-" + tenantToken + "-" + sequenceToken;
        String customerRef = "MOCK-CUST-" + String.format(Locale.ROOT, "%06d", 1 + random.nextInt(10_000));
        String cardRef = riskScenario
                ? "MOCK-CARD-RISK-001"
                : "MOCK-CARD-" + String.format(Locale.ROOT, "%03d", 1 + random.nextInt(25));
        String merchantRef = riskScenario
                ? "MOCK-MERCH-RISK-001"
                : "MOCK-MERCH-" + String.format(Locale.ROOT, "%02d", 1 + random.nextInt(10));
        String merchantRisk = riskScenario ? "high" : (random.nextBoolean() ? "low" : "medium");
        long amountInCents = riskScenario
                ? 1_000_000L + random.nextLong(9_000_000L)
                : 500L + random.nextLong(249_500L);
        BigDecimal amount = BigDecimal.valueOf(amountInCents, 2);

        String senderAccountRef = null;
        String receiverAccountRef = null;
        String transferDirection = null;
        Boolean is3ds = null;
        String terminalRef = null;
        String transactionType;

        switch (channel) {
            case WALLET -> {
                transactionType = "transfer";
                transferDirection = random.nextBoolean() ? "in" : "out";
                if ("in".equals(transferDirection)) {
                    receiverAccountRef = "MOCK-ACCT-RECEIVER-" + String.format(Locale.ROOT, "%03d", 1 + random.nextInt(20));
                } else {
                    senderAccountRef = "MOCK-ACCT-SENDER-" + String.format(Locale.ROOT, "%03d", 1 + random.nextInt(20));
                }
            }
            case POS -> {
                transactionType = "payment";
                is3ds = !riskScenario;
            }
            case PHYSICAL_POS -> {
                transactionType = "payment";
                terminalRef = "MOCK-TERM-" + String.format(Locale.ROOT, "%02d", 1 + random.nextInt(5));
            }
            default -> throw new IllegalStateException("Unsupported transaction channel");
        }

        return new SyntheticTransaction(
                id,
                channel,
                sourceReference,
                idempotencyKey,
                occurredAt,
                amount,
                "TRY",
                customerRef,
                cardRef,
                merchantRef,
                merchantRisk,
                transactionType,
                senderAccountRef,
                receiverAccountRef,
                transferDirection,
                is3ds,
                terminalRef,
                riskScenario
        );
    }
}
