# ADR-0003 — Vercel + Railway + Supabase ve Protected Main

**Status:** Accepted by HQ, amended 2026-10-29.

## Context

JVM tabanlı API ve sürekli Worker, tek seferlik schema migration, Vercel web ve Supabase DB/Auth farklı runtime/lifecycle gerektiriyor. Multi-tenant ve yetki sınırı backend'de olmalı. Staging ile production servislerinin ve DB credentials'larının birbirinden ayrılması gerekiyor.

## Decision

- Frontend Next.js Vercel'de, backend Java API ve Worker Railway'de, PostgreSQL/Auth Supabase'te.
- Railway staging project accomplished-vibrancy / environment staging mevcut API ve Worker servislerini içerir.
- Production için ayrı Railway project kostak-fraud-production oluşturuldu; production environment henüz servissizdir. Staging service veya secret kopyalanmadı.
- Supabase staging ve production ayrı projelerdir. Şu an yalnız staging Flyway V1 uygulanmıştır; production migration yapılmamıştır.
- Backend runtime modes APP_MODE=api|worker|migrate; API/Worker startup Flyway çalıştırmaz. Production release ancak migration, readiness, exact SHA, Worker heartbeat ve Vercel promotion gate sırası gerçek ortamda doğrulanınca açılır.
- Vercel frontend/vercel.json Git-triggered main deployments'ı kapatır; feature-branch Preview deploy'ları açık kalır.
- GitHub release-ready ve manual-release workflows, Railway release orchestration tamamlanana kadar fail-closed olur. Eski Northflank runner devre dışıdır.
- Supabase Auth JWT identity sağlar; membership ve permission kontrolü Spring backend'de kalır. IAM-001 signature/issuer/audience validation ve tenant-scoped authorization'ı uygular.

## Consequences

Production ortamı daha fazla kurulum işi gerektirir; bu, staging credentials'larının production'a yanlışlıkla taşınmasını engeller. Production API/Worker, least-privilege DB role, TLS connection, migration sequencing ve live smoke tamamlanmadan yayınlanmaz. Akademik demo hosting'i ticari SLA veya compliance sertifikası sağlamaz.

Implementation source: TECH_STACK.md, ARCHITECTURE.md, DEPLOYMENT_RUNBOOK.md.
