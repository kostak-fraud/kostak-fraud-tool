package com.kostak.fraud.transactions;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;

@Repository
class TransactionListRepository {

    private final JdbcTemplate jdbcTemplate;

    TransactionListRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    List<TransactionListItem> findPage(
            UUID tenantId,
            TransactionChannel channel,
            int pageSize,
            long offset
    ) {
        return jdbcTemplate.query("""
                SELECT id, channel, occurred_at, received_at, amount, currency, customer_ref, card_ref,
                       merchant_ref, merchant_risk, transaction_type, review_status, risk_score,
                       assigned_user_id, payment_blocked, sender_account_ref, receiver_account_ref,
                       transfer_direction, is_3ds, terminal_ref
                FROM transactions
                WHERE tenant_id = ?
                  AND channel = ?
                  AND evaluation_state = 'processed'
                ORDER BY occurred_at DESC, id DESC
                LIMIT ? OFFSET ?
                """, (resultSet, rowNumber) -> mapItem(resultSet),
                tenantId, channel.apiValue(), pageSize, offset);
    }

    long count(UUID tenantId, TransactionChannel channel) {
        Long count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM transactions
                WHERE tenant_id = ?
                  AND channel = ?
                  AND evaluation_state = 'processed'
                """, Long.class, tenantId, channel.apiValue());
        return count == null ? 0L : count;
    }

    private static TransactionListItem mapItem(ResultSet resultSet) throws SQLException {
        return new TransactionListItem(
                resultSet.getObject("id", UUID.class),
                resultSet.getString("channel"),
                resultSet.getTimestamp("occurred_at").toInstant(),
                resultSet.getTimestamp("received_at").toInstant(),
                resultSet.getBigDecimal("amount"),
                resultSet.getString("currency"),
                resultSet.getString("customer_ref"),
                resultSet.getString("card_ref"),
                resultSet.getString("merchant_ref"),
                resultSet.getString("merchant_risk"),
                resultSet.getString("transaction_type"),
                resultSet.getString("review_status"),
                resultSet.getInt("risk_score"),
                resultSet.getObject("assigned_user_id", UUID.class),
                resultSet.getBoolean("payment_blocked"),
                resultSet.getString("sender_account_ref"),
                resultSet.getString("receiver_account_ref"),
                resultSet.getString("transfer_direction"),
                resultSet.getObject("is_3ds", Boolean.class),
                resultSet.getString("terminal_ref")
        );
    }
}
