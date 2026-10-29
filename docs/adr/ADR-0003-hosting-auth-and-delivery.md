# ADR-0003 — Vercel + Northflank + Supabase ve Protected Main

**Status:** Accepted by HQ, 2026-10-21; amended by HQ, 2026-10-29.

## Context

Her `main` merge hedef ortamda izlenebilir olmalı; JVM sürekli çalışan API/worker, tek seferlik schema migration, Vercel web ve Supabase DB/Auth farklı runtime/lifecycle gerektiriyor. Çoklu tenant ve yetki sınırı backend'de olmalı. Developer Sandbox kaynak sınırları nedeniyle API ve Worker iki sürekli service slotunun tamamını kullanır; staging için eşzamanlı ikinci API/Worker çifti varsayılamaz.

## Decision

Next.js web Vercel'de; Java API ve Worker iki ayrı Northflank servisinde; PostgreSQL/Auth Supabase'te çalışır. API, Worker ve migration aynı immutable backend image/revision kullanır: `APP_MODE=api`, `worker`, `migrate`. Flyway yalnız explicit migration job'da çalışır; job başarıyla bitmeden API/Worker rollout yapılmaz.

Tek GitHub monorepo ve required GitHub Actions CI kullanılır. PR preview production DB/API'ye erişemez veya sessiz fallback yapamaz. User identity Supabase Auth JWT'dir; permission/tenant kontrolü Spring backend'de kalır. FND-003 yalnız auth environment sözleşmesini hazırlar, JWT doğrulama/authorization IAM-001 kapsamındadır. Ticket ancak main merge, gerçek provider rollout, schema version ve smoke kanıtından sonra biter.

### 2026-10-29 değişiklik kaydı

ADR'nin 2026-10-21 sürümü Java API/Worker için Railway'i seçmişti. HQ, 2026-10-29'da aktif hosting hedefini Northflank olarak değiştirdi. Vercel, Supabase, protected main, ayrı sürekli API/Worker, explicit Flyway release step ve backend-authoritative auth sınırları değişmedi. Railway artık aktif karar değildir; sağlayıcı değişikliğinin karşılaştırmalı ürün gerekçesi ayrıca verilmediği için bu ADR yeni bir gerekçe uydurmaz.

## Alternatives

- Tüm backend'i Vercel Functions içine koymak: Java always-on worker/long-running API ihtiyacıyla uyumsuz, Vercel'in resmi runtime'ları arasında JVM yok.
- Supabase Edge Functions ile bütün logic: rule SQL/evaluation için seçilen Java domain modelini çoğaltır.
- Railway: 2026-10-21 kararında seçilmişti; 2026-10-29 HQ kararıyla Northflank tarafından supersede edildi.
- AWS ECS/EKS/Kubernetes: ürün olgunlaştığında değerlendirilebilir; ilk iki ay operasyon maliyeti yüksek.

## Consequences

Üç sağlayıcı, iki sürekli service ve migration/smoke job yönetimi; ağ gecikmesi, maliyet/kota ve secrets disiplini gerektirir. Northflank `europe-west`, Supabase bölgesi, IPv6/direct veya IPv4 session-pooler bağlantısı, küçük connection pool, migration sıra kontrolü ve gerçek smoke test doğrulanmalıdır. Bağımsız provider auto-deploy mekanizmaları migration'ı geçmeden rollout yapamayacak şekilde koordine edilir.

Developer Sandbox akademik canlı demo için başlangıç ortamıdır; ücretsiz plan erişimi, kaynak boyutu veya production uygunluğu gerçek hesapta doğrulanmadan taahhüt edilmez. Bu hosting kararı ticari SLA, compliance sertifikası veya finansal regülasyon uyumluluğu sağlamaz. Harici deployment henüz yapılmadığından repository hazırlığı `DEPLOYED` kanıtı değildir.

**Implementation source:** [`../TECH_STACK.md`](../TECH_STACK.md), [`../ARCHITECTURE.md`](../ARCHITECTURE.md), [`../DEPLOYMENT_RUNBOOK.md`](../DEPLOYMENT_RUNBOOK.md).
