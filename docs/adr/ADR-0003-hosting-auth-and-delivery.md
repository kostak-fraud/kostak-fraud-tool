# ADR-0003 — Vercel + Railway + Supabase ve Protected Main

**Status:** Accepted by HQ, 2026-10-21.

## Context

Her `main` merge canlıda görülebilmeli; JVM sürekli çalışan API/worker, Vercel web ve Supabase DB/Auth farklı runtime'lar gerektiriyor. Çoklu tenant ve yetki sınırı backend'de olmalı.

## Decision

Next.js web Vercel'de; Java API ve Worker Railway'de; PostgreSQL/Auth Supabase'te. Tek GitHub monorepo ve required GitHub Actions CI. PR preview production DB erişimi kullanamaz. User identity Supabase Auth JWT, permission/tenant kontrolü Spring backend'de. Schema migration versioned Flyway release step ve smoke kontrolü sonrası ticket biter.

## Alternatives

- Tüm backend'i Vercel Functions içine koymak: Java always-on worker/long-running API ihtiyacıyla uyumsuz, Vercel'in resmi runtime'ları arasında JVM yok.
- Supabase Edge Functions ile bütün logic: rule SQL/evaluation için seçilen Java domain modelini çoğaltır.
- AWS ECS/EKS/Kubernetes: ürün olgunlaştığında değerlendirilebilir; ilk iki ay operasyon maliyeti yüksek.

## Consequences

Üç sağlayıcı ve iki deployment servisi yönetimi, ağ gecikmesi, maliyet ve secrets disiplini gerekir. Aynı/uygun bölge seçimi, connection pool sizing, migration sıra kontrolü ve gerçek smoke test önemlidir. Ticari compliance sertifikası/finansal regülasyon uyumluluğu bu hosting kararıyla kendiliğinden oluşmaz.

**Implementation source:** [`../TECH_STACK.md`](../TECH_STACK.md), [`../ARCHITECTURE.md`](../ARCHITECTURE.md).
