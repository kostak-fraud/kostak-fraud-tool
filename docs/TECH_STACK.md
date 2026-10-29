# Teknoloji Stack'i — HQ Teknik Standardı

**Karar tarihi:** 2026-10-21  
**Son revizyon:** 2026-10-29 — Railway hedefi Northflank ile değiştirildi.
**Statü:** [HQ KARARI] — FND-001 scaffold ve FND-002 CI doğrulandı; FND-003 deployment hazırlığı incelemede. Harici Northflank/Vercel/Supabase rollout'u ve live smoke henüz doğrulanmadı.
**Sorumluluk:** Seçilen araç, sürüm politikası, geliştirme ve deploy altyapısı bu dosyada; çalışma topolojisi [`ARCHITECTURE.md`](ARCHITECTURE.md); gerekçeler [`adr/`](adr/).

## Seçilen stack

| Sorumluluk | Teknoloji | Pratik kullanım kuralı |
|---|---|---|
| Backend | **Java 25 LTS / Eclipse Temurin**, **Spring Boot 4.1.x** | Son kararlı ve güvenlik yamalı `4.1.x`; Maven Wrapper ile derle; preview API ve worker aynı Java codebase |
| HTTP / validation / security | Spring MVC, Bean Validation, Spring Security | REST; JWT doğrulama; tenant ve permission kontrolleri yalnız backend'de authoritative |
| DB erişimi | **jOOQ** (Boot'un uyumlu yönettiği sürüm) | Karmaşık filtre, time-window SUM/COUNT ve güvenli dinamik SQL için; serbest metin SQL yok, yalnız izinli kolon/operatorler |
| DB değişiklikleri | **Flyway** | Versioned SQL migration; production değişikliği CI ve rollback stratejisinden bağımsız deploy edilmez |
| PostgreSQL driver | **pgJDBC 42.7.14** | Spring Boot 4.1.1'in yönettiği 42.7.13, güvenlik patch'i için yalnız driver seviyesinde override edilir; Flyway ve jOOQ Boot-managed kalır |
| Veritabanı | **PostgreSQL 17 hedefi — Supabase** | Transaction, rule, score, assignment/lease, event, audit tek transactional kaynak; mevcut PostgreSQL 18.3 local/CI testi ayrıca korunur |
| Authentication | **Supabase Auth** | Asimetrik JWT, Spring Security JWKS validation; frontend auth durumunu backend RBAC yerine koyma |
| Frontend | **Next.js 16.4.x**, React, TypeScript `strict` | App Router; Vercel; kilit dosyasında doğrulanan güvenlik yamalı patch'i pinle |
| Tasarım / bileşenler | **Tailwind CSS 4**, **shadcn/ui**, Radix primitives | Tutarlı design tokens; kopyalanan shadcn bileşenleri projede sahiplenilir |
| Ağır veri tablosu | **TanStack Table v8** + **dnd-kit** | Olgun React API; server-side filtering/pagination ve kolon DnD |
| API verisi ve cache | **TanStack Query** | Mutations sonrası invalidate; saved views server-side; auth/RBAC backend'de |
| Form ve validation | React Hook Form + Zod | No-code rule builder typed validation ile eşleşmeli |
| Backend test | JUnit 5, Spring Boot Test, **Testcontainers/PostgreSQL**, Mockito | Aynı PG semantiğiyle kural, kilit, tenant, migration testleri |
| Frontend test | **Vitest** + Testing Library; **Playwright** | Bileşen ve iki kritik fraud kullanıcı akışının browser testi |
| Çalışan süreçler | Java API + Java Worker + Migration job | Aynı modular-monolith image; `APP_MODE=api`, `worker`, `migrate`; yalnız migrate modu Flyway çalıştırır |
| İzleme | Spring Boot Actuator, Micrometer; JSON log | API health/readiness, Worker redacted heartbeat; correlation/transaction ID ve tenant ID log redaction |
| Lokal ortam | Docker Compose | Local PostgreSQL; API/Worker/Web lokal komut veya container ile çalışır, prod secret'ları geliştirmeye girmez |
| CI/CD | GitHub Actions, required checks, protected `main` | PR checks; başarılı main CI sonrası protected `release-ready` Northflank workflow/smoke gate; Vercel domain assignment bu gate'i bekler |
| Prod web | **Vercel** | Next.js Git deployment; `main` production build'i `release-ready` Deployment Check sonrası production domain'i alır |
| Prod API + Worker | **Northflank** | İki sürekli servis; aynı immutable image/revision, ayrı runtime mode, health/process gözlemi ve log |
| Prod DB/Auth | **Supabase** | PostgreSQL + Auth; ayrı prod/prod-dışı projelerle yanlışlıkla demo yazmalarını önle |
| Repo | **GitHub monorepo** | `frontend/`, `backend/`, `docs/`, `.github/`; pnpm lockfile + Maven Wrapper; erken Turborepo/Nx yok |

> **Sürüm disiplini:** Burada `x` yazan kütüphaneler semver aralığıyla kontrolsüz güncellenmez. Scaffold ticket'ı, o gün kararlı ve uyumlu **tam patch sürümlerini** `pom.xml`/lockfile'da sabitler ve CI'da doğrular. RC/beta/experimental dependency kullanılmaz. Güncel Spring Boot ve Next.js majorlar web kaynaklarıyla kontrol edilmiştir. TanStack Table v8 kesin seçimdir; v9 örnekleriyle API karıştırılmayacak.

FND-003'teki `pgJDBC 42.7.14` açık bir security patch override'ıdır. Bu istisna bütün Boot-managed dependency'leri elle pinleme gerekçesi değildir; Flyway ve jOOQ sürümleri Spring Boot 4.1.1 dependency management ile uyumlu tutulur.

## Runtime ve deployment sınırı

- Tek backend image'ı üç açık davranış sunar: API sürekli HTTP ve readiness; Worker sürekli process + heartbeat; Migration Flyway'i bir kez çalıştırıp başarı/hata exit code'u ile sonlanır.
- API ve Worker production startup sırasında migration çalıştırmaz. Schema değişikliği rollout öncesinde explicit Northflank migration job ile uygulanır.
- FND-003 Worker'ı fraud processing, generator veya queue tüketimi yapmaz; bunlar ilgili transaction/rule ticket'larının kapsamıdır.
- Supabase Auth environment sözleşmesi hazırlanır, fakat gerçek JWT authentication/authorization IAM-001 kapsamıdır.
- Sağlayıcı alanları, environment matrisi ve operasyon adımları için kanonik kaynak [`DEPLOYMENT_RUNBOOK.md`](DEPLOYMENT_RUNBOOK.md)'dir.

## Lokal/CI için standart hedefler

- `frontend/`: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- `backend/`: `./mvnw -B verify` (unit + Testcontainers integration + Flyway).
- `frontend/`: `pnpm exec playwright test` (kritik PR'larda ve/veya deploy smoke'da; ilk ticketlarda zorunlu değilse ticket açıkça işaretler).
- Docker Compose ile yerel PostgreSQL ve test fixture'ları; açıkça istenmedikçe gerçek Supabase/prod veritabanına lokal test çalıştırılmaz.
- Deployment testleri Docker image build, üç runtime mode, graceful shutdown, PostgreSQL 17 + 18.3 migration ve memory-limit kontrolünü kapsar. Harici platform adımları gerçek hesap/log olmadan `VERIFIED` raporlanmaz.

## Bilinçli olarak kullanmadıklarımız

- FastAPI, Django, Express/NestJS backend: Bu ürünün SQL + transaction + concurrency ağırlıklı çekirdeği için Spring/JVM standartlaştırıldı; diğerleri kategorik olarak production dışı değildir.
- Kafka, Flink, Redis, Elasticsearch, ClickHouse, Kubernetes, mikroservisler: İlk iki aylık MVP için ek işletim maliyeti. Ölçülen ölçek/latency ihtiyaçlarında ADR ile eklenebilir.
- Frontend'den Supabase transaction tablolarına doğrudan sorgu: İş kuralları ve tenant/permission denetimi API üzerinde kalır; Supabase SDK sadece Auth için kullanılabilir.
- Runtime'da keyfi kullanıcı SQL'i / JavaScript eval / Groovy scripting: Rule Builder **tipli ve doğrulanan expression AST** üretir.

## Uygulamadan önce doğrulanacak bağımlılıklar

1. Java 25 + Spring Boot 4.1.x + Boot-managed jOOQ/Flyway + pgJDBC 42.7.14'ün Supabase hedefi PostgreSQL 17 ve mevcut PostgreSQL 18.3 testleriyle uyumu.
2. Northflank'ten Supabase'e TLS'li PostgreSQL bağlantısı. Persistent JVM için IPv6 direct connection; IPv6 doğrulanmazsa IPv4 session pooler kullanılır. Transaction pooler varsayılan değildir. Hikari `maximumPoolSize` ölçülerek küçük tutulur.
3. Spring Security resource-server JWT validation için Supabase asimetrik JWKS, issuer ve audience ayarları; legacy HS256 varsayılmaz.
4. Next.js 16.4.x, React, shadcn/ui, TanStack Table v8 ve dnd-kit'in uyumlu kararlı sürümleri.
5. Northflank 0.2 vCPU/512 MiB test adayı ve 0.5 vCPU/1024 MiB tercih adayında JVM memory davranışı; ücretsiz erişim hesap üzerinde doğrulanmadan garanti edilmez.
6. Vercel Node 24.x + Corepack üzerinden exact pnpm 11.24.0 Preview ve Production build'i. `ENABLE_EXPERIMENTAL_COREPACK=1` iki ortamda ayarlanır; custom install override kullanılmaz.
7. Hosting free tier, uyku/cold start, kota ve ücretli kullanım sınırları deploy öncesi bütçeye göre test edilir; akademik demo ortamı ticari production SLA'sı sayılmaz.

## Resmî referanslar (29 Ekim 2026 güncellemesi)

- Spring Boot 4.1.1: https://spring.io/blog/2026/08/20/spring-boot-4-1-1-available-now
- Spring Boot sistem gereksinimleri: https://docs.spring.io/spring-boot/system-requirements.html
- Next.js 16.4: https://nextjs.org/blog
- Supabase Postgres bağlantıları: https://supabase.com/docs/guides/database/connecting-to-postgres
- Supabase JWKS/JWT: https://supabase.com/docs/guides/auth/jwts
- Northflank Dockerfile build/deploy: https://northflank.com/docs/v1/application/getting-started/build-and-deploy-your-code
- Northflank workflow ve migration: https://northflank.com/docs/v1/application/release/configure-workflows
- Northflank resource plans/quotas: https://northflank.com/docs/v1/application/billing/resource-plans-and-quotas
- Vercel Node.js sürümleri: https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
- Vercel package managers: https://vercel.com/docs/package-managers
- Vercel monorepo: https://vercel.com/docs/monorepos
- TanStack Table ordering/filtering: https://tanstack.com/table/v8/docs/guide/column-ordering
