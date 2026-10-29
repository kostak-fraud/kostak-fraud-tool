# UMDE / Bitirme Projesi — İlk Haftalık İlerleme Raporu (Güncel Taslak)

**Dönem:** 21–29 Ekim 2026.  
**Durum:** Kanıtlarla güncellenmiş taslak; teslim öncesi akademik rapor formatına göre düzenlenmelidir.

## 1. Proje ve motivasyon

Farklı ödeme işlem kanalları üzerinden akan sentetik olayların kural bazlı analiz edildiği, fraud operasyon ekibinin işlem inceleyebildiği ve kural yazabildiği bir akademik platform geliştiriliyor. Akademik teslim öncelikli; gelecekte çoklu ödeme kuruluşuna hizmet verebilecek mimari sınırlar hedefleniyor. Veri modeli gerçek ödeme kuruluşu şeması değildir.

## 2. Tamamlanan tasarım ve geliştirme işleri

- [x] Ürün modülleri, transaction lifecycle, analist tablosu, saved view, bulk action, detay ve edit-lock davranışları belgelendi.
- [x] Rule engine gereksinimleri, sentetik örnek kurallar, veri sözlüğü, mimari ADR'ler ve dependency-based backlog oluşturuldu.
- [x] FND-001: frontend/backend monorepo iskeleti tamamlandı.
- [x] FND-002: GitHub Actions kalite kapıları ve protected-main akışı tamamlandı.
- [x] UI-001: temel navigasyon ve kanal sekmeleri main'e alındı.
- [x] IAM-001: Supabase JWT doğrulama, tenant membership ve role/permission modeli main'e alındı.
- [x] TX-001: sentetik işlem şeması, Flyway V3 migration, kanal bazlı field registry ve filtre metadata endpoint'i main'e alındı.
- [x] PostgreSQL 17/18 Testcontainers migration testleri, transaction schema constraints, idempotency, exact-decimal ve index-plan smoke testleri başarılı.
- [x] Railway staging API ve Worker, aynı main revision bd3116a05895f73437bc673f8f5ca7cd9d2132a9 üzerinde Online (her biri 1/1 replica).
- [x] Supabase staging kostak_fraud schema'sında Flyway V3 başarıyla uygulandı.
- [x] Worker heartbeat aynı release SHA'yı ve db_status=UP durumunu doğruladı.

## 3. Mimari ve ortam durumu

Next.js 16 + TypeScript UI; Java 25 + Spring Boot 4.1.x modular monolith (API ve Worker); Supabase PostgreSQL/Auth; Vercel frontend; Railway staging API/Worker; GitHub Actions CI.

- Repo: https://github.com/kostak-fraud/kostak-fraud-tool
- TX-001 CI: https://github.com/kostak-fraud/kostak-fraud-tool/actions/runs/40815370153
- Railway staging API: https://kostak-fraud-staging.up.railway.app
- Staging revision: bd3116a05895f73437bc673f8f5ca7cd9d2132a9
- Staging Flyway schema version: 3

**Sınırlar:** Railway provider readiness check başarılıdır; bağımsız public /actuator/info exact-SHA smoke mevcut executor ortamındaki DNS erişim sorunu nedeniyle doğrulanamadı. Ayrı Railway production projesi henüz boş; production migration, deployment ve promotion yapılmadı. Vercel main production auto-deploy ve GitHub production release workflows güvenlik amacıyla kapalıdır.

## 4. Önümüzdeki iş paketleri

1. TX-002: seedli deterministic sentetik generator ve idempotent persistent ingestion.
2. TX-003: tenant/channel-scoped işlem listeleme API'si, server-side pagination ve stabil newest-first sıralama.
3. TX-004/TX-005: işlem grid'i, filtreleme ve detay rotası.
4. RULE-001 → RULE-003: versioned rule schema, evaluator ve zamansal COUNT/SUM koşulları.
5. INV-001 → INV-003: işlem detay incelemesi, atomik edit lease, kararlar, yorumlar ve audit.
6. FND-003 production hazırlığı ayrı güvenlik/operasyon işi olarak devam eder; ürün geliştirmesini bloklamaz.

## 5. Açık riskler

- Sentetik alan sözlüğü tasarım varsayımıdır; gerçek kurum alan adları gelirse DATA-REVIEW gerekir.
- Public HTTP /actuator/info exact-SHA smoke için DNS erişimli runner gerekir.
- Production DB role/password, Railway production servisleri ve kontrollü release orchestration henüz kurulmamıştır.
- Zamansal aggregate performansı ve eşzamanlı investigation lease davranışı sonraki testlerle kanıtlanmalıdır.

## 6. Akademik dürüstlük notu

Bu rapor staging'in çalıştığını ve TX-001'in test/merge/migration kanıtlarını ayırarak kaydeder. Production deployment, tam işlem API'si, generator, rule engine veya investigation akışları tamamlandı olarak sunulmamalıdır; bunlar ilgili ticket'ların kabul kriterleri geçtikçe işaretlenir.
