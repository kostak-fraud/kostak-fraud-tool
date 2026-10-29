package com.kostak.fraud.transactions;

import java.util.List;

public record TransactionPageResponse(
        List<TransactionListItem> items,
        long page,
        int pageSize,
        long totalElements,
        long totalPages
) {
    public TransactionPageResponse {
        items = List.copyOf(items);
    }
}
