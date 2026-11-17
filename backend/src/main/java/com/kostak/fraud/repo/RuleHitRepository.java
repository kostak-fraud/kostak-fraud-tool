package com.kostak.fraud.repo;

import com.kostak.fraud.domain.RuleHitEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RuleHitRepository extends JpaRepository<RuleHitEntity, String> {
    List<RuleHitEntity> findAllByTenantIdAndTransactionIdOrderByScoreContributionDesc(String tenantId, String transactionId);
    void deleteAllByTenantIdAndTransactionId(String tenantId, String transactionId);
}

