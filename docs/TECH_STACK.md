# Teknoloji Stack'i — HQ Teknik Standardı

**Karar tarihi:** 2026-10-21  
**Son revizyon:** 2026-10-29 — Railway aktif backend hosting hedefidir.  
**Statü:** FND-001 scaffold, FND-002 CI ve Railway staging çalışır durumda. Production projesi ayrı oluşturulmuştur ancak henüz servisi yoktur; release gate bilerek fail-closed durumdadır.  
**Sorumluluk:** Araç ve sürüm politikası bu dosyada; topoloji ARCHITECTURE.md, operasyon DEPLOYMENT_RUNBOOK.md, gerekçeler adr/ içindedir.

## Seçilen stack

| Sorumluluk | Teknoloji | Pratik kullanım kuralı |
|---|---|---|
| Backend | Java 25 LTS / Eclipse Temurin, Spring Boot 4.1.x | Maven Wrapper; tek modular monolith codebase |
| HTTP / validation / security | Spring MVC, Bean Validation, Spring Security | REST; Supabase JWT doğrulama, tenant ve permission kontrolleri backend'de authoritative |
| DB erişimi | jOOQ | Tipli query'ler; güvenli dinamik filter/operator whitelist |
| DB değişiklikleri | Flyway | Versioned SQL; production migration yalnız kontrollü release adımında |
| PostgreSQL driver | pgJDBC 42.7.14 | Spring Boot 4.1.1'in yönettiği sürümden security patch override; diğer managed dependency'ler Boot ile uyumlu |
| Veritabanı | Supabase PostgreSQL 17 | Transaction, rule, score, membership, audit tek transactional kaynak |
| Authentication | Supabase Auth | Asimetrik JWT, Spring Security JWKS validation; JWT claim tek başına authorization değildir |
| Frontend | Next.js 16.4.x, React, TypeScript strict | App Router; Vercel |
| UI | Tailwind CSS 4, shadcn/ui, Radix | Merkezi theme tokens; sahiplenilmiş bileşenler |
| Data grid | TanStack Table v8 + dnd-kit | Server-side pagination/filtering ve column drag/drop |
| API cache/forms | TanStack Query, React Hook Form, Zod | Mutation invalidation; typed forms |
| Backend test | JUnit 5, Spring Boot Test, Testcontainers/PostgreSQL, Mockito | Tenant, authz, lock, migration testleri |
| Frontend test | Vitest + Testing Library; Playwright | Bileşen ve kritik fraud browser akışları |
| Runtime | Java API + Java Worker + migration step | APP_MODE=api, worker, migrate; API/Worker startup Flyway çalıştırmaz |
| CI/CD | GitHub Actions, protected main | Required frontend-ci ve backend-ci; production release şimdilik fail-closed |
| Web hosting | Vercel | Preview branch deployments açık; main Git-triggered production deployment frontend/vercel.json ile kapalı |
| API/Worker hosting | Railway | Staging'de iki servis; ayrı production projesi boş ve deploy edilmemiş |
| DB/Auth hosting | Supabase | Ayrı staging/production projeleri; production schema migration çalıştırılmadı |
| Repo | GitHub monorepo | frontend/, backend/, docs/, .github/; pnpm lock + Maven Wrapper |

## Runtime ve release sınırı

- Tek backend image üç runtime davranışını sunar: API HTTP/readiness, Worker sürekli heartbeat, Migration one-shot Flyway.
- Railway staging API ve Worker son doğrulanan 614bafe8 commit'inde çalışıyordu. Her iki servisin aynı commit'te olması, ayrı build'lerin byte-identical image olduğu anlamına gelmez.
- Railway production projesi kostak-fraud-production yalnız boş production environment içerir. Production API/Worker servisi ve DB secret'ları eklenmemiştir.
- GitHub release-ready ve manual-release job'ları Railway release orchestration doğrulanana kadar fail-closed'dur. DEPLOYMENT_AUTOMATION_ENABLED=true tek başına deployment başlatamaz.
- Vercel Git-triggered main deployments kapalıdır; Preview feature branch'lerde çalışabilir. Production promotion yalnız açık release gate tasarımı tamamlandıktan sonra ayrıca kurulacaktır.
- Supabase Auth/JWT doğrulama ve tenant authorization IAM-001 kapsamındadır; bu hosting hazırlığı authentication'ın tamamlandığı anlamına gelmez.

## Lokal/CI standartları

- Frontend: pnpm install --frozen-lockfile, pnpm lint, pnpm typecheck, pnpm test, pnpm build.
- Backend: ./mvnw -B verify; unit + Testcontainers PostgreSQL integration + Flyway.
- CI Docker build: non-root runtime user 10001:10001, API healthcheck ve Worker heartbeat negative smoke.
- External deployment URL, schema version, provider revision ve live smoke ancak gerçek kanıtla VERIFIED olur.

## Bilinçli olarak kullanmadıklarımız

- FastAPI/Django/Express backend: seçilen Java/Spring domain modeliyle tutarlılık.
- Kafka/Flink/Redis/Elasticsearch/Kubernetes/microservices: MVP ölçümü ihtiyaç göstermeden eklenmeyecek.
- Frontend'den transaction tablolarına doğrudan Supabase DB query: business logic ve tenant authorization API'de kalır.
- Runtime user SQL/eval: Rule Builder tipli expression AST üretir.

## Resmî referanslar

- Railway docs: https://docs.railway.com/
- Supabase PostgreSQL connections: https://supabase.com/docs/guides/database/connecting-to-postgres
- Supabase JWT/JWKS: https://supabase.com/docs/guides/auth/jwts
- Vercel Git deployment configuration: https://vercel.com/docs/project-configuration/git-configuration
- Vercel Node.js versions: https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
- TanStack Table v8 column ordering: https://tanstack.com/table/v8/docs/guide/column-ordering
