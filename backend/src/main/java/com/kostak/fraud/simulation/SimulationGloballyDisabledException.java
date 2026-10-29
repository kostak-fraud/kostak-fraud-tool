package com.kostak.fraud.simulation;

public final class SimulationGloballyDisabledException extends RuntimeException {

    public SimulationGloballyDisabledException() {
        super("Synthetic transaction generation is disabled for this environment");
    }
}
