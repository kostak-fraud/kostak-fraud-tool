package com.kostak.fraud.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "transactions")
public class TransactionEntity {
    @Id public String id;
    @Column(nullable = false) public String tenantId;
    @Enumerated(EnumType.STRING) @Column(nullable = false) public Channel channel;
    @Column(nullable = false) public Instant occurredAt;
    @Column(nullable = false, precision = 18, scale = 2) public BigDecimal amount;
    @Column(nullable = false) public String currency;
    @Column(nullable = false) public String customerRef;
    public String senderRef;
    public String receiverRef;
    public String cardRef;
    public String merchantRef;
    @Enumerated(EnumType.STRING) public MerchantRisk merchantRisk;
    public String terminalRef;
    @Column(nullable = false) public String transactionType;
    @Column(nullable = false) public boolean threeDs;
    @Column(nullable = false) public int riskScore;
    @Enumerated(EnumType.STRING) @Column(nullable = false) public ReviewStatus reviewStatus;
    @Column(nullable = false) public String decisionBy;
    public String assignedAnalyst;
    @Column(nullable = false) public boolean paymentBlocked;
    public String lockOwner;
    public Instant lockExpiresAt;

    public TransactionEntity() {}
}

