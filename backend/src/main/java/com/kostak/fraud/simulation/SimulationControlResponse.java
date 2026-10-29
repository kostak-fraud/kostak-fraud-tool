package com.kostak.fraud.simulation;

public record SimulationControlResponse(
        boolean enabled,
        int ratePerSecond,
        long seed,
        long nextSequence,
        boolean globallyEnabled
) {
}
