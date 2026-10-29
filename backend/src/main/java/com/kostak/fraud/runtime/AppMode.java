package com.kostak.fraud.runtime;

import org.springframework.boot.WebApplicationType;

import java.util.Arrays;
import java.util.Locale;

public enum AppMode {
    API("api", WebApplicationType.SERVLET, false),
    WORKER("worker", WebApplicationType.NONE, false),
    MIGRATE("migrate", WebApplicationType.NONE, true);

    private final String externalName;
    private final WebApplicationType webApplicationType;
    private final boolean flywayEnabled;

    AppMode(String externalName, WebApplicationType webApplicationType, boolean flywayEnabled) {
        this.externalName = externalName;
        this.webApplicationType = webApplicationType;
        this.flywayEnabled = flywayEnabled;
    }

    public static AppMode parse(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("APP_MODE is required and must be one of: api, worker, migrate");
        }

        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return Arrays.stream(values())
                .filter(mode -> mode.externalName.equals(normalized))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "APP_MODE must be one of: api, worker, migrate"
                ));
    }

    public String externalName() {
        return externalName;
    }

    public WebApplicationType webApplicationType() {
        return webApplicationType;
    }

    public boolean flywayEnabled() {
        return flywayEnabled;
    }

    public boolean isMigration() {
        return this == MIGRATE;
    }
}
