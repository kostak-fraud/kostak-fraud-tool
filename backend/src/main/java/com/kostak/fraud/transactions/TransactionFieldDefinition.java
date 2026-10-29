package com.kostak.fraud.transactions;

import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

public record TransactionFieldDefinition(
        String name,
        String type,
        boolean nullable,
        boolean sortable,
        Set<String> operators,
        Set<String> channels,
        List<String> allowedValues,
        String description
) {
    public TransactionFieldDefinition {
        operators = Collections.unmodifiableSet(new LinkedHashSet<>(operators));
        channels = Collections.unmodifiableSet(new LinkedHashSet<>(channels));
        allowedValues = List.copyOf(allowedValues);
    }
}
