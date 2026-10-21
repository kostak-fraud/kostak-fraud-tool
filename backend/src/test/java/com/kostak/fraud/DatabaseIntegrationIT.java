package com.kostak.fraud;

import org.flywaydb.core.Flyway;
import org.jooq.DSLContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.jooq.impl.DSL.name;
import static org.jooq.impl.DSL.table;

@SpringBootTest
@Testcontainers
class DatabaseIntegrationIT {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.3-alpine3.23");

    @Autowired
    private Flyway flyway;

    @Autowired
    private DSLContext dsl;

    @Test
    void appliesMigrationAndExecutesJooqQueryAgainstPostgres() {
        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("1");

        Integer rowCount = dsl
                .selectCount()
                .from(table(name("scaffold_probe")))
                .fetchOne(0, Integer.class);

        assertThat(rowCount).isEqualTo(1);
        assertThat(postgres.isRunning()).isTrue();
    }
}
