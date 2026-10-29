package com.kostak.fraud;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import javax.sql.DataSource;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Connection;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "app.mode=api",
                "app.environment=test",
                "app.release-sha=api-test",
                "spring.flyway.enabled=false"
        }
)
@Testcontainers
class KostakApplicationTest {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.3-alpine3.23");

    @Autowired
    private DataSource dataSource;

    @Value("${local.server.port}")
    private int port;

    @Test
    void apiExposesDatabaseBackedHealthWithoutRunningMigrations() throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        HttpResponse<String> liveness = get(client, "/actuator/health/liveness");
        HttpResponse<String> readiness = get(client, "/actuator/health/readiness");
        HttpResponse<String> releaseInfo = get(client, "/actuator/info");

        assertThat(liveness.statusCode()).isEqualTo(200);
        assertThat(liveness.body()).contains("\"status\":\"UP\"");
        assertThat(readiness.statusCode()).isEqualTo(200);
        assertThat(readiness.body()).contains("\"status\":\"UP\"");
        assertThat(releaseInfo.statusCode()).isEqualTo(200);
        assertThat(releaseInfo.body()).contains("\"sha\":\"api-test\"");

        try (Connection connection = dataSource.getConnection();
             var statement = connection.prepareStatement("SELECT to_regclass('public.flyway_schema_history')")) {
            try (var result = statement.executeQuery()) {
                assertThat(result.next()).isTrue();
                assertThat(result.getString(1)).isNull();
            }
        }
    }

    private HttpResponse<String> get(HttpClient client, String path) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                .GET()
                .build();
        return client.send(request, HttpResponse.BodyHandlers.ofString());
    }
}
