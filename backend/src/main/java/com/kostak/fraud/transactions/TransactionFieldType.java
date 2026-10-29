package com.kostak.fraud.transactions;

public enum TransactionFieldType {
    UUID("uuid"),
    STRING("string"),
    DECIMAL("decimal"),
    INTEGER("integer"),
    TIMESTAMP("timestamp"),
    BOOLEAN("boolean"),
    ENUM("enum"),
    CURRENCY("currency");

    private final String apiValue;

    TransactionFieldType(String apiValue) {
        this.apiValue = apiValue;
    }

    public String apiValue() {
        return apiValue;
    }
}
