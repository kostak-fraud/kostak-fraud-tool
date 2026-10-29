package com.kostak.fraud.migration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.mode", havingValue = "migrate")
final class MigrationCompletionReporter implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(MigrationCompletionReporter.class);

    private final Flyway flyway;

    MigrationCompletionReporter(Flyway flyway) {
        this.flyway = flyway;
    }

    @Override
    public void run(ApplicationArguments args) {
        MigrationInfo current = flyway.info().current();
        String version = current == null || current.getVersion() == null
                ? "none"
                : current.getVersion().getVersion();
        log.info("migration_complete mode=migrate schema_version={}", version);
    }
}
