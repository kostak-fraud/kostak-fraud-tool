package com.kostak.fraud.repo;

import com.kostak.fraud.domain.CommentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CommentRepository extends JpaRepository<CommentEntity, String> {
    List<CommentEntity> findAllByTenantIdAndTransactionIdOrderByCreatedAtAsc(String tenantId, String transactionId);
}

