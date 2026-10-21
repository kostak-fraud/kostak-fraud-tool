# ADR-0001 — JVM Backend + Relational Data Core

**Status:** Accepted by HQ, 2026-10-21.

## Context

Ürün transaction-intensive, SQL window/aggregate sorgulu, tutarlı skor/state değişimli, eşzamanlı analist erişimli bir platform. 2 ayda akademik MVP ve ticarileşebilir temel gerekiyor.

## Decision

Java 25 LTS / Spring Boot 4.1.x tabanlı **modular monolith**, Spring Security, jOOQ ve PostgreSQL. Veritabanı şema değişikliklerinde Flyway. Auth Supabase, DB Supabase. Uygulama seviyesinde tenancy ve mümkün olduğunda RLS defense-in-depth.

## Alternatives

- Python/FastAPI: Gerçek üretim kullanımı mümkün; bu işin transaction ve SQL ağırlıklı çekirdeği için Java/Spring'e göre daha az tercih edildi. Python kategorik olarak güvensiz değildir.
- Node/NestJS: TypeScript ortaklığı avantajlı; seçilen ekip/ajan çalışmasında iş kuralı/test disiplini için JVM standartlarına öncelik verildi.
- JPA/Hibernate: basit CRUD'da yararlı; yoğun programatik SQL/agregasyon için jOOQ daha doğrudan.
- Event microservices: 2 aylık MVP'de gereksiz operasyon yükü.

## Consequences

Artılar: transaction sınırları, güvenlik/migration/test ekosistemi, SQL görünürlüğü, modül sınırları. Eksiler: Java build/runtime daha ağır; jOOQ schema/codegen kurulumuna disiplin gerekir; SQL sorgularını ölçmeden büyük hacim garantisi verilemez. İlk entegrasyon ticket'ında uyumluluk ve hosting kanıtlanmalı.

**Implementation source:** [`../TECH_STACK.md`](../TECH_STACK.md), [`../ARCHITECTURE.md`](../ARCHITECTURE.md).
