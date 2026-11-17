package com.kostak.fraud.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "transaction_comments")
public class CommentEntity {
    @Id public String id;
    @Column(nullable = false) public String tenantId;
    @Column(nullable = false) public String transactionId;
    @Column(nullable = false) public String author;
    @Column(nullable = false, length = 2000) public String content;
    @Column(nullable = false) public Instant createdAt;

    public CommentEntity() {}
}

