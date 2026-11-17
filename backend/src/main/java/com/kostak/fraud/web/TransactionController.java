package com.kostak.fraud.web;

import com.kostak.fraud.domain.*;
import com.kostak.fraud.service.TransactionService;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {
    private final TransactionService service;
    public TransactionController(TransactionService service) { this.service = service; }

    @GetMapping
    public Page<TransactionEntity> list(@RequestParam(required = false) Channel channel,
                                        @RequestParam(required = false) ReviewStatus status,
                                        @RequestParam(required = false) Integer minScore,
                                        @RequestParam(required = false) String search,
                                        @RequestParam(required = false) String filters,
                                        @RequestParam(defaultValue = "0") int page,
                                        @RequestParam(defaultValue = "20") int size) {
        return service.list(channel, status, minScore, search, filters, page, size);
    }

    @GetMapping("/{id}")
    public TransactionService.TransactionDetail detail(@PathVariable String id,
        @RequestHeader(value = "X-Demo-User", defaultValue = "analyst.one") String user,
        @RequestParam(defaultValue = "true") boolean claim) {
        return service.detail(id, user, claim);
    }

    @PostMapping("/{id}/comments")
    public TransactionService.TransactionDetail comment(@PathVariable String id,
        @RequestHeader(value = "X-Demo-User", defaultValue = "analyst.one") String user,
        @RequestBody CommentRequest request) {
        return service.comment(id, user, request.content());
    }

    @PostMapping("/{id}/decision")
    public TransactionService.TransactionDetail decide(@PathVariable String id,
        @RequestHeader(value = "X-Demo-User", defaultValue = "analyst.one") String user,
        @RequestBody DecisionRequest request) {
        return service.decide(id, user, request.status());
    }

    @PostMapping("/bulk-decision")
    public Map<String, Integer> bulk(@RequestHeader(value = "X-Demo-User", defaultValue = "analyst.one") String user,
                                    @RequestBody BulkDecisionRequest request) {
        return Map.of("updated", service.bulkDecision(request.ids(), user, request.status()));
    }

    public record CommentRequest(String content) {}
    public record DecisionRequest(ReviewStatus status) {}
    public record BulkDecisionRequest(List<String> ids, ReviewStatus status) {}
}

