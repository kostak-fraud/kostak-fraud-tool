package com.kostak.fraud.simulation;

import com.kostak.fraud.transactions.TransactionChannel;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

class SyntheticTransactionFactoryTest {

    private static final UUID TENANT_ID = UUID.fromString("a1111111-1111-4111-8111-111111111111");
    private static final Instant OCCURRED_AT = Instant.parse("2026-10-29T00:00:00Z");
    private final SyntheticTransactionFactory factory = new SyntheticTransactionFactory();

    @Test
    void sameSeedAndSequenceProduceSameTransaction() {
        SyntheticTransaction first = factory.create(TENANT_ID, 42L, 19L, OCCURRED_AT);
        SyntheticTransaction second = factory.create(TENANT_ID, 42L, 19L, OCCURRED_AT);

        assertThat(second).isEqualTo(first);
        assertThat(first.idempotencyKey()).startsWith("MOCK-INGEST-");
        assertThat(first.sourceReference()).startsWith("MOCK-TXN-");
        assertThat(first.amount().scale()).isEqualTo(2);
    }

    @Test
    void cyclesThroughAllChannelsAndCreatesBothRiskAndNormalScenarios() {
        List<SyntheticTransaction> transactions = java.util.stream.LongStream.rangeClosed(1, 150)
                .mapToObj(sequence -> factory.create(TENANT_ID, 42L, sequence, OCCURRED_AT))
                .toList();

        assertThat(transactions.stream().map(SyntheticTransaction::channel).distinct())
                .containsExactlyInAnyOrder(TransactionChannel.WALLET, TransactionChannel.POS, TransactionChannel.PHYSICAL_POS);
        assertThat(transactions).anyMatch(SyntheticTransaction::riskScenario);
        assertThat(transactions).anyMatch(transaction -> !transaction.riskScenario());
        assertThat(transactions.stream().filter(SyntheticTransaction::riskScenario)
                .allMatch(transaction -> transaction.amount().compareTo(new java.math.BigDecimal("10000.00")) >= 0
                        && transaction.merchantRisk().equals("high"))).isTrue();
    }

    @Test
    void rejectsInvalidSequenceAndMissingTenantOrTimestamp() {
        assertThatIllegalArgumentException().isThrownBy(() -> factory.create(TENANT_ID, 42L, 0, OCCURRED_AT));
        assertThatIllegalArgumentException().isThrownBy(() -> factory.create(null, 42L, 1, OCCURRED_AT));
        assertThatIllegalArgumentException().isThrownBy(() -> factory.create(TENANT_ID, 42L, 1, null));
    }
}
