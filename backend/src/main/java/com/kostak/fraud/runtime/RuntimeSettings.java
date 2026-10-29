package com.kostak.fraud.runtime;

import java.util.List;

public record RuntimeSettings(
        AppMode mode,
        String environment,
        String releaseSha,
        List<String> corsAllowedOrigins
) {

    public RuntimeSettings {
        corsAllowedOrigins = List.copyOf(corsAllowedOrigins);
    }
}
