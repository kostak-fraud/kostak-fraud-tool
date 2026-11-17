package com.kostak.fraud.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "rule_hits")
public class RuleHitEntity {
    @Id public String id;
    @Column(nullable = false) public String tenantId;
    @Column(nullable = false) public String transactionId;
    @Column(nullable = false) public String ruleId;
    @Column(nullable = false) public String ruleName;
    @Column(nullable = false) public int scoreContribution;
    @Column(nullable = false) public Instant matchedAt;

    public RuleHitEntity() {}
}

