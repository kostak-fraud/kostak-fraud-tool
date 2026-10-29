package com.kostak.fraud.runtime;

import java.net.URI;
import java.net.URISyntaxException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.regex.Pattern;

public final class RuntimePreflight {

    private static final Set<String> ALLOWED_ENVIRONMENTS = Set.of("local", "test", "staging", "production");
    private static final Set<String> DEPLOYED_ENVIRONMENTS = Set.of("staging", "production");
    private static final Set<String> SECURE_SSL_MODES = Set.of("require", "verify-ca", "verify-full");
    private static final Pattern RELEASE_SHA_PATTERN = Pattern.compile("[A-Za-z0-9._-]{1,128}");
    private static final Pattern DEPLOYED_RELEASE_SHA_PATTERN = Pattern.compile("[0-9a-f]{40}");
    private static final int MAX_DEPLOYED_POOL_SIZE = 4;

    private RuntimePreflight() {
    }

    public static RuntimeSettings validate(Map<String, String> environment, Properties systemProperties, String[] args) {
        AppMode mode = AppMode.parse(environment.get("APP_MODE"));
        String appEnvironment = normalizeEnvironment(environment.get("APP_ENV"));
        String releaseSha = normalizeReleaseSha(environment.get("APP_RELEASE_SHA"));

        validateModeOverride(mode, argumentValue(args, "app.mode"), "command line app.mode");
        validateModeOverride(mode, systemProperties.getProperty("app.mode"), "system property app.mode");
        validateWebApplicationType(
                mode,
                environment.get("SPRING_MAIN_WEB_APPLICATION_TYPE"),
                "SPRING_MAIN_WEB_APPLICATION_TYPE"
        );
        validateWebApplicationType(
                mode,
                systemProperties.getProperty("spring.main.web-application-type"),
                "system property spring.main.web-application-type"
        );
        validateWebApplicationType(
                mode,
                argumentValue(args, "spring.main.web-application-type"),
                "command line spring.main.web-application-type"
        );
        validateFlywaySetting(mode, environment.get("SPRING_FLYWAY_ENABLED"), "SPRING_FLYWAY_ENABLED");
        validateFlywaySetting(mode, systemProperties.getProperty("spring.flyway.enabled"),
                "system property spring.flyway.enabled");
        validateFlywaySetting(mode, argumentValue(args, "spring.flyway.enabled"),
                "command line spring.flyway.enabled");

        List<String> corsOrigins = parseAndValidateCorsOrigins(
                environment.get("APP_CORS_ALLOWED_ORIGINS"),
                appEnvironment
        );

        if (DEPLOYED_ENVIRONMENTS.contains(appEnvironment)) {
            validateDeployedReleaseSha(releaseSha);
            validateDeployedDatabaseConfiguration(environment);
            validateDeployedPoolSize(environment);
            if (mode == AppMode.API) {
                validateApiAuthContract(environment);
            }
        }

        return new RuntimeSettings(mode, appEnvironment, releaseSha, corsOrigins);
    }

    private static String normalizeEnvironment(String value) {
        String normalized = value == null || value.isBlank()
                ? "local"
                : value.trim().toLowerCase(Locale.ROOT);
        if (!ALLOWED_ENVIRONMENTS.contains(normalized)) {
            throw new IllegalArgumentException("APP_ENV must be one of: local, test, staging, production");
        }
        return normalized;
    }

    private static String normalizeReleaseSha(String value) {
        String normalized = value == null || value.isBlank() ? "local-development" : value.trim();
        if (!RELEASE_SHA_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException("APP_RELEASE_SHA contains unsupported characters");
        }
        return normalized;
    }

    private static void validateModeOverride(AppMode mode, String configuredValue, String source) {
        if (configuredValue == null || configuredValue.isBlank()) {
            return;
        }
        AppMode configuredMode;
        try {
            configuredMode = AppMode.parse(configuredValue);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException(source + " is invalid");
        }
        if (configuredMode != mode) {
            throw new IllegalArgumentException(source + " conflicts with authoritative APP_MODE");
        }
    }

    private static void validateFlywaySetting(AppMode mode, String value, String source) {
        if (value == null || value.isBlank()) {
            return;
        }

        String normalized = value.trim().toLowerCase(Locale.ROOT);
        if (!normalized.equals("true") && !normalized.equals("false")) {
            throw new IllegalArgumentException(source + " must be true or false");
        }

        boolean configured = Boolean.parseBoolean(normalized);
        if (configured != mode.flywayEnabled()) {
            throw new IllegalArgumentException(source + " conflicts with APP_MODE=" + mode.externalName());
        }
    }

    private static void validateWebApplicationType(AppMode mode, String value, String source) {
        if (value == null || value.isBlank()) {
            return;
        }

        String expected = mode.webApplicationType().name().toLowerCase(Locale.ROOT);
        if (!expected.equals(value.trim().toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException(source + " conflicts with authoritative APP_MODE");
        }
    }

    private static void validateDeployedDatabaseConfiguration(Map<String, String> environment) {
        String url = requireNonBlank(environment, "SPRING_DATASOURCE_URL");
        requireNonBlank(environment, "SPRING_DATASOURCE_USERNAME");
        requireNonBlank(environment, "SPRING_DATASOURCE_PASSWORD");

        if (!url.startsWith("jdbc:postgresql://")) {
            throw new IllegalArgumentException("SPRING_DATASOURCE_URL must be a PostgreSQL JDBC URL");
        }

        int authorityStart = "jdbc:postgresql://".length();
        int authorityEnd = firstDelimiter(url, authorityStart, '/', '?');
        String authority = url.substring(authorityStart, authorityEnd);
        if (authority.isBlank()) {
            throw new IllegalArgumentException("SPRING_DATASOURCE_URL must contain a database host");
        }
        if (authority.contains("@")) {
            throw new IllegalArgumentException("SPRING_DATASOURCE_URL must not embed credentials");
        }

        int queryIndex = url.indexOf('?', authorityEnd);
        int databasePathEnd = queryIndex < 0 ? url.length() : queryIndex;
        if (authorityEnd >= databasePathEnd
                || url.charAt(authorityEnd) != '/'
                || url.substring(authorityEnd + 1, databasePathEnd).isBlank()) {
            throw new IllegalArgumentException("SPRING_DATASOURCE_URL must contain an explicit database name");
        }

        Map<String, List<String>> query = parseQuery(url);
        if (query.containsKey("user") || query.containsKey("password")) {
            throw new IllegalArgumentException("SPRING_DATASOURCE_URL must not embed credentials");
        }

        List<String> sslModes = query.getOrDefault("sslmode", List.of());
        if (sslModes.size() != 1 || !SECURE_SSL_MODES.contains(sslModes.getFirst().toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException(
                    "SPRING_DATASOURCE_URL must set sslmode=require, verify-ca, or verify-full"
            );
        }
    }

    private static void validateDeployedReleaseSha(String releaseSha) {
        if (!DEPLOYED_RELEASE_SHA_PATTERN.matcher(releaseSha).matches()) {
            throw new IllegalArgumentException(
                    "APP_RELEASE_SHA must be a full lowercase 40-character commit SHA for staging and production"
            );
        }
    }

    private static void validateDeployedPoolSize(Map<String, String> environment) {
        String configured = environment.get("SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE");
        if (configured == null || configured.isBlank()) {
            return;
        }

        try {
            int poolSize = Integer.parseInt(configured.trim());
            if (poolSize < 1 || poolSize > MAX_DEPLOYED_POOL_SIZE) {
                throw new IllegalArgumentException(
                        "SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE must be between 1 and 4 in staging and production"
                );
            }
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException(
                    "SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE must be an integer between 1 and 4"
            );
        }
    }

    private static void validateApiAuthContract(Map<String, String> environment) {
        validateHttpsUrl(requireNonBlank(environment, "SUPABASE_URL"), "SUPABASE_URL");
        validateHttpsUrl(requireNonBlank(environment, "SUPABASE_JWT_ISSUER"), "SUPABASE_JWT_ISSUER");
        validateHttpsUrl(requireNonBlank(environment, "SUPABASE_JWKS_URL"), "SUPABASE_JWKS_URL");
        requireNonBlank(environment, "SUPABASE_JWT_AUDIENCE");
    }

    private static void validateHttpsUrl(String value, String name) {
        try {
            URI uri = new URI(value);
            if (!"https".equalsIgnoreCase(uri.getScheme())
                    || uri.getHost() == null
                    || uri.getUserInfo() != null
                    || uri.getFragment() != null) {
                throw new IllegalArgumentException(name + " must be an HTTPS URL without credentials or fragment");
            }
        } catch (URISyntaxException exception) {
            throw new IllegalArgumentException(name + " must be a valid HTTPS URL");
        }
    }

    private static List<String> parseAndValidateCorsOrigins(String value, String appEnvironment) {
        if (value == null || value.isBlank()) {
            return List.of();
        }

        List<String> origins = new ArrayList<>();
        for (String rawOrigin : value.split(",")) {
            String origin = rawOrigin.trim();
            if (origin.isEmpty() || "*".equals(origin)) {
                throw new IllegalArgumentException("APP_CORS_ALLOWED_ORIGINS must contain explicit origins");
            }
            validateCorsOrigin(origin, appEnvironment);
            if (!origins.contains(origin)) {
                origins.add(origin);
            }
        }
        return List.copyOf(origins);
    }

    private static void validateCorsOrigin(String value, String appEnvironment) {
        try {
            URI uri = new URI(value);
            boolean localhostHttp = !DEPLOYED_ENVIRONMENTS.contains(appEnvironment)
                    && "http".equalsIgnoreCase(uri.getScheme())
                    && Set.of("localhost", "127.0.0.1", "[::1]").contains(uri.getHost());
            boolean secure = "https".equalsIgnoreCase(uri.getScheme());
            boolean rootOnly = (uri.getPath() == null || uri.getPath().isEmpty())
                    && uri.getQuery() == null
                    && uri.getFragment() == null
                    && uri.getUserInfo() == null;
            if ((!secure && !localhostHttp) || uri.getHost() == null || !rootOnly) {
                throw new IllegalArgumentException(
                        "APP_CORS_ALLOWED_ORIGINS entries must be HTTPS origins without path, query, or credentials"
                );
            }
        } catch (URISyntaxException exception) {
            throw new IllegalArgumentException("APP_CORS_ALLOWED_ORIGINS contains an invalid origin");
        }
    }

    private static String requireNonBlank(Map<String, String> environment, String name) {
        String value = environment.get(name);
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + " is required for staging and production");
        }
        return value.trim();
    }

    private static int firstDelimiter(String value, int start, char... delimiters) {
        int result = value.length();
        for (char delimiter : delimiters) {
            int index = value.indexOf(delimiter, start);
            if (index >= 0 && index < result) {
                result = index;
            }
        }
        return result;
    }

    private static Map<String, List<String>> parseQuery(String jdbcUrl) {
        int queryIndex = jdbcUrl.indexOf('?');
        if (queryIndex < 0 || queryIndex == jdbcUrl.length() - 1) {
            return Map.of();
        }

        return Arrays.stream(jdbcUrl.substring(queryIndex + 1).split("&"))
                .filter(pair -> !pair.isBlank())
                .map(pair -> pair.split("=", 2))
                .collect(java.util.stream.Collectors.groupingBy(
                        pair -> decode(pair[0]).toLowerCase(Locale.ROOT),
                        java.util.LinkedHashMap::new,
                        java.util.stream.Collectors.mapping(
                                pair -> pair.length == 2 ? decode(pair[1]) : "",
                                java.util.stream.Collectors.toList()
                        )
                ));
    }

    private static String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    private static String argumentValue(String[] args, String key) {
        String prefix = "--" + key;
        for (String argument : args) {
            if (argument.equals(prefix)) {
                return "true";
            }
            if (argument.startsWith(prefix + "=")) {
                return argument.substring(prefix.length() + 1);
            }
        }
        return null;
    }
}
