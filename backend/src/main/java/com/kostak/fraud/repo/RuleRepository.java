package com.kostak.fraud.repo;

import com.kostak.fraud.domain.Channel;
import com.kostak.fraud.domain.RuleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RuleRepository extends JpaRepository<RuleEntity, String> {
    List<RuleEntity> findAllByTenantIdOrderByUpdatedAtDesc(String tenantId);
    List<RuleEntity> findAllByTenantIdAndChannelAndActiveTrue(String tenantId, Channel channel);
}

