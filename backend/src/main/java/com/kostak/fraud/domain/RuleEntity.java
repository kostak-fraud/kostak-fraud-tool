package com.kostak.fraud.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "rules")
public class RuleEntity {
    @Id public String id;
    @Column(nullable = false) public String tenantId;
    @Column(nullable = false) public String name;
    @Column(nullable = false, length = 1000) public String description;
    @Enumerated(EnumType.STRING) @Column(nullable = false) public Channel channel;
    @Column(nullable = false) public String fieldName;
    @Enumerated(EnumType.STRING) @Column(nullable = false) public RuleOperator operator;
    @Column(nullable = false) public String expectedValue;
    @Column(nullable = false) public int scoreContribution;
    @Column(nullable = false) public boolean active;
    @Column(nullable = false) public int version;
    @Column(nullable = false) public Instant createdAt;
    @Column(nullable = false) public Instant updatedAt;

    public RuleEntity() {}
    public RuleEntity(String id) { this.id = id; }
}

