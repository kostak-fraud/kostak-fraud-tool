package com.kostak.fraud.web;

import com.kostak.fraud.domain.Channel;
import com.kostak.fraud.service.GeneratorService;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/generator")
public class GeneratorController {
    private final GeneratorService service;
    public GeneratorController(GeneratorService service) { this.service = service; }

    @GetMapping("/status") public Map<String, Object> status() { return service.status(); }
    @PostMapping("/start") public Map<String, Object> start(@RequestParam(defaultValue = "2") int rate) { return service.start(rate); }
    @PostMapping("/stop") public Map<String, Object> stop() { return service.stop(); }
    @PostMapping("/generate") public Map<String, Object> generate(@RequestParam(defaultValue = "12") int count,
        @RequestParam(required = false) Channel channel) {
        return Map.of("generated", service.generate(count, channel).size());
    }
}

