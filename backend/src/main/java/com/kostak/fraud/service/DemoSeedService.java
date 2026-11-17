package com.kostak.fraud.service;

import com.kostak.fraud.repo.TransactionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class DemoSeedService implements ApplicationRunner {
    private final TransactionRepository transactions;
    private final GeneratorService generator;
    private final String tenantId;
    private final int seedCount;

    public DemoSeedService(TransactionRepository transactions, GeneratorService generator,
                           @Value("${kostak.tenant-id:demo-tenant}") String tenantId,
                           @Value("${kostak.seed-count:90}") int seedCount) {
        this.transactions = transactions;
        this.generator = generator;
        this.tenantId = tenantId;
        this.seedCount = seedCount;
    }

    @Override public void run(ApplicationArguments args) {
        if (seedCount > 0 && transactions.countByTenantId(tenantId) == 0) generator.generate(seedCount, null);
    }
}
