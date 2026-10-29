package com.kostak.fraud.transactions;

import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class TransactionFieldRegistryTest {

    private final TransactionFieldRegistry registry = new TransactionFieldRegistry();

    @Test
    void exposesTypedCommonFieldsAndExactDecimalOperators() {
        Map<String, TransactionFieldDefinition> fields = registry.allFields().stream()
                .collect(Collectors.toMap(TransactionFieldDefinition::name, Function.identity()));

        assertThat(fields.get("amount").type()).isEqualTo("decimal");
        assertThat(fields.get("amount").nullable()).isFalse();
        assertThat(fields.get("amount").operators())
                .containsExactlyInAnyOrder("eq", "gt", "gte", "lt", "lte", "range");
        assertThat(fields.get("currency").type()).isEqualTo("currency");
        assertThat(fields.get("review_status").allowedValues())
                .containsExactly("fraud", "not_fraud", "on_hold", "in_review", "waiting_for_review");
        assertThat(fields).doesNotContainKeys("tenant_id", "source_reference", "idempotency_key");
    }

    @Test
    void exposesOnlyChannelSpecificFieldsForSelectedChannel() {
        assertThat(registry.fieldsFor(TransactionChannel.WALLET).stream()
                .map(TransactionFieldDefinition::name))
                .contains("sender_account_ref", "receiver_account_ref", "transfer_direction")
                .doesNotContain("is_3ds", "terminal_ref");

        assertThat(registry.fieldsFor(TransactionChannel.POS).stream()
                .map(TransactionFieldDefinition::name))
                .contains("is_3ds")
                .doesNotContain("transfer_direction", "terminal_ref");

        assertThat(registry.fieldsFor(TransactionChannel.PHYSICAL_POS).stream()
                .map(TransactionFieldDefinition::name))
                .contains("terminal_ref")
                .doesNotContain("is_3ds", "transfer_direction");
    }
}
