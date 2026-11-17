package com.kostak.fraud.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kostak.fraud.domain.*;
import com.kostak.fraud.repo.*;
import jakarta.persistence.criteria.Predicate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

@Service
public class TransactionService {
    private final TransactionRepository transactions;
    private final RuleHitRepository hits;
    private final CommentRepository comments;
    private final AuditEventRepository audits;
    private final ObjectMapper objectMapper;
    private final String tenantId;

    public TransactionService(TransactionRepository transactions, RuleHitRepository hits,
                              CommentRepository comments, AuditEventRepository audits, ObjectMapper objectMapper,
                              @Value("${kostak.tenant-id:demo-tenant}") String tenantId) {
        this.transactions = transactions;
        this.hits = hits;
        this.comments = comments;
        this.audits = audits;
        this.objectMapper = objectMapper;
        this.tenantId = tenantId;
    }

    @Transactional(readOnly = true)
    public Page<TransactionEntity> list(Channel channel, ReviewStatus status, Integer minScore,
                                        String search, String filtersJson, int page, int size) {
        Specification<TransactionEntity> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("tenantId"), tenantId));
            if (channel != null) predicates.add(cb.equal(root.get("channel"), channel));
            if (status != null) predicates.add(cb.equal(root.get("reviewStatus"), status));
            if (minScore != null) predicates.add(cb.greaterThanOrEqualTo(root.get("riskScore"), minScore));
            if (search != null && !search.isBlank()) {
                String q = "%" + search.toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("id")), q),
                    cb.like(cb.lower(root.get("customerRef")), q),
                    cb.like(cb.lower(root.get("merchantRef")), q),
                    cb.like(cb.lower(root.get("cardRef")), q)
                ));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        List<ColumnFilter> columnFilters = parseFilters(filtersJson);
        List<TransactionEntity> filtered = transactions.findAll(spec, Sort.by(Sort.Direction.DESC, "occurredAt"))
            .stream().filter(tx -> columnFilters.stream().allMatch(filter -> matches(tx, filter))).toList();
        int safeSize = Math.min(Math.max(size, 1), 100);
        int safePage = Math.max(0, page);
        int from = Math.min(safePage * safeSize, filtered.size());
        int to = Math.min(from + safeSize, filtered.size());
        return new PageImpl<>(filtered.subList(from, to), PageRequest.of(safePage, safeSize), filtered.size());
    }

    private List<ColumnFilter> parseFilters(String filtersJson) {
        if (filtersJson == null || filtersJson.isBlank()) return List.of();
        try {
            List<ColumnFilter> filters = objectMapper.readValue(filtersJson, new TypeReference<>() {});
            if (filters.size() > 30) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "En fazla 30 kolon filtresi kullanılabilir");
            return filters;
        } catch (JsonProcessingException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kolon filtreleri okunamadı");
        }
    }

    private boolean matches(TransactionEntity tx, ColumnFilter filter) {
        Set<String> fields = Set.of("id", "occurredAt", "customerRef", "instrument", "counterparty", "transactionType",
            "amount", "currency", "merchantRisk", "threeDs", "riskScore", "reviewStatus", "assignedAnalyst", "paymentBlocked");
        if (filter == null || !fields.contains(filter.field()) || filter.operator() == null || filter.value() == null || filter.value().length() > 200)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Geçersiz kolon filtresi");
        Object actual = switch (filter.field()) {
            case "id" -> tx.id;
            case "occurredAt" -> tx.occurredAt;
            case "customerRef" -> tx.customerRef;
            case "instrument" -> tx.cardRef != null ? tx.cardRef : tx.senderRef;
            case "counterparty" -> tx.merchantRef != null ? tx.merchantRef : tx.receiverRef;
            case "transactionType" -> tx.transactionType;
            case "amount" -> tx.amount;
            case "currency" -> tx.currency;
            case "merchantRisk" -> tx.merchantRisk;
            case "threeDs" -> tx.threeDs;
            case "riskScore" -> tx.riskScore;
            case "reviewStatus" -> tx.reviewStatus;
            case "assignedAnalyst" -> tx.assignedAnalyst;
            case "paymentBlocked" -> tx.paymentBlocked;
            default -> null;
        };
        if (actual instanceof Number || actual instanceof java.math.BigDecimal) {
            try { return compare(new java.math.BigDecimal(actual.toString()).compareTo(new java.math.BigDecimal(filter.value())), filter.operator()); }
            catch (NumberFormatException ex) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sayısal filtre değeri geçersiz"); }
        }
        if (actual instanceof Instant instant) {
            try { return compare(instant.compareTo(Instant.parse(filter.value())), filter.operator()); }
            catch (RuntimeException ex) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tarih filtresi geçersiz"); }
        }
        String left = String.valueOf(actual == null ? "" : actual).toLowerCase(Locale.ROOT);
        String right = filter.value().toLowerCase(Locale.ROOT);
        return switch (filter.operator()) {
            case "EQ" -> left.equals(right);
            case "NE" -> !left.equals(right);
            case "CONTAINS" -> left.contains(right);
            case "STARTS_WITH" -> left.startsWith(right);
            case "ENDS_WITH" -> left.endsWith(right);
            case "REGEX" -> regex(actual, filter.value());
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bu alan için operatör desteklenmiyor");
        };
    }

    private boolean compare(int comparison, String operator) {
        return switch (operator) {
            case "EQ" -> comparison == 0;
            case "NE" -> comparison != 0;
            case "GT" -> comparison > 0;
            case "GTE" -> comparison >= 0;
            case "LT" -> comparison < 0;
            case "LTE" -> comparison <= 0;
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Karşılaştırma operatörü geçersiz");
        };
    }

    private boolean regex(Object actual, String expression) {
        if (expression.length() > 120) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Regex en fazla 120 karakter olabilir");
        try { return Pattern.compile(expression, Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE).matcher(String.valueOf(actual == null ? "" : actual)).find(); }
        catch (PatternSyntaxException ex) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Regex ifadesi geçersiz"); }
    }

    @Transactional
    public TransactionDetail detail(String id, String user, boolean claim) {
        TransactionEntity tx = require(id);
        boolean finalStatus = tx.reviewStatus == ReviewStatus.FRAUD || tx.reviewStatus == ReviewStatus.NOT_FRAUD;
        Instant now = Instant.now();
        boolean free = tx.lockOwner == null || tx.lockExpiresAt == null || tx.lockExpiresAt.isBefore(now) || tx.lockOwner.equals(user);
        if (claim && !finalStatus && free && canEdit(user)) {
            boolean firstClaim = !user.equals(tx.lockOwner);
            tx.lockOwner = user;
            tx.lockExpiresAt = now.plus(5, ChronoUnit.MINUTES);
            tx.assignedAnalyst = user;
            tx.reviewStatus = ReviewStatus.IN_REVIEW;
            transactions.save(tx);
            if (firstClaim) audit(tx, user, "ASSIGNED", "İşlem inceleme için atandı");
        }
        return assemble(tx, user);
    }

    @Transactional
    public TransactionDetail comment(String id, String user, String content) {
        TransactionEntity tx = requireEditable(id, user);
        if (content == null || content.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Yorum boş olamaz");
        CommentEntity comment = new CommentEntity();
        comment.id = UUID.randomUUID().toString();
        comment.tenantId = tenantId;
        comment.transactionId = id;
        comment.author = user;
        comment.content = content.trim();
        comment.createdAt = Instant.now();
        comments.save(comment);
        audit(tx, user, "COMMENT_ADDED", content.trim());
        return assemble(tx, user);
    }

    @Transactional
    public TransactionDetail decide(String id, String user, ReviewStatus status) {
        if (!Set.of(ReviewStatus.FRAUD, ReviewStatus.NOT_FRAUD, ReviewStatus.ON_HOLD).contains(status))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Geçersiz karar");
        TransactionEntity tx = requireEditable(id, user);
        tx.reviewStatus = status;
        tx.decisionBy = user;
        if (status != ReviewStatus.ON_HOLD) {
            tx.lockOwner = null;
            tx.lockExpiresAt = null;
        }
        transactions.save(tx);
        audit(tx, user, "DECISION", status.name());
        return assemble(tx, user);
    }

    @Transactional
    public int bulkDecision(List<String> ids, String user, ReviewStatus status) {
        if (ids == null || ids.isEmpty() || ids.size() > 100)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "1-100 işlem ID'si gerekli");
        if (!Set.of(ReviewStatus.FRAUD, ReviewStatus.NOT_FRAUD).contains(status))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Toplu karar yalnız Fraud/Not Fraud olabilir");
        int updated = 0;
        for (String id : ids) {
            TransactionEntity tx = require(id);
            boolean lockedByOther = tx.lockOwner != null && tx.lockExpiresAt != null && tx.lockExpiresAt.isAfter(Instant.now()) && !tx.lockOwner.equals(user);
            if (lockedByOther || !canEdit(user)) continue;
            tx.reviewStatus = status;
            tx.decisionBy = user;
            tx.assignedAnalyst = user;
            tx.lockOwner = null;
            tx.lockExpiresAt = null;
            transactions.save(tx);
            audit(tx, user, "BULK_DECISION", status.name());
            updated++;
        }
        return updated;
    }

    private TransactionEntity require(String id) {
        return transactions.findById(id).filter(t -> tenantId.equals(t.tenantId))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "İşlem bulunamadı"));
    }

    private TransactionEntity requireEditable(String id, String user) {
        if (!canEdit(user)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu kullanıcı salt okunur");
        TransactionEntity tx = require(id);
        boolean lockedByOther = tx.lockOwner != null && tx.lockExpiresAt != null && tx.lockExpiresAt.isAfter(Instant.now()) && !tx.lockOwner.equals(user);
        if (lockedByOther) throw new ResponseStatusException(HttpStatus.CONFLICT, "İşlem başka bir analist tarafından inceleniyor");
        tx.lockOwner = user;
        tx.lockExpiresAt = Instant.now().plus(5, ChronoUnit.MINUTES);
        tx.assignedAnalyst = user;
        return tx;
    }

    private boolean canEdit(String user) { return user != null && !user.equalsIgnoreCase("viewer") && !user.equalsIgnoreCase("rule.author"); }

    private TransactionDetail assemble(TransactionEntity tx, String user) {
        boolean editable = canEdit(user) && (tx.lockOwner == null || tx.lockExpiresAt == null || tx.lockExpiresAt.isBefore(Instant.now()) || user.equals(tx.lockOwner));
        return new TransactionDetail(tx,
            hits.findAllByTenantIdAndTransactionIdOrderByScoreContributionDesc(tenantId, tx.id),
            comments.findAllByTenantIdAndTransactionIdOrderByCreatedAtAsc(tenantId, tx.id),
            audits.findAllByTenantIdAndTransactionIdOrderByCreatedAtDesc(tenantId, tx.id), editable);
    }

    private void audit(TransactionEntity tx, String actor, String action, String detail) {
        AuditEventEntity event = new AuditEventEntity();
        event.id = UUID.randomUUID().toString();
        event.tenantId = tenantId;
        event.transactionId = tx.id;
        event.actor = actor;
        event.action = action;
        event.detail = detail;
        event.createdAt = Instant.now();
        audits.save(event);
    }

    public record TransactionDetail(TransactionEntity transaction, List<RuleHitEntity> ruleHits,
                                    List<CommentEntity> comments, List<AuditEventEntity> auditTrail,
                                    boolean editable) {}
    public record ColumnFilter(String field, String operator, String value) {}
}

