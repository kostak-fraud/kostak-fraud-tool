package com.kostak.fraud.simulation;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.PreparedStatementCreator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class SimulationGeneratorService {

    private final JdbcTemplate jdbcTemplate;
    private final TransactionTemplate transactionTemplate;
    private final SyntheticTransactionFactory transactionFactory;
    private final ObjectMapper objectMapper;

    public SimulationGeneratorService(
            JdbcTemplate jdbcTemplate,
            TransactionTemplate transactionTemplate,
            SyntheticTransactionFactory transactionFactory,
            ObjectMapper objectMapper
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.transactionTemplate = transactionTemplate;
        this.transactionFactory = transactionFactory;
        this.objectMapper = objectMapper;
    }

    public int generateEnabledTransactions() {
        List<UUID> tenantIds = jdbcTemplate.queryForList("""
                SELECT tenant_id
                FROM simulation_controls
                WHERE enabled = TRUE
                ORDER BY tenant_id
                """, UUID.class);

        int generated = 0;
        for (UUID tenantId : tenantIds) {
            generated += generateForTenant(tenantId);
        }
        return generated;
    }

    private int generateForTenant(UUID tenantId) {
        Integer generated = transactionTemplate.execute(transactionStatus -> {
            List<ControlRow> controls = jdbcTemplate.query("""
                    SELECT seed, rate_per_second, next_sequence
                    FROM simulation_controls
                    WHERE tenant_id = ? AND enabled = TRUE
                    FOR UPDATE SKIP LOCKED
                    """, (rs, rowNum) -> new ControlRow(
                    rs.getLong("seed"),
                    rs.getInt("rate_per_second"),
                    rs.getLong("next_sequence")
            ), tenantId);

            if (controls.isEmpty()) {
                return 0;
            }

            ControlRow control = controls.getFirst();
            long nextSequence = control.nextSequence();
            for (int offset = 0; offset < control.ratePerSecond(); offset++) {
                long sequence = Math.addExact(nextSequence, offset);
                SyntheticTransaction transaction = transactionFactory.create(
                        tenantId,
                        control.seed(),
                        sequence,
                        Instant.now()
                );
                int inserted = insert(transaction, tenantId, sequence);
                if (inserted != 1) {
                    throw new IllegalStateException("Synthetic transaction idempotency conflict");
                }
            }

            long followingSequence = Math.addExact(nextSequence, control.ratePerSecond());
            int updated = jdbcTemplate.update("""
                    UPDATE simulation_controls
                    SET next_sequence = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE tenant_id = ? AND next_sequence = ? AND enabled = TRUE
                    """, followingSequence, tenantId, nextSequence);
            if (updated != 1) {
                throw new IllegalStateException("Simulation control sequence changed during generation");
            }

            return control.ratePerSecond();
        });

        return generated == null ? 0 : generated;
    }

    private int insert(SyntheticTransaction transaction, UUID tenantId, long sequence) {
        String extraData = serializeExtraData(transaction, sequence);

        PreparedStatementCreator statementCreator = connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    INSERT INTO transactions (
                        id, tenant_id, channel, source_reference, idempotency_key, occurred_at, amount, currency,
                        customer_ref, card_ref, merchant_ref, merchant_risk, transaction_type,
                        sender_account_ref, receiver_account_ref, transfer_direction, is_3ds, terminal_ref, extra_data
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS jsonb))
                    ON CONFLICT DO NOTHING
                    """);
            statement.setObject(1, transaction.id());
            statement.setObject(2, tenantId);
            statement.setString(3, transaction.channel().apiValue());
            statement.setString(4, transaction.sourceReference());
            statement.setString(5, transaction.idempotencyKey());
            statement.setTimestamp(6, Timestamp.from(transaction.occurredAt()));
            statement.setBigDecimal(7, transaction.amount());
            statement.setString(8, transaction.currency());
            statement.setString(9, transaction.customerRef());
            statement.setString(10, transaction.cardRef());
            statement.setString(11, transaction.merchantRef());
            statement.setString(12, transaction.merchantRisk());
            statement.setString(13, transaction.transactionType());
            setNullableString(statement, 14, transaction.senderAccountRef());
            setNullableString(statement, 15, transaction.receiverAccountRef());
            setNullableString(statement, 16, transaction.transferDirection());
            if (transaction.is3ds() == null) {
                statement.setNull(17, Types.BOOLEAN);
            } else {
                statement.setBoolean(17, transaction.is3ds());
            }
            setNullableString(statement, 18, transaction.terminalRef());
            statement.setString(19, extraData);
            return statement;
        };
        return jdbcTemplate.update(statementCreator);
    }

    private String serializeExtraData(SyntheticTransaction transaction, long sequence) {
        try {
            return objectMapper.writeValueAsString(Map.of(
                    "scenario", transaction.riskScenario() ? "risk" : "normal",
                    "sequence", sequence
            ));
        } catch (JacksonException exception) {
            throw new IllegalStateException("Could not serialize synthetic transaction metadata", exception);
        }
    }

    private static void setNullableString(PreparedStatement statement, int index, String value) throws SQLException {
        if (value == null) {
            statement.setNull(index, Types.VARCHAR);
        } else {
            statement.setString(index, value);
        }
    }

    private record ControlRow(long seed, int ratePerSecond, long nextSequence) {
    }
}
