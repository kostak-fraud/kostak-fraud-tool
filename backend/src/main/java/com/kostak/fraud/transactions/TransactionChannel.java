package com.kostak.fraud.transactions;

import java.util.Arrays;

public enum TransactionChannel {
    WALLET("wallet"),
    POS("pos"),
    PHYSICAL_POS("physical_pos");

    private final String apiValue;

    TransactionChannel(String apiValue) {
        this.apiValue = apiValue;
    }

    public String apiValue() {
        return apiValue;
    }

    public static TransactionChannel fromApiValue(String value) {
        return Arrays.stream(values())
                .filter(channel -> channel.apiValue.equalsIgnoreCase(value == null ? "" : value.trim()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unsupported transaction channel"));
    }
}
