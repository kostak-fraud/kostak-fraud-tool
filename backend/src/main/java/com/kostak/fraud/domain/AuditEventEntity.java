package com.kostak.fraud.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "audit_events")
public class AuditEventEntity {
    @Id public String id;
    @Column(nullable = false) public String tenantId;
    @Column(nullable = false) public String transactionId;
    @Column(nullable = false) public String actor;
    @Column(nullable = false) public String action;
    @Column(nullable = false, length = 1000) public String detail;
    @Column(nullable = false) public Instant createdAt;

    public AuditEventEntity() {}
}
