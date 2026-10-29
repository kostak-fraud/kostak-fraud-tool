package com.kostak.fraud.simulation;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class SimulationControlService {

    public static final int MIN_RATE_PER_SECOND = 1;
    public static final int MAX_RATE_PER_SECOND = 10;
    private static final long DEFAULT_SEED = 42L;

    private final JdbcTemplate jdbcTemplate;
    private final boolean globallyEnabled;

    public SimulationControlService(
            JdbcTemplate jdbcTemplate,
            @Value("${app.simulation.enabled:false}") boolean globallyEnabled
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.globallyEnabled = globallyEnabled;
    }

    public SimulationControlResponse get(UUID tenantId) {
        List<SimulationControlResponse> controls = jdbcTemplate.query("""
                SELECT enabled, rate_per_second, seed, next_sequence
                FROM simulation_controls
                WHERE tenant_id = ?
                """, (rs, rowNum) -> new SimulationControlResponse(
                rs.getBoolean("enabled"),
                rs.getInt("rate_per_second"),
                rs.getLong("seed"),
                rs.getLong("next_sequence"),
                globallyEnabled
        ), tenantId);

        if (controls.isEmpty()) {
            return new SimulationControlResponse(false, MIN_RATE_PER_SECOND, DEFAULT_SEED, 1L, globallyEnabled);
        }
        return controls.getFirst();
    }

    public SimulationControlResponse update(UUID tenantId, SimulationControlRequest request) {
        if (request.ratePerSecond() < MIN_RATE_PER_SECOND || request.ratePerSecond() > MAX_RATE_PER_SECOND) {
            throw new IllegalArgumentException("ratePerSecond must be between 1 and 10");
        }
        if (request.enabled() && !globallyEnabled) {
            throw new SimulationGloballyDisabledException();
        }

        jdbcTemplate.update("""
                INSERT INTO simulation_controls (tenant_id, enabled, rate_per_second)
                VALUES (?, ?, ?)
                ON CONFLICT (tenant_id) DO UPDATE
                SET enabled = EXCLUDED.enabled,
                    rate_per_second = EXCLUDED.rate_per_second,
                    updated_at = CURRENT_TIMESTAMP
                """, tenantId, request.enabled(), request.ratePerSecond());

        return get(tenantId);
    }
}
