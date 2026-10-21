# ADR-0002 — PostgreSQL Job/Outbox ile Asenkron Fraud Evaluation

**Status:** Accepted by HQ, 2026-10-21.

## Context

Mock transaction stream, gerçeğe yakın canlı skor ve güçlü zaman penceresi agregasyonları gerekiyor. İlk sürüm dağıtık platform operasyonuna ayrılacak zaman yok.

## Decision

API ve Worker aynı Java codebase'i paylaşır, ayrı Railway process olarak çalışır. Transaction + processing job aynı PostgreSQL transaction'ına kaydedilir; worker `FOR UPDATE SKIP LOCKED`, lease, retry ve idempotency ile claim eder. Rule AST tipli ve validate edilir; pencere/aggregate hesapları tenant/channel/anchor odaklı jOOQ + indeksli PostgreSQL sorgularıdır. UI canlı değişiklik için SSE; reconnect/fallback polling.

## Alternatives

- Kafka + Streams/Flink: Çok yüksek throughput ve stateful stream processing için güçlü; mevcut iki aylık hedefte fazla altyapı.
- Senkron HTTP transaction evaluation: ingest'i rule sorgu süresine bağımlı yapar.
- Ayrı Redis queue: ilk faz için üçüncü stateful sistem; PostgreSQL yeterliyken işletim yükü.

## Consequences

At-least-once delivery ve idempotent side effects zorunlu; backlog yükselirse job throughput, DB sorgu p95 ve worker CPU ölçülür. İleride queue/feature store değişebilir; saf RuleEvaluator kontratı korunur. **Yüksek hacimli production SLA'sı garanti edilmez.**

**Implementation source:** [`../ARCHITECTURE.md`](../ARCHITECTURE.md).
