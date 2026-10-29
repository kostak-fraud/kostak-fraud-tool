package com.kostak.fraud.transactions;

import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class TransactionFieldRegistry {

    private static final List<TransactionChannel> ALL_CHANNELS = List.of(
            TransactionChannel.WALLET,
            TransactionChannel.POS,
            TransactionChannel.PHYSICAL_POS
    );

    private final List<TransactionFieldDefinition> fields = List.of(
            field("id", TransactionFieldType.UUID, false, true, operators(TransactionFilterOperator.EQ, TransactionFilterOperator.IN),
                    ALL_CHANNELS, List.of(), "Stable synthetic transaction identifier."),
            field("channel", TransactionFieldType.ENUM, false, true, operators(TransactionFilterOperator.EQ, TransactionFilterOperator.IN),
                    ALL_CHANNELS, ALL_CHANNELS.stream().map(TransactionChannel::apiValue).toList(),
                    "Channel that owns the transaction."),
            field("occurred_at", TransactionFieldType.TIMESTAMP, false, true,
                    operators(TransactionFilterOperator.EQ, TransactionFilterOperator.GT, TransactionFilterOperator.GTE,
                            TransactionFilterOperator.LT, TransactionFilterOperator.LTE, TransactionFilterOperator.RANGE),
                    ALL_CHANNELS, List.of(), "Synthetic event time; default list order is newest first."),
            field("received_at", TransactionFieldType.TIMESTAMP, false, true,
                    operators(TransactionFilterOperator.EQ, TransactionFilterOperator.GT, TransactionFilterOperator.GTE,
                            TransactionFilterOperator.LT, TransactionFilterOperator.LTE, TransactionFilterOperator.RANGE),
                    ALL_CHANNELS, List.of(), "Backend ingestion time used by the initial rule-window semantics."),
            field("amount", TransactionFieldType.DECIMAL, false, true,
                    operators(TransactionFilterOperator.EQ, TransactionFilterOperator.GT, TransactionFilterOperator.GTE,
                            TransactionFilterOperator.LT, TransactionFilterOperator.LTE, TransactionFilterOperator.RANGE),
                    ALL_CHANNELS, List.of(), "Exact decimal amount with scale 2; never a floating-point value."),
            field("currency", TransactionFieldType.CURRENCY, false, true,
                    operators(TransactionFilterOperator.EQ, TransactionFilterOperator.IN),
                    ALL_CHANNELS, List.of(), "Three-letter uppercase currency code; demo defaults to TRY."),
            field("customer_ref", TransactionFieldType.STRING, false, false,
                    operators(TransactionFilterOperator.EQ, TransactionFilterOperator.IN),
                    ALL_CHANNELS, List.of(), "Opaque synthetic customer reference; no real customer data."),
            field("card_ref", TransactionFieldType.STRING, true, false,
                    operators(TransactionFilterOperator.EQ, TransactionFilterOperator.IN),
                    ALL_CHANNELS, List.of(), "Opaque synthetic card token; never a PAN."),
            field("merchant_ref", TransactionFieldType.STRING, true, false,
                    operators(TransactionFilterOperator.EQ, TransactionFilterOperator.IN),
                    ALL_CHANNELS, List.of(), "Opaque synthetic merchant reference."),
            field("merchant_risk", TransactionFieldType.ENUM, true, true,
                    operators(TransactionFilterOperator.EQ, TransactionFilterOperator.IN),
                    ALL_CHANNELS, List.of("low", "medium", "high"), "Synthetic merchant risk classification."),
            field("transaction_type", TransactionFieldType.ENUM, false, true,
                    operators(TransactionFilterOperator.EQ, TransactionFilterOperator.IN),
                    ALL_CHANNELS, List.of("transfer", "payment", "top_up", "withdrawal", "purchase", "refund"),
                    "Synthetic transaction type."),
            field("review_status", TransactionFieldType.ENUM, false, true,
                    operators(TransactionFilterOperator.EQ, TransactionFilterOperator.IN),
                    ALL_CHANNELS, List.of("fraud", "not_fraud", "on_hold", "in_review", "waiting_for_review"),
                    "Analyst workflow state; separate from payment blocking and worker evaluation."),
            field("risk_score", TransactionFieldType.INTEGER, false, true,
                    operators(TransactionFilterOperator.EQ, TransactionFilterOperator.GT, TransactionFilterOperator.GTE,
                            TransactionFilterOperator.LT, TransactionFilterOperator.LTE, TransactionFilterOperator.RANGE),
                    ALL_CHANNELS, List.of(), "Effective risk score from 0 through 100."),
            field("assigned_user_id", TransactionFieldType.UUID, true, false,
                    operators(TransactionFilterOperator.EQ, TransactionFilterOperator.IN),
                    ALL_CHANNELS, List.of(), "Null means the transaction is currently assigned to System."),
            field("payment_blocked", TransactionFieldType.BOOLEAN, false, true,
                    operators(TransactionFilterOperator.EQ),
                    ALL_CHANNELS, List.of(), "Mock payment-block result, independent of review status."),
            field("sender_account_ref", TransactionFieldType.STRING, true, false,
                    operators(TransactionFilterOperator.EQ, TransactionFilterOperator.IN),
                    List.of(TransactionChannel.WALLET), List.of(), "Opaque synthetic sender account reference."),
            field("receiver_account_ref", TransactionFieldType.STRING, true, false,
                    operators(TransactionFilterOperator.EQ, TransactionFilterOperator.IN),
                    List.of(TransactionChannel.WALLET), List.of(), "Opaque synthetic receiver account reference."),
            field("transfer_direction", TransactionFieldType.ENUM, false, true,
                    operators(TransactionFilterOperator.EQ, TransactionFilterOperator.IN),
                    List.of(TransactionChannel.WALLET), List.of("in", "out"), "Wallet transfer direction."),
            field("is_3ds", TransactionFieldType.BOOLEAN, true, true,
                    operators(TransactionFilterOperator.EQ),
                    List.of(TransactionChannel.POS), List.of(), "POS 3-D Secure flag; unknown values remain null."),
            field("terminal_ref", TransactionFieldType.STRING, false, false,
                    operators(TransactionFilterOperator.EQ, TransactionFilterOperator.IN),
                    List.of(TransactionChannel.PHYSICAL_POS), List.of(), "Opaque synthetic physical POS terminal reference.")
    );

    public List<TransactionFieldDefinition> allFields() {
        return fields;
    }

    public List<TransactionFieldDefinition> fieldsFor(TransactionChannel channel) {
        return fields.stream()
                .filter(field -> field.channels().contains(channel.apiValue()))
                .toList();
    }

    private static TransactionFieldDefinition field(
            String name,
            TransactionFieldType type,
            boolean nullable,
            boolean sortable,
            Set<TransactionFilterOperator> operators,
            List<TransactionChannel> channels,
            List<String> allowedValues,
            String description
    ) {
        return new TransactionFieldDefinition(
                name,
                type.apiValue(),
                nullable,
                sortable,
                operators.stream().map(TransactionFilterOperator::apiValue)
                        .collect(Collectors.toCollection(java.util.LinkedHashSet::new)),
                channels.stream().map(TransactionChannel::apiValue)
                        .collect(Collectors.toCollection(java.util.LinkedHashSet::new)),
                allowedValues,
                description
        );
    }

    private static Set<TransactionFilterOperator> operators(
            TransactionFilterOperator first,
            TransactionFilterOperator... remaining
    ) {
        EnumSet<TransactionFilterOperator> result = EnumSet.of(first, remaining);
        return Collections.unmodifiableSet(result);
    }
}
