package com.kostak.fraud.service;

import com.kostak.fraud.domain.*;
import com.kostak.fraud.repo.RuleRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.*;

@Service
public class RuleService {
    private static final Set<String> FIELDS = Set.of("amount", "currency", "merchantRisk", "threeDs", "transactionType", "merchantRef", "customerRef");
    private final RuleRepository rules;
    private final String tenantId;

    public RuleService(RuleRepository rules, @Value("${kostak.tenant-id:demo-tenant}") String tenantId) {
        this.rules = rules;
        this.tenantId = tenantId;
    }

    @Transactional(readOnly = true)
    public List<RuleEntity> list() { return rules.findAllByTenantIdOrderByUpdatedAtDesc(tenantId); }

    @Transactional
    public RuleEntity create(RuleInput input) {
        validate(input);
        RuleEntity rule = new RuleEntity();
        rule.id = UUID.randomUUID().toString();
        rule.tenantId = tenantId;
        apply(rule, input);
        rule.version = 1;
        rule.createdAt = Instant.now();
        rule.updatedAt = rule.createdAt;
        return rules.save(rule);
    }

    @Transactional
    public RuleEntity update(String id, RuleInput input) {
        validate(input);
        RuleEntity rule = rules.findById(id).filter(r -> tenantId.equals(r.tenantId))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Kural bulunamad�"));
        apply(rule, input);
        rule.version++;
        rule.updatedAt = Instant.now();
        return rules.save(rule);
    }

    @Transactional
    public RuleEntity toggle(String id) {
        RuleEntity rule = rules.findById(id).filter(r -> tenantId.equals(r.tenantId))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Kural bulunamad�"));
        rule.active = !rule.active;
        rule.version++;
        rule.updatedAt = Instant.now();
        return rules.save(rule);
    }

    private void validate(RuleInput input) {
        if (input.name() == null || input.name().isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kural ad� gerekli");
        if (!FIELDS.contains(input.fieldName())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Desteklenmeyen alan");
        if (input.scoreContribution() < 1 || input.scoreContribution() > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Puan 1-100 olmal�");
        if (input.expectedValue() == null || input.expectedValue().isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kar��la�t�rma de�eri gerekli");
    }

    private void apply(RuleEntity rule, RuleInput input) {
        rule.name = input.name().trim();
        rule.description = input.description() == null ? "" : input.description().trim();
        rule.channel = input.channel();
        rule.fieldName = input.fieldName();
        rule.operator = input.operator();
        rule.expectedValue = input.expectedValue().trim();
        rule.scoreContribution = input.scoreContribution();
        rule.active = input.active();
    }

    public record RuleInput(String name, String description, Channel channel, String fieldName,
                            RuleOperator operator, String expectedValue, int scoreContribution,
                            boolean active) {}
}

