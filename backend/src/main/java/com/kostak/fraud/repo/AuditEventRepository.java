package com.kostak.fraud.repo;

import com.kostak.fraud.domain.AuditEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AuditEventRepository extends JpaRepository<AuditEventEntity, String> {
    List<AuditEventEntity> findAllByTenantIdAndTransactionIdOrderByCreatedAtDesc(String tenantId, String transactionId);
}

