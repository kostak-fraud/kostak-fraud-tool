package com.kostak.fraud.simulation;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.SmartLifecycle;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Component
@ConditionalOnProperty(name = "app.mode", havingValue = "worker")
public final class SimulationGeneratorLifecycle implements SmartLifecycle {

    private static final Logger log = LoggerFactory.getLogger(SimulationGeneratorLifecycle.class);

    private final SimulationGeneratorService generatorService;
    private final String environment;
    private final boolean globallyEnabled;
    private final Duration pollInterval;
    private final Duration shutdownTimeout;

    private volatile ScheduledExecutorService executor;
    private volatile boolean running;

    public SimulationGeneratorLifecycle(
            SimulationGeneratorService generatorService,
            @Value("${app.environment}") String environment,
            @Value("${app.simulation.enabled:false}") boolean globallyEnabled,
            @Value("${app.simulation.poll-interval:1s}") Duration pollInterval,
            @Value("${app.worker.shutdown-timeout:10s}") Duration shutdownTimeout
    ) {
        if (pollInterval.compareTo(Duration.ofSeconds(1)) < 0) {
            throw new IllegalArgumentException("Simulation poll interval must be at least one second");
        }
        this.generatorService = generatorService;
        this.environment = environment;
        this.globallyEnabled = globallyEnabled;
        this.pollInterval = pollInterval;
        this.shutdownTimeout = shutdownTimeout;
    }

    @Override
    public synchronized void start() {
        if (running) {
            return;
        }
        if (!globallyEnabled) {
            log.info("simulation_generator_disabled environment={} reason=environment_gate", environment);
            return;
        }

        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(task -> {
            Thread thread = new Thread(task, "kostak-synthetic-generator");
            thread.setDaemon(false);
            return thread;
        });
        scheduler.scheduleWithFixedDelay(
                this::generateSafely,
                0,
                pollInterval.toMillis(),
                TimeUnit.MILLISECONDS
        );
        executor = scheduler;
        running = true;
        log.info("simulation_generator_started environment={} poll_interval_ms={}", environment, pollInterval.toMillis());
    }

    private void generateSafely() {
        try {
            int generated = generatorService.generateEnabledTransactions();
            if (generated > 0) {
                log.info("synthetic_transactions_generated environment={} count={}", environment, generated);
            }
        } catch (RuntimeException failure) {
            log.error("synthetic_transaction_generation_failed environment={} error_type={}",
                    environment, failure.getClass().getSimpleName());
        }
    }

    @Override
    public synchronized void stop() {
        ScheduledExecutorService scheduler = executor;
        if (scheduler != null) {
            scheduler.shutdown();
            try {
                if (!scheduler.awaitTermination(shutdownTimeout.toMillis(), TimeUnit.MILLISECONDS)) {
                    scheduler.shutdownNow();
                }
            } catch (InterruptedException interrupted) {
                scheduler.shutdownNow();
                Thread.currentThread().interrupt();
            }
        }
        executor = null;
        running = false;
        if (globallyEnabled) {
            log.info("simulation_generator_stopped environment={}", environment);
        }
    }

    @Override
    public void stop(Runnable callback) {
        stop();
        callback.run();
    }

    @Override
    public boolean isRunning() {
        return running;
    }

    @Override
    public boolean isAutoStartup() {
        return true;
    }

    @Override
    public int getPhase() {
        return Integer.MAX_VALUE - 50;
    }
}
