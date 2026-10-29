package com.kostak.fraud;

import org.junit.jupiter.api.Test;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@Testcontainers
class Postgres17DatabaseIntegrationIT {

    @Container
    static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17.11-alpine3.23");

    @Test
    void appliesAndValidatesMigrationWithJooqOnPostgres17() throws Exception {
        PostgresCompatibilityAssertions.verify(postgres, "17");
    }
}
