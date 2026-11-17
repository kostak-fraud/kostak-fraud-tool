package com.kostak.fraud.web;

import com.kostak.fraud.domain.RuleEntity;
import com.kostak.fraud.service.RuleService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/rules")
public class RuleController {
    private final RuleService service;
    public RuleController(RuleService service) { this.service = service; }

    @GetMapping public List<RuleEntity> list() { return service.list(); }
    @PostMapping public RuleEntity create(@RequestBody RuleService.RuleInput input) { return service.create(input); }
    @PutMapping("/{id}") public RuleEntity update(@PathVariable String id, @RequestBody RuleService.RuleInput input) { return service.update(id, input); }
    @PostMapping("/{id}/toggle") public RuleEntity toggle(@PathVariable String id) { return service.toggle(id); }
}

