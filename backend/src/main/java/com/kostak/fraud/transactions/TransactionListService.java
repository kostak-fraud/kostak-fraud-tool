package com.kostak.fraud.transactions;

import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class TransactionListService {

    public static final int DEFAULT_PAGE_SIZE = 50;
    public static final int MAX_PAGE_SIZE = 100;

    private final TransactionListRepository repository;

    TransactionListService(TransactionListRepository repository) {
        this.repository = repository;
    }

    public TransactionPageResponse list(
            UUID tenantId,
            TransactionChannel channel,
            long page,
            int pageSize
    ) {
        if (page < 0) {
            throw new IllegalArgumentException("page must be non-negative");
        }
        if (pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("pageSize must be between 1 and 100");
        }

        long offset;
        try {
            offset = Math.multiplyExact(page, (long) pageSize);
        } catch (ArithmeticException exception) {
            throw new IllegalArgumentException("page offset is too large", exception);
        }

        long totalElements = repository.count(tenantId, channel);
        long totalPages = totalElements == 0
                ? 0
                : ((totalElements - 1) / pageSize) + 1;

        return new TransactionPageResponse(
                repository.findPage(tenantId, channel, pageSize, offset),
                page,
                pageSize,
                totalElements,
                totalPages
        );
    }
}
