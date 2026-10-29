package com.kostak.fraud.transactions;

public enum TransactionFilterOperator {
    EQ("eq"),
    IN("in"),
    GT("gt"),
    GTE("gte"),
    LT("lt"),
    LTE("lte"),
    RANGE("range");

    private final String apiValue;

    TransactionFilterOperator(String apiValue) {
        this.apiValue = apiValue;
    }

    public String apiValue() {
        return apiValue;
    }
}
