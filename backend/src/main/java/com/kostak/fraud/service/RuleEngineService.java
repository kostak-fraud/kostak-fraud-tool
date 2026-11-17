package com.kostak.fraud.service;

import com.kostak.fraud.domain.*;
import com.kostak.fraud.repo.RuleHitRepository;
import com.kostak.fraud.repo.RuleRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service
public class RuleEngineService {
    private final RuleRepository rules;
    private final RuleHitRepository hits;
    private final int threshold;

    public RuleEngineService(RuleRepository rules, RuleHitRepository hits,
                             @Value("${kostak.review-threshold:60}") int threshold) {
        this.rules = rules;
        this.hits = hits;
        this.threshold = threshold;
    }

    @Transactional
    public void evaluate(TransactionEntity tx) {
        hits.deleteAllByTenantIdAndTransactionId(tx.tenantId, tx.id);
        int score = 0;
        for (RuleEntity rule : rules.findAllByTenantIdAndChannelAndActiveTrue(tx.tenantId, tx.channel)) {
            if (matches(tx, rule)) {
                score += rule.scoreContribution;
                RuleHitEntity hit = new RuleHitEntity();
                hit.id = UUID.randomUUID().toString();
                hit.tenantId = tx.tenantId;
                hit.transactionId = tx.id;
                hit.ruleId = rule.id;
                hit.ruleName = rule.name;
                hit.scoreContribution = rule.scoreContribution;
                hit.matchedAt = Instant.now();
                hits.save(hit);
            }
        }
        tx.riskScore = Math.min(100, score);
        tx.paymentBlocked = tx.riskScore == 100;
        tx.reviewStatus = tx.riskScore >= threshold ? ReviewStatus.WAITING_FOR_REVIEW : ReviewStatus.NOT_FRAUD;
        tx.decisionBy = "System";
    }

    private boolean matches(TransactionEntity tx, RuleEntity rule) {
        Object actual = switch (rule.fieldName) {
            case "amount" -> tx.amount;
            case "currency" -> tx.currency;
            case "merchantRisk" -> tx.merchantRisk;
            case "threeDs" -> tx.threeDs;
            case "transactionType" -> tx.transactionType;
            case "merchantRef" -> tx.merchantRef;
            case "customerRef" -> tx.customerRef;
            default -> null;
        };
        if (actual == null) return false;
        if (actual instanceof BigDecimal number) {
            int cmp;
            try { cmp = number.compareTo(new BigDecimal(rule.expectedValue)); }
            catch (NumberFormatException ex) { return false; }
            return compare(cmp, rule.operator);
        }
        String left = String.valueOf(actual);
        int cmp = left.compareToIgnoreCase(rule.expectedValue);
        return rule.operator == RuleOperator.CONTAINS
            ? left.toLowerCase(Locale.ROOT).contains(rule.expectedValue.toLowerCase(Locale.ROOT))
            : compare(cmp, rule.operator);
    }

    private boolean compare(int cmp, RuleOperator op) {
        return switch (op) {
            case EQ -> cmp == 0;
            case NE -> cmp != 0;
            case GT -> cmp > 0;
            case GTE -> cmp >= 0;
            case LT -> cmp < 0;
            case LTE -> cmp <= 0;
            case CONTAINS -> false;
        };
    }
}

