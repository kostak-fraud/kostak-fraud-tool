package com.kostak.fraud.worker;

import com.kostak.fraud.runtime.DatabaseConnectivityProbe;
import com.kostak.fraud.runtime.DatabaseProbeResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalStateException;

class WorkerHeartbeatLifecycleTest {

    @TempDir
    Path temporaryDirectory;

    @Test
    void staysAliveForMultipleHeartbeatsAndStopsGracefully() throws Exception {
        CountDownLatch probes = new CountDownLatch(3);
        DatabaseConnectivityProbe databaseProbe = () -> {
            probes.countDown();
            return DatabaseProbeResult.up();
        };
        Path heartbeatFile = temporaryDirectory.resolve("worker-heartbeat");
        WorkerHeartbeatLifecycle lifecycle = lifecycle(databaseProbe, heartbeatFile);

        lifecycle.start();

        assertThat(probes.await(2, TimeUnit.SECONDS)).isTrue();
        assertThat(lifecycle.isRunning()).isTrue();
        assertThat(Files.readString(heartbeatFile))
                .contains("mode=worker")
                .contains("environment=test")
                .contains("release_sha=test-release")
                .contains("db_status=UP");

        lifecycle.stop();

        assertThat(lifecycle.isRunning()).isFalse();
        assertThat(heartbeatFile).doesNotExist();
    }

    @Test
    void failsStartupWhenDatabaseIsUnavailableWithoutLoggingCredentials() throws Exception {
        DatabaseConnectivityProbe databaseProbe = () -> new DatabaseProbeResult(false, "PSQLException");
        Path heartbeatFile = temporaryDirectory.resolve("worker-heartbeat-down");
        WorkerHeartbeatLifecycle lifecycle = lifecycle(databaseProbe, heartbeatFile);

        assertThatIllegalStateException()
                .isThrownBy(lifecycle::start)
                .withMessage("Worker database startup probe failed (error_type=PSQLException)")
                .withMessageNotContaining("jdbc")
                .withMessageNotContaining("password");

        assertThat(lifecycle.isRunning()).isFalse();
        assertThat(Files.readString(heartbeatFile)).contains("db_status=DOWN");
        lifecycle.stop();
        assertThat(heartbeatFile).doesNotExist();
    }

    private WorkerHeartbeatLifecycle lifecycle(
            DatabaseConnectivityProbe databaseProbe,
            Path heartbeatFile
    ) {
        return new WorkerHeartbeatLifecycle(
                databaseProbe,
                "test",
                "test-release",
                Duration.ofMillis(25),
                heartbeatFile,
                Duration.ofSeconds(1)
        );
    }
}
