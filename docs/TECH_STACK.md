# Teknoloji Stack'i — HQ Teknik Standardı

**Karar tarihi:** 2026-10-21  
**Statü:** [HQ KARARI] — uygulama henüz başlamadı; bağımlılıkların birbiriyle çalıştığı ilk scaffold/CI ticket'ında doğrulanmalı.  
**Sorumluluk:** Seçilen araç, sürüm politikası, geliştirme ve deploy altyapısı bu dosyada; çalışma topolojisi [`ARCHITECTURE.md`](ARCHITECTURE.md); gerekçeler [`adr/`](adr/).

## Seçilen stack

| Sorumluluk | Teknoloji | Pratik kullanım kuralı |
|---|---|---|
| Backend | **Java 25 LTS / Eclipse Temurin**, **Spring Boot 4.1.x** | Son kararlı ve güvenlik yamalı `4.1.x`; Maven Wrapper ile derle; preview API ve worker aynı Java codebase |
| HTTP / validation / security | Spring MVC, Bean Validation, Spring Security | REST; JWT doğrulama; tenant ve permission kontrolleri yalnız backend'de authoritative |
| DB erişimi | **jOOQ** (Boot'un uyumlu yönettiği sürüm) | Karmaşık filtre, time-window SUM/COUNT ve güvenli dinamik SQL için; serbest metin SQL yok, yalnız izinli kolon/operatorler |
| DB değişiklikleri | **Flyway** | Versioned SQL migration; production değişikliği CI ve rollback stratejisinden bağımsız deploy edilmez |
| Veritabanı | **PostgreSQL — Supabase** | Transaction, rule, score, assignment/lease, event, audit tek transactional kaynak; versiyon Supabase projesi provision edilirken sabitlenir |
| Authentication | **Supabase Auth** | Asimetrik JWT, Spring Security JWKS validation; frontend auth durumunu backend RBAC yerine koyma |
| Frontend | **Next.js 16.4.x**, React, TypeScript `strict` | App Router; Vercel; kilit dosyasında doğrulanan güvenlik yamalı patch'i pinle |
| Tasarım / bileşenler | **Tailwind CSS 4**, **shadcn/ui**, Radix primitives | Tutarlı design tokens; kopyalanan shadcn bileşenleri projede sahiplenilir |
| Ağır veri tablosu | **TanStack Table v8** + **dnd-kit** | Olgun React API; server-side filtering/pagination ve kolon DnD |
| API verisi ve cache | **TanStack Query** | Mutations sonrası invalidate; saved views server-side; auth/RBAC backend'de |
| Form ve validation | React Hook Form + Zod | No-code rule builder typed validation ile eşleşmeli |
| Backend test | JUnit 5, Spring Boot Test, **Testcontainers/PostgreSQL**, Mockito | Aynı PG semantiğiyle kural, kilit, tenant, migration testleri |
| Frontend test | **Vitest** + Testing Library; **Playwright** | Bileşen ve iki kritik fraud kullanıcı akışının browser testi |
| Çalışan süreçler | Java API + Java Worker | Aynı modular-monolith repo/kütüphane; API sürekli HTTP, Worker generator ve event evaluation |
| İzleme | Spring Boot Actuator, Micrometer; JSON log | Health endpoints; correlation/transaction ID, tenant ID log redaction |
| Lokal ortam | Docker Compose | Local PostgreSQL, API, Worker, Web; prod secret'ları geliştirmeye girmez |
| CI/CD | GitHub Actions, required checks, protected `main` | PR lint/typecheck/unit/integration/build; merge sonrası otomatik deploy + smoke |
| Prod web | **Vercel** | Next.js, her `main` merge canlıya deploy olur |
| Prod API + Worker | **Railway** | Container deployment, iki sürekli çalışan servis (aynı image/revision), health check ve log |
| Prod DB/Auth | **Supabase** | PostgreSQL + Auth; ayrı prod/prod-dışı projelerle yanlışlıkla demo yazmalarını önle |
| Repo | **GitHub monorepo** | `frontend/`, `backend/`, `docs/`, `.github/`; pnpm lockfile + Maven Wrapper; erken Turborepo/Nx yok |

> **Sürüm disiplini:** Burada `x` yazan kütüphaneler semver aralığıyla kontrolsüz güncellenmez. Scaffold ticket'ı, o gün kararlı ve uyumlu **tam patch sürümlerini** `pom.xml`/lockfile'da sabitler ve CI'da doğrular. RC/beta/experimental dependency kullanılmaz. Güncel Spring Boot ve Next.js majorlar web kaynaklarıyla kontrol edilmiştir. TanStack Table v8 kesin seçimdir; v9 örnekleriyle API karıştırılmayacak.

## Lokal/CI için standart hedefler

- `frontend/`: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- `backend/`: `./mvnw -B verify` (unit + Testcontainers integration + Flyway).
- `frontend/`: `pnpm exec playwright test` (kritik PR'larda ve/veya deploy smoke'da; ilk ticketlarda zorunlu değilse ticket açıkça işaretler).
- Docker Compose ile yerel PostgreSQL ve test fixture'ları; açıkça istenmedikçe gerçek Supabase/prod veritabanına lokal test çalıştırılmaz.
- **Komutlar scaffold oluşturuluncaya kadar hedef sözleşmedir; henüz çalışan repo komutu gibi raporlanmaz.**

## Bilinçli olarak kullanmadıklarımız

- FastAPI, Django, Express/NestJS backend: Bu ürünün SQL + transaction + concurrency ağırlıklı çekirdeği için Spring/JVM standartlaştırıldı; diğerleri kategorik olarak production dışı değildir.
- Kafka, Flink, Redis, Elasticsearch, ClickHouse, Kubernetes, mikroservisler: İlk iki aylık MVP için ek işletim maliyeti. Ölçülen ölçek/latency ihtiyaçlarında ADR ile eklenebilir.
- Frontend'den Supabase transaction tablolarına doğrudan sorgu: İş kuralları ve tenant/permission denetimi API üzerinde kalır; Supabase SDK sadece Auth için kullanılabilir.
- Runtime'da keyfi kullanıcı SQL'i / JavaScript eval / Groovy scripting: Rule Builder **tipli ve doğrulanan expression AST** üretir.

## Uygulamadan önce doğrulanacak bağımlılıklar

1. Java 25 + Spring Boot 4.1.x + jOOQ + Flyway + Supabase Postgres ile bir integration test.
2. Railway'den Supabase'e TLS'li PostgreSQL bağlantısı (persistent JVM için direct/session pooling). Bağlantı kapasitesi ve Hikari `maximumPoolSize` ölçülerek ayarlanır.
3. Spring Security resource-server JWT validation için Supabase asimetrik JWKS, issuer ve audience ayarları; legacy HS256 varsayılmaz.
4. Next.js 16.4.x, React, shadcn/ui, TanStack Table v8 ve dnd-kit'in uyumlu kararlı sürümleri.
5. Hosting free tier, uyku/cold start, kota ve ücretli kullanım sınırları deploy öncesi bütçeye göre test edilir; ücretsiz çalışacağı garanti edilmez.

## Resmî referanslar (21 Ekim 2026 erişimi)

- Spring Boot 4.1.1: https://spring.io/blog/2026/08/20/spring-boot-4-1-1-available-now
- Spring Boot sistem gereksinimleri: https://docs.spring.io/spring-boot/system-requirements.html
- Next.js 16.4: https://nextjs.org/blog
- Supabase Postgres bağlantıları: https://supabase.com/docs/guides/database/connecting-to-postgres
- Supabase JWKS/JWT: https://supabase.com/docs/guides/auth/jwts
- Railway Spring Boot: https://docs.railway.com/guides/spring-boot
- Vercel runtimes: https://vercel.com/docs/functions/runtimes
- TanStack Table ordering/filtering: https://tanstack.com/table/v8/docs/guide/column-ordering