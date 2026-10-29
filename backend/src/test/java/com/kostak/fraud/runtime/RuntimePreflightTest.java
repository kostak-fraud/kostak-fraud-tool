package com.kostak.fraud.runtime;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

class RuntimePreflightTest {

    @Test
    void acceptsLocalApiDefaultsAndExplicitCorsOrigins() {
        Map<String, String> environment = local("api");
        environment.put("APP_CORS_ALLOWED_ORIGINS", "http://localhost:3000,https://preview.example.test");

        RuntimeSettings settings = validate(environment);

        assertThat(settings.mode()).isEqualTo(AppMode.API);
        assertThat(settings.environment()).isEqualTo("local");
        assertThat(settings.releaseSha()).isEqualTo("local-development");
        assertThat(settings.corsAllowedOrigins())
                .containsExactly("http://localhost:3000", "https://preview.example.test");
    }

    @Test
    void deployedSpringProfileRequiresExplicitMatchingAppEnvironment() {
        Map<String, String> missingAppEnvironment = local("worker");
        missingAppEnvironment.put("SPRING_PROFILES_ACTIVE", "production");
        assertThatIllegalArgumentException()
                .isThrownBy(() -> validate(missingAppEnvironment))
                .withMessageContaining("APP_ENV is required");

        Map<String, String> missingSpringProfile = deployed("worker");
        missingSpringProfile.remove("SPRING_PROFILES_ACTIVE");
        assertThatIllegalArgumentException()
                .isThrownBy(() -> validate(missingSpringProfile))
                .withMessageContaining("SPRING_PROFILES_ACTIVE is required");

        Map<String, String> conflicting = deployed("worker");
        conflicting.put("SPRING_PROFILES_ACTIVE", "staging");
        assertThatIllegalArgumentException()
                .isThrownBy(() -> validate(conflicting))
                .withMessageContaining("conflicts with authoritative APP_ENV=production");

        Map<String, String> productionWithAdditionalProfile = deployed("worker");
        productionWithAdditionalProfile.put("SPRING_PROFILES_ACTIVE", "production,observability");
        assertThat(validate(productionWithAdditionalProfile).environment()).isEqualTo("production");
    }

    @Test
    void springProfileOverridesCannotBypassAppEnvironmentContract() {
        Map<String, String> production = deployed("worker");
        Properties properties = new Properties();
        properties.setProperty("spring.profiles.active", "staging");
        assertThatIllegalArgumentException()
                .isThrownBy(() -> RuntimePreflight.validate(production, properties, new String[0]))
                .withMessageContaining("conflicts with authoritative APP_ENV=production");

        assertThatIllegalArgumentException()
                .isThrownBy(() -> RuntimePreflight.validate(
                        production,
                        new Properties(),
                        new String[]{"--spring.profiles.active=staging"}
                ))
                .withMessageContaining("conflicts with authoritative APP_ENV=production");
    }

    @Test
    void rejectsMissingModeAndConflictingOverrides() {
        assertThatIllegalArgumentException().isThrownBy(() -> validate(new HashMap<>()));

        Map<String, String> api = local("api");
        api.put("SPRING_FLYWAY_ENABLED", "true");
        assertThatIllegalArgumentException()
                .isThrownBy(() -> validate(api))
                .withMessageContaining("conflicts");

        Map<String, String> worker = local("worker");
        assertThatIllegalArgumentException()
                .isThrownBy(() -> RuntimePreflight.validate(
                        worker,
                        new Properties(),
                        new String[]{"--spring.flyway.enabled=true"}
                ))
                .withMessageContaining("conflicts");

        worker.put("SPRING_MAIN_WEB_APPLICATION_TYPE", "servlet");
        assertThatIllegalArgumentException()
                .isThrownBy(() -> validate(worker))
                .withMessageContaining("authoritative APP_MODE");

        Map<String, String> migrate = local("migrate");
        Properties properties = new Properties();
        properties.setProperty("spring.flyway.enabled", "false");
        assertThatIllegalArgumentException()
                .isThrownBy(() -> RuntimePreflight.validate(migrate, properties, new String[0]))
                .withMessageContaining("conflicts");
    }

    @Test
    void productionRequiresExplicitTlsDatabaseConfiguration() {
        Map<String, String> missingPassword = deployed("worker");
        missingPassword.remove("SPRING_DATASOURCE_PASSWORD");
        assertThatIllegalArgumentException()
                .isThrownBy(() -> validate(missingPassword))
                .withMessageContaining("SPRING_DATASOURCE_PASSWORD");

        Map<String, String> insecure = deployed("worker");
        insecure.put("SPRING_DATASOURCE_URL", "jdbc:postgresql://db.example.test:5432/kostak?sslmode=disable");
        assertThatIllegalArgumentException()
                .isThrownBy(() -> validate(insecure))
                .withMessageContaining("sslmode");

        Map<String, String> embeddedCredentials = deployed("worker");
        embeddedCredentials.put(
                "SPRING_DATASOURCE_URL",
                "jdbc:postgresql://user:password@db.example.test:5432/kostak?sslmode=require"
        );
        assertThatIllegalArgumentException()
                .isThrownBy(() -> validate(embeddedCredentials))
                .withMessageContaining("embed credentials");

        Map<String, String> missingDatabaseName = deployed("worker");
        missingDatabaseName.put(
                "SPRING_DATASOURCE_URL",
                "jdbc:postgresql://db.example.test:5432?sslmode=require"
        );
        assertThatIllegalArgumentException()
                .isThrownBy(() -> validate(missingDatabaseName))
                .withMessageContaining("database name");
    }

    @Test
    void deployedRuntimeRequiresExactReleaseShaAndSmallConnectionPool() {
        Map<String, String> invalidSha = deployed("worker");
        invalidSha.put("APP_RELEASE_SHA", "short-sha");
        assertThatIllegalArgumentException()
                .isThrownBy(() -> validate(invalidSha))
                .withMessageContaining("40-character commit SHA");

        Map<String, String> oversizedPool = deployed("worker");
        oversizedPool.put("SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE", "5");
        assertThatIllegalArgumentException()
                .isThrownBy(() -> validate(oversizedPool))
                .withMessageContaining("between 1 and 4");

        Map<String, String> smallPool = deployed("worker");
        smallPool.put("SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE", "4");
        assertThat(validate(smallPool).releaseSha())
                .isEqualTo("0123456789abcdef0123456789abcdef01234567");
    }

    @Test
    void productionApiValidatesAuthContractWithoutImplementingAuthentication() {
        Map<String, String> productionApi = deployed("api");
        assertThatIllegalArgumentException()
                .isThrownBy(() -> validate(productionApi))
                .withMessageContaining("SUPABASE_URL");

        productionApi.put("SUPABASE_URL", "https://project.supabase.co");
        productionApi.put("SUPABASE_JWT_ISSUER", "https://project.supabase.co/auth/v1");
        productionApi.put("SUPABASE_JWKS_URL", "https://project.supabase.co/auth/v1/.well-known/jwks.json");
        productionApi.put("SUPABASE_JWT_AUDIENCE", "authenticated");

        assertThat(validate(productionApi).mode()).isEqualTo(AppMode.API);

        productionApi.put("SUPABASE_JWKS_URL", "http://project.supabase.co/auth/v1/.well-known/jwks.json");
        assertThatIllegalArgumentException()
                .isThrownBy(() -> validate(productionApi))
                .withMessageContaining("HTTPS");
    }

    @Test
    void productionCannotEnableSyntheticGeneratorButStagingCan() {
        Map<String, String> production = deployed("worker");
        production.put("APP_SIMULATION_ENABLED", "true");
        assertThatIllegalArgumentException()
                .isThrownBy(() -> validate(production))
                .withMessageContaining("must be false in production");

        production.put("APP_SIMULATION_ENABLED", "false");
        assertThat(validate(production).environment()).isEqualTo("production");

        Properties systemProperties = new Properties();
        systemProperties.setProperty("app.simulation.enabled", "true");
        assertThatIllegalArgumentException()
                .isThrownBy(() -> RuntimePreflight.validate(production, systemProperties, new String[0]))
                .withMessageContaining("must be false in production");
        assertThatIllegalArgumentException()
                .isThrownBy(() -> RuntimePreflight.validate(
                        production,
                        new Properties(),
                        new String[]{"--app.simulation.enabled=true"}
                ))
                .withMessageContaining("must be false in production");

        Map<String, String> staging = deployed("worker");
        staging.put("APP_ENV", "staging");
        staging.put("SPRING_PROFILES_ACTIVE", "staging");
        staging.put("APP_SIMULATION_ENABLED", "true");
        assertThat(validate(staging).environment()).isEqualTo("staging");

        staging.put("APP_SIMULATION_ENABLED", "yes");
        assertThatIllegalArgumentException()
                .isThrownBy(() -> validate(staging))
                .withMessageContaining("must be true or false");
    }

    @Test
    void deployedWorkerDoesNotRequireApiAuthContract() {
        RuntimeSettings settings = validate(deployed("worker"));
        assertThat(settings.mode()).isEqualTo(AppMode.WORKER);
        assertThat(settings.environment()).isEqualTo("production");
    }

    @Test
    void deployedCorsRejectsWildcardAndPlainHttp() {
        Map<String, String> production = deployed("worker");
        production.put("APP_CORS_ALLOWED_ORIGINS", "*");
        assertThatIllegalArgumentException().isThrownBy(() -> validate(production));

        production.put("APP_CORS_ALLOWED_ORIGINS", "http://example.test");
        assertThatIllegalArgumentException().isThrownBy(() -> validate(production));
    }

    private RuntimeSettings validate(Map<String, String> environment) {
        return RuntimePreflight.validate(environment, new Properties(), new String[0]);
    }

    private Map<String, String> local(String mode) {
        Map<String, String> environment = new HashMap<>();
        environment.put("APP_MODE", mode);
        return environment;
    }

    private Map<String, String> deployed(String mode) {
        Map<String, String> environment = local(mode);
        environment.put("APP_ENV", "production");
        environment.put("SPRING_PROFILES_ACTIVE", "production");
        environment.put("APP_RELEASE_SHA", "0123456789abcdef0123456789abcdef01234567");
        environment.put(
                "SPRING_DATASOURCE_URL",
                "jdbc:postgresql://db.example.test:5432/kostak?sslmode=require"
        );
        environment.put("SPRING_DATASOURCE_USERNAME", "kostak_runtime");
        environment.put("SPRING_DATASOURCE_PASSWORD", "synthetic-test-value");
        return environment;
    }
}
