package com.kostak.fraud;

import com.kostak.fraud.runtime.AppMode;
import com.kostak.fraud.runtime.RuntimeSettings;
import org.junit.jupiter.api.Test;
import org.springframework.boot.WebApplicationType;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class KostakApplicationModeTest {

    @Test
    void apiModeForcesServletAndDisablesFlyway() {
        RuntimeSettings settings = settings(AppMode.API);

        assertThat(KostakApplication.createApplication(settings).getWebApplicationType())
                .isEqualTo(WebApplicationType.SERVLET);
        assertThat(KostakApplication.runtimeProperties(settings))
                .containsEntry("spring.flyway.enabled", false)
                .containsEntry("spring.main.web-application-type", "servlet")
                .doesNotContainKey("spring.datasource.hikari.maximum-pool-size");
    }

    @Test
    void workerModeForcesNonWebAndDisablesFlyway() {
        RuntimeSettings settings = settings(AppMode.WORKER);

        assertThat(KostakApplication.createApplication(settings).getWebApplicationType())
                .isEqualTo(WebApplicationType.NONE);
        assertThat(KostakApplication.runtimeProperties(settings))
                .containsEntry("spring.flyway.enabled", false)
                .containsEntry("spring.main.web-application-type", "none");
    }

    @Test
    void migrateModeForcesNonWebFlywayAndSingleConnection() {
        RuntimeSettings settings = settings(AppMode.MIGRATE);

        assertThat(KostakApplication.createApplication(settings).getWebApplicationType())
                .isEqualTo(WebApplicationType.NONE);
        assertThat(KostakApplication.runtimeProperties(settings))
                .containsEntry("spring.flyway.enabled", true)
                .containsEntry("spring.main.web-application-type", "none")
                .containsEntry("spring.datasource.hikari.maximum-pool-size", 1);
    }

    private RuntimeSettings settings(AppMode mode) {
        return new RuntimeSettings(mode, "test", "test-sha", List.of());
    }
}
