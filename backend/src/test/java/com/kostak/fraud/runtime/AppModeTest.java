package com.kostak.fraud.runtime;

import org.junit.jupiter.api.Test;
import org.springframework.boot.WebApplicationType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

class AppModeTest {

    @Test
    void parsesSupportedModesCaseInsensitively() {
        assertThat(AppMode.parse("api")).isEqualTo(AppMode.API);
        assertThat(AppMode.parse(" WORKER ")).isEqualTo(AppMode.WORKER);
        assertThat(AppMode.parse("MIGRATE")).isEqualTo(AppMode.MIGRATE);
        assertThat(AppMode.API.webApplicationType()).isEqualTo(WebApplicationType.SERVLET);
        assertThat(AppMode.WORKER.webApplicationType()).isEqualTo(WebApplicationType.NONE);
    }

    @Test
    void rejectsMissingOrUnknownMode() {
        assertThatIllegalArgumentException().isThrownBy(() -> AppMode.parse(null));
        assertThatIllegalArgumentException().isThrownBy(() -> AppMode.parse(""));
        assertThatIllegalArgumentException().isThrownBy(() -> AppMode.parse("batch"));
    }
}
