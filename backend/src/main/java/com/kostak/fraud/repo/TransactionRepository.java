package com.kostak.fraud.repo;

import com.kostak.fraud.domain.TransactionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface TransactionRepository extends JpaRepository<TransactionEntity, String>, JpaSpecificationExecutor<TransactionEntity> {
    long countByTenantId(String tenantId);
}

