package com.kostak.fraud.worker;

import com.kostak.fraud.runtime.DatabaseConnectivityProbe;
import com.kostak.fraud.runtime.DatabaseProbeResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.SmartLifecycle;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Component
@ConditionalOnProperty(name = "app.mode", havingValue = "worker")
public final class WorkerHeartbeatLifecycle implements SmartLifecycle {

    private static final Logger log = LoggerFactory.getLogger(WorkerHeartbeatLifecycle.class);

    private final DatabaseConnectivityProbe databaseProbe;
    private final String environment;
    private final String releaseSha;
    private final Duration heartbeatInterval;
    private final Path heartbeatFile;
    private final Duration shutdownTimeout;

    private volatile ScheduledExecutorService executor;
    private volatile boolean running;

    public WorkerHeartbeatLifecycle(
            DatabaseConnectivityProbe databaseProbe,
            @Value("${app.environment}") String environment,
            @Value("${app.release-sha}") String releaseSha,
            @Value("${app.worker.heartbeat-interval}") Duration heartbeatInterval,
            @Value("${app.worker.heartbeat-file}") Path heartbeatFile,
            @Value("${app.worker.shutdown-timeout}") Duration shutdownTimeout
    ) {
        if (heartbeatInterval.isZero() || heartbeatInterval.isNegative() || heartbeatInterval.toMillis() == 0) {
            throw new IllegalArgumentException("Worker heartbeat interval must be positive");
        }
        if (shutdownTimeout.isNegative()) {
            throw new IllegalArgumentException("Worker shutdown timeout must not be negative");
        }
        this.databaseProbe = databaseProbe;
        this.environment = environment;
        this.releaseSha = releaseSha;
        this.heartbeatInterval = heartbeatInterval;
        this.heartbeatFile = heartbeatFile;
        this.shutdownTimeout = shutdownTimeout;
    }

    @Override
    public synchronized void start() {
        if (running) {
            return;
        }

        DatabaseProbeResult startupResult = emitHeartbeat();
        if (!startupResult.available()) {
            throw new IllegalStateException(
                    "Worker database startup probe failed (error_type=" + startupResult.failureType() + ")"
            );
        }

        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(task -> {
            Thread thread = new Thread(task, "kostak-worker-heartbeat");
            thread.setDaemon(false);
            return thread;
        });
        scheduler.scheduleWithFixedDelay(
                this::emitHeartbeatSafely,
                heartbeatInterval.toMillis(),
                heartbeatInterval.toMillis(),
                TimeUnit.MILLISECONDS
        );
        executor = scheduler;
        running = true;
        log.info("worker_started mode=worker environment={} release_sha={}", environment, releaseSha);
    }

    private void emitHeartbeatSafely() {
        try {
            emitHeartbeat();
        } catch (RuntimeException failure) {
            log.error("worker_heartbeat_failed error_type={}", failure.getClass().getSimpleName());
        }
    }

    private DatabaseProbeResult emitHeartbeat() {
        Instant timestamp = Instant.now();
        DatabaseProbeResult result = databaseProbe.probe();
        String databaseStatus = result.available() ? "UP" : "DOWN";
        writeHeartbeatFile(timestamp, databaseStatus);

        if (result.available()) {
            log.info(
                    "worker_heartbeat mode=worker environment={} timestamp={} release_sha={} db_status=UP",
                    environment,
                    timestamp,
                    releaseSha
            );
        } else {
            log.warn(
                    "worker_heartbeat mode=worker environment={} timestamp={} release_sha={} db_status=DOWN error_type={}",
                    environment,
                    timestamp,
                    releaseSha,
                    result.failureType()
            );
        }
        return result;
    }

    private void writeHeartbeatFile(Instant timestamp, String databaseStatus) {
        String payload = "timestamp=" + timestamp + System.lineSeparator()
                + "mode=worker" + System.lineSeparator()
                + "environment=" + environment + System.lineSeparator()
                + "release_sha=" + releaseSha + System.lineSeparator()
                + "db_status=" + databaseStatus + System.lineSeparator();

        Path parent = heartbeatFile.toAbsolutePath().getParent();
        Path temporary = heartbeatFile.resolveSibling(heartbeatFile.getFileName() + ".tmp");
        try {
            if (parent != null) {
                Files.createDirectories(parent);
            }
            Files.writeString(
                    temporary,
                    payload,
                    StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE,
                    StandardOpenOption.TRUNCATE_EXISTING,
                    StandardOpenOption.WRITE
            );
            try {
                Files.move(
                        temporary,
                        heartbeatFile,
                        StandardCopyOption.ATOMIC_MOVE,
                        StandardCopyOption.REPLACE_EXISTING
                );
            } catch (AtomicMoveNotSupportedException ignored) {
                Files.move(temporary, heartbeatFile, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException failure) {
            throw new IllegalStateException(
                    "Worker heartbeat file update failed (error_type=" + failure.getClass().getSimpleName() + ")"
            );
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
        deleteHeartbeatFile();
        log.info("worker_stopped mode=worker environment={} release_sha={}", environment, releaseSha);
    }

    @Override
    public void stop(Runnable callback) {
        stop();
        callback.run();
    }

    private void deleteHeartbeatFile() {
        try {
            Files.deleteIfExists(heartbeatFile);
            Files.deleteIfExists(heartbeatFile.resolveSibling(heartbeatFile.getFileName() + ".tmp"));
        } catch (IOException failure) {
            log.warn("worker_heartbeat_cleanup_failed error_type={}", failure.getClass().getSimpleName());
        }
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
        return Integer.MAX_VALUE - 100;
    }
}
