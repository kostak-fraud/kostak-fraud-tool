package com.kostak.fraud.runtime;

import org.springframework.beans.factory.InitializingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.mode", havingValue = "api")
final class ApiDatabaseStartupProbe implements InitializingBean {

    private final DatabaseConnectivityProbe databaseProbe;

    ApiDatabaseStartupProbe(DatabaseConnectivityProbe databaseProbe) {
        this.databaseProbe = databaseProbe;
    }

    @Override
    public void afterPropertiesSet() {
        DatabaseProbeResult result = databaseProbe.probe();
        if (!result.available()) {
            throw new IllegalStateException(
                    "API database startup probe failed (error_type=" + result.failureType() + ")"
            );
        }
    }
}
