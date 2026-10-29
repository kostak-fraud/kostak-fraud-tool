package com.kostak.fraud.runtime;

import org.jooq.DSLContext;
import org.springframework.stereotype.Component;

@Component
final class JooqDatabaseConnectivityProbe implements DatabaseConnectivityProbe {

    private final DSLContext dsl;

    JooqDatabaseConnectivityProbe(DSLContext dsl) {
        this.dsl = dsl;
    }

    @Override
    public DatabaseProbeResult probe() {
        try {
            Integer value = dsl.selectOne().fetchOne(0, Integer.class);
            if (value == null || value != 1) {
                return DatabaseProbeResult.down(null);
            }
            return DatabaseProbeResult.up();
        } catch (RuntimeException failure) {
            return DatabaseProbeResult.down(failure);
        }
    }
}
