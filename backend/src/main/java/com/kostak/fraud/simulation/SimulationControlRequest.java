package com.kostak.fraud.simulation;

public record SimulationControlRequest(
        boolean enabled,
        int ratePerSecond
) {
}
