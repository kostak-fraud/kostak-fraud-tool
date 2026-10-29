package com.kostak.fraud;

import com.kostak.fraud.runtime.RuntimePreflight;
import com.kostak.fraud.runtime.RuntimeSettings;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.MapPropertySource;

import java.util.LinkedHashMap;
import java.util.Map;

@SpringBootApplication
public class KostakApplication {

    public static void main(String[] args) {
        RuntimeSettings settings = RuntimePreflight.validate(
                System.getenv(),
                System.getProperties(),
                args
        );

        SpringApplication application = createApplication(settings);
        ConfigurableApplicationContext context = application.run(args);

        if (settings.mode().isMigration()) {
            context.close();
        }
    }

    static SpringApplication createApplication(RuntimeSettings settings) {
        SpringApplication application = new SpringApplication(KostakApplication.class);
        application.setWebApplicationType(settings.mode().webApplicationType());
        application.addInitializers(context -> context.getEnvironment()
                .getPropertySources()
                .addFirst(new MapPropertySource("kostakRuntimeInvariants", runtimeProperties(settings))));
        return application;
    }

    static Map<String, Object> runtimeProperties(RuntimeSettings settings) {
        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put("app.mode", settings.mode().externalName());
        properties.put("app.environment", settings.environment());
        properties.put("app.release-sha", settings.releaseSha());
        properties.put("app.cors.allowed-origins", String.join(",", settings.corsAllowedOrigins()));
        properties.put("spring.main.web-application-type", settings.mode().webApplicationType().name().toLowerCase());
        properties.put("spring.flyway.enabled", settings.mode().flywayEnabled());
        properties.put("spring.flyway.clean-disabled", true);

        if (settings.mode().isMigration()) {
            properties.put("spring.datasource.hikari.maximum-pool-size", 1);
        }

        return properties;
    }
}
