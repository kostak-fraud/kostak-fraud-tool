package com.kostak.fraud.runtime;

public record DatabaseProbeResult(boolean available, String failureType) {

    public static DatabaseProbeResult up() {
        return new DatabaseProbeResult(true, "none");
    }

    public static DatabaseProbeResult down(Throwable failure) {
        String type = failure == null ? "unknown" : failure.getClass().getSimpleName();
        return new DatabaseProbeResult(false, type);
    }
}
