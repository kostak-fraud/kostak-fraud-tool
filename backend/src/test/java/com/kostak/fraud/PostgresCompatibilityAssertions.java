package com.kostak.fraud;

import org.flywaydb.core.Flyway;
import org.jooq.DSLContext;
import org.jooq.SQLDialect;
import org.jooq.impl.DSL;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.sql.DriverManager;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.jooq.impl.DSL.name;
import static org.jooq.impl.DSL.table;

final class PostgresCompatibilityAssertions {

    private PostgresCompatibilityAssertions() {
    }

    static void verify(PostgreSQLContainer postgres, String expectedMajorVersion) throws Exception {
        Flyway firstMigrator = migrator(postgres);
        Flyway secondMigrator = migrator(postgres);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);

        try (var migrations = Executors.newFixedThreadPool(2)) {
            var first = migrations.submit(() -> migrateWhenReleased(firstMigrator, ready, start));
            var second = migrations.submit(() -> migrateWhenReleased(secondMigrator, ready, start));

            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            first.get(30, TimeUnit.SECONDS);
            second.get(30, TimeUnit.SECONDS);
        }

        Flyway flyway = migrator(postgres);
        flyway.validate();
        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("2");

        try (var connection = DriverManager.getConnection(
                postgres.getJdbcUrl(),
                postgres.getUsername(),
                postgres.getPassword()
        )) {
            DSLContext dsl = DSL.using(connection, SQLDialect.POSTGRES);
            Integer rowCount = dsl
                    .selectCount()
                    .from(table(name("scaffold_probe")))
                    .fetchOne(0, Integer.class);

            assertThat(connection.getMetaData().getDatabaseMajorVersion())
                    .isEqualTo(Integer.parseInt(expectedMajorVersion));
            assertThat(rowCount).isEqualTo(1);

            Integer permissionCount = dsl
                    .selectCount()
                    .from(table(name("role_permissions")))
                    .fetchOne(0, Integer.class);
            assertThat(permissionCount).isEqualTo(17);
        }

        flyway.migrate();
        flyway.validate();
        assertThat(postgres.isRunning()).isTrue();
    }

    private static Flyway migrator(PostgreSQLContainer postgres) {
        return Flyway.configure()
                .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .locations("classpath:db/migration")
                .cleanDisabled(true)
                .load();
    }

    private static void migrateWhenReleased(
            Flyway flyway,
            CountDownLatch ready,
            CountDownLatch start
    ) {
        ready.countDown();
        try {
            if (!start.await(10, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Timed out waiting to start concurrent migration test");
            }
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Concurrent migration test was interrupted", interrupted);
        }
        flyway.migrate();
        flyway.validate();
    }
}
