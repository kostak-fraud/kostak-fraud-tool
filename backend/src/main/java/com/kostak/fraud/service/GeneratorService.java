package com.kostak.fraud.service;

import com.kostak.fraud.domain.*;
import com.kostak.fraud.repo.TransactionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class GeneratorService {
    private final TransactionRepository transactions;
    private final RuleEngineService engine;
    private final String tenantId;
    private final AtomicBoolean running = new AtomicBoolean(false);
    private volatile int ratePerTick = 2;
    private final Random random = new Random();

    public GeneratorService(TransactionRepository transactions, RuleEngineService engine,
                            @Value("${kostak.tenant-id:demo-tenant}") String tenantId) {
        this.transactions = transactions;
        this.engine = engine;
        this.tenantId = tenantId;
    }

    @Scheduled(fixedDelay = 1500)
    public void tick() {
        if (running.get()) generate(ratePerTick, null);
    }

    @Transactional
    public List<TransactionEntity> generate(int count, Channel fixedChannel) {
        int safeCount = Math.max(1, Math.min(count, 250));
        List<TransactionEntity> result = new ArrayList<>();
        for (int i = 0; i < safeCount; i++) {
            TransactionEntity tx = build(fixedChannel == null ? Channel.values()[random.nextInt(3)] : fixedChannel, i == 0);
            transactions.save(tx);
            engine.evaluate(tx);
            result.add(transactions.save(tx));
        }
        return result;
    }

    public Map<String, Object> start(int rate) {
        ratePerTick = Math.max(1, Math.min(rate, 20));
        running.set(true);
        return status();
    }

    public Map<String, Object> stop() { running.set(false); return status(); }
    public Map<String, Object> status() { return Map.of("running", running.get(), "rate", ratePerTick); }

    private TransactionEntity build(Channel channel, boolean forceSuspicious) {
        TransactionEntity tx = new TransactionEntity();
        tx.id = UUID.randomUUID().toString();
        tx.tenantId = tenantId;
        tx.channel = channel;
        tx.occurredAt = Instant.now().minusSeconds(random.nextInt(1800));
        tx.currency = random.nextDouble() < .92 ? "TRY" : "USD";
        tx.customerRef = "CUS-" + String.format("%05d", random.nextInt(500));
        tx.senderRef = "ACC-" + String.format("%05d", random.nextInt(700));
        tx.receiverRef = "ACC-" + String.format("%05d", random.nextInt(700));
        tx.riskScore = 0;
        tx.reviewStatus = ReviewStatus.NOT_FRAUD;
        tx.decisionBy = "System";
        tx.paymentBlocked = false;

        boolean suspicious = forceSuspicious || random.nextDouble() < .22;
        if (channel == Channel.WALLET) {
            tx.transactionType = random.nextBoolean() ? "WALLET_TRANSFER" : "CASH_IN";
            tx.amount = money(suspicious ? between(15000, 45000) : between(50, 9000));
        } else {
            tx.cardRef = "CARD-" + String.format("%04d", random.nextInt(300));
            tx.merchantRef = "MER-" + String.format("%04d", random.nextInt(120));
            tx.merchantRisk = suspicious ? MerchantRisk.HIGH : MerchantRisk.values()[random.nextInt(3)];
            tx.threeDs = !suspicious && random.nextDouble() < .78;
            tx.amount = money(suspicious ? between(8000, 35000) : between(25, 12000));
            if (channel == Channel.POS) tx.transactionType = "ECOM_PURCHASE";
            else {
                tx.transactionType = "TERMINAL_PURCHASE";
                tx.terminalRef = "TERM-" + String.format("%04d", random.nextInt(160));
            }
        }
        return tx;
    }

    private double between(double min, double max) { return ThreadLocalRandom.current().nextDouble(min, max); }
    private BigDecimal money(double value) { return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP); }
}

