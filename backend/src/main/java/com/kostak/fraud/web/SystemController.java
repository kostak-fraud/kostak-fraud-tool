package com.kostak.fraud.web;

import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class SystemController {
    @GetMapping("/health") public Map<String, Object> health() {
        return Map.of("status", "UP", "service", "kostak-fraud-api", "time", Instant.now());
    }
}
