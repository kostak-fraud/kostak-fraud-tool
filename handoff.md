# Ticket Handoff — FND-003

## 1. Ticket ve branch

- Ticket: `FND-003` — Vercel web, Northflank API/Worker, Supabase DB/Auth ve kontrollü release hazırlığı
- Branch: `feat/fnd-003-deployment`
- Base SHA: `fd5db3d79d0b127b2591d02828226bf604a59078`
- Doğrulanan implementation head (handoff commit'i öncesi): `e004c08d20e71771ca163841d17ea16635f2a426`
- PR: https://github.com/kostak-fraud/kostak-fraud-tool/pull/4
- Executor revision: PR yorumu `#issuecomment-6484665251` doğrultusunda exact-SHA release check ve deployed profile fail-fast düzeltildi.
- Kısa amaç: Tek Java 25 image'ını API, sürekli Worker ve tek seferlik Migration modlarına ayırmak; migration-before-rollout, ortam izolasyonu ve fail-closed release gate hazırlığını kurmak. Gerçek provider rollout'u Executor'a bırakılmıştır.

## 2. Yapılan değişiklikler

- `APP_MODE=api|worker|migrate` authoritative runtime preflight'i eklendi. API/Worker Flyway'i açamaz; Migration non-web çalışır, Flyway'i çalıştırır ve tamamlanınca exit eder.
- Staging/Production için explicit ve birbiriyle uyumlu `APP_ENV` / `SPRING_PROFILES_ACTIVE`, tam 40 karakter commit SHA, TLS'li ve database adı açık PostgreSQL URL'si, ayrı credential, en fazla 4 bağlantılık pool ve API Supabase Auth sözleşmesi fail-fast doğrulanır. Deployed Spring profili `APP_ENV` olmadan, deployed `APP_ENV` ise eşleşen aktif profil olmadan başlayamaz. IAM/JWT enforcement uygulanmadı; `IAM-001` kapsamındadır.
- API startup DB probe, DB-backed readiness ve exact runtime SHA veren `/actuator/info` eklendi. Release gate hem readiness `UP` hem exact SHA eşleşmesi ister.
- Worker DB startup probe, periyodik redacted heartbeat, non-daemon sürekli process ve graceful shutdown uygulandı. Worker healthcheck eksik, symlink, bayat veya `db_status=DOWN` heartbeat'i reddeder.
- Java 25 multi-stage, digest-pinned, non-root Docker image ve local Compose `postgres → migrate → api/worker` sırası eklendi.
- PostgreSQL 17.11 ve 18.3 üzerinde iki eşzamanlı Flyway migrator, schema doğrulama ve jOOQ probe testleri eklendi. Bu, Flyway yarış kilidini ve V1 idempotency davranışını sınar.
- `release-ready`, aynı `main` CI run'ında `frontend-ci` + `backend-ci` başarılarını bekler ve check SHA / release SHA / checkout SHA eşitliğini doğrular. Böylece `workflow_run` bağlamının farklı revision'a check yazması engellendi. Northflank run benzersiz adla tetiklenir, run ID bulunur, SHA/branch arguments doğrulanır ve sonuç başarıya kadar poll edilir. Manuel SHA, repo kodu çalıştırılmadan önce `origin/main` ancestry kontrolünden geçer; manuel job farklı `manual-release` adıyla Vercel gate'ini açamaz.
- Vercel `frontend/` root yapılandırması, public-only frontend env sözleşmesi ve Preview/Production ayrımı eklendi. Deployment Checks yoksa `--prod --skip-domain → smoke → promote` yolu runbook'ta tanımlandı.
- `docs/DEPLOYMENT_RUNBOOK.md`, mimari/stack/ADR/delivery/backlog ve README güncellendi. Harici kaynaklar veya canlı deployment varmış gibi işaretlenmedi.

Önemli dosyalar:

- Runtime: `backend/src/main/java/com/kostak/fraud/runtime/`, `backend/src/main/java/com/kostak/fraud/worker/`, `backend/src/main/java/com/kostak/fraud/migration/`
- Container/local topology: `backend/Dockerfile`, `backend/worker-healthcheck.sh`, `compose.yaml`
- Release gate: `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `scripts/release/`
- Provider sözleşmesi: `docs/DEPLOYMENT_RUNBOOK.md`, `frontend/vercel.json`, `.env.example`, `frontend/.env.example`

DB etkisi:

- Yeni production migration eklenmedi; mevcut `V1` değiştirilmedi.
- API ve Worker startup migration çalıştırmaz. Migration yalnız explicit `APP_MODE=migrate` job'ında çalışır.
- PostgreSQL 17/18 compatibility ve eşzamanlı migration davranışı Testcontainers ile doğrulandı.

## 3. Kabul kriterleri ve test kanıtı

| Kriter | Sonuç | Kanıt |
|---|---|---|
| Aynı Java 25 image ile API/Worker/Migration ayrımı; API/Worker Flyway kapalı | PASS | `KostakApplicationModeTest`, `RuntimePreflightTest`; `backend-ci` run `40797667006` |
| API DB readiness ve exact release SHA | PASS | `KostakApplicationTest`; `/actuator/health/readiness` + `/actuator/info`; gate unit testleri |
| Worker sürekli heartbeat ve graceful shutdown | PASS | `WorkerHeartbeatLifecycleTest`; `backend/worker-healthcheck.test.sh`; CI image healthcheck smoke |
| Migration yarışı engeli | PASS | PG17 ve PG18 testlerinde iki eşzamanlı Flyway migrator; her ikisi de schema v1 doğruladı |
| PostgreSQL 17/18 migration + jOOQ uyumluluğu | PASS | `Postgres17DatabaseIntegrationIT`, `DatabaseIntegrationIT`; `backend-ci` run `40797667006` |
| Docker image build ve non-root runtime | PASS | `backend-ci` içindeki `Build and inspect backend runtime image`; user `10001:10001` doğrulandı |
| Vercel Preview/Production ve secret izolasyonu | PREPARED / LIVE UNVERIFIED | `frontend/vercel.json`, env örnekleri, `docs/DEPLOYMENT_RUNBOOK.md`; gerçek Vercel proje/build yok |
| Northflank workflow completion + SHA/branch + API smoke gate | PREPARED / LIVE UNVERIFIED | `.github/workflows/ci.yml`, `.github/workflows/release.yml`, release script/workflow sözleşme testleri; provider workflow/token/project kurulmadı |
| Production secret repo/PR/log dışı | PASS (repository scope) | Secret pattern taraması yalnız yasaklayıcı doküman referanslarını buldu; PR workflow production secret kullanmıyor |
| Canlı URL, schema version, provider revision ve smoke | NOT RUN / BLOCKER | Harici Northflank, Supabase ve Vercel kaynakları kurulmadı; kanıt uydurulmadı |

Test özeti:

- Revision PR CI: https://github.com/kostak-fraud/kostak-fraud-tool/actions/runs/40797667006
  - `frontend-ci`: PASS — 6 release/workflow gate testi + worker healthcheck script, frozen install, lint, typecheck, 2 frontend test, Next.js production build.
  - `backend-ci`: PASS — Java 25 Maven verify; 17 unit/application test + 2 PostgreSQL integration testi; PostgreSQL 17.11 ve 18.3; Docker image build/non-root/healthcheck smoke.
  - `release-ready`: PR context'inde tasarım gereği `skipped`; job yalnız `main` push'unda ve iki required job başarılıysa çalışır.
- Lokal `corepack pnpm install --frozen-lockfile`: PASS.
- Lokal `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`: PASS.
- Lokal release gate/workflow sözleşme Node testleri: PASS, 6/6.
- Lokal worker healthcheck WSL/Linux testi: PASS.
- `docker compose --profile runtime config --quiet`: PASS.
- `git diff --check`: PASS.
- Secret pattern taraması: PASS; gerçek secret bulunmadı.
- Lokal backend revision testi: UNVERIFIED — makinede Java 17 var; proje Java 25 istediği için Maven derleme başlamadan `release version 25 not supported` ile durdu. Aynı revision Java 25 PR `backend-ci` üzerinde tamamen geçti.
- Lokal Docker/üç-mode Compose smoke: UNVERIFIED — Docker Desktop process/daemon yanıt vermedi. Aynı revision Dockerfile'ı PR `backend-ci` üzerinde build edildi; non-root `10001:10001` ve image healthcheck smoke geçti.
- Manuel UI/UX: Uygulanmadı; bu ticket yeni kullanıcı ekranı içermiyor.

## 4. Güvenlik ve operasyon

- Tenant/RBAC: İşlem/tenant verisi veya authorization eklenmedi. Supabase URL/JWKS/audience yalnız fail-fast contract'tır; gerçek JWT validation ve backend membership `IAM-001` kapsamındadır.
- Secret güvenliği: Frontend yalnız `NEXT_PUBLIC_*` publishable değerlerini kabul eder. DB password, Northflank token ve provider deployment secretları yalnız provider/protected environment store'larında tanımlanmalıdır.
- Release güvenliği: Otomatik production release yalnız aynı `main` CI run'ında iki required job başarılı olduktan ve `GITHUB_SHA == RELEASE_SHA == checkout SHA` doğrulandıktan sonra protected `production` environment'ta çalışır. Manuel SHA `main` ancestry doğrulanmadan repository script'i çalıştırılmaz; `manual-release` check'i Vercel `release-ready` kapısını karşılayamaz.
- Migration: API/Worker Flyway'i açamaz. Northflank workflow concurrency `forbid` ve explicit migration/wait sırası ile kurulmalıdır. Destructive rollback yok; backup/recovery + fix-forward kullanılır.
- Rollback: Schema ile uyumlu önceki immutable API/Worker image'ına ve önceki Vercel deployment'ına dönüş mümkündür; schema otomatik geri alınmaz.
- Gözlemlenebilirlik: API readiness ve release SHA; Worker redacted heartbeat/DB status/release SHA sağlar. Full JDBC URL veya credential loglanmaz.

## 5. Bilinen eksikler ve riskler

- BLOCKER: Northflank, Supabase ve Vercel gerçek hesap/proje/resource/secret kurulumu ve live rollout yapılmadı. FND-003 `DONE` değildir.
- Executor'ın son provider preflight'ında `kostak-fraud-prod` ve `kostak-fraud-staging` Supabase projeleri `INACTIVE`, repository'ye bağlı Vercel projesi ise bulunamadı. Veritabanları yeniden aktif edilmeden canlı migration; Vercel projesi bağlanmadan Deployment Check doğrulaması yapılamaz.
- Northflank Developer Sandbox kota/plan, `nf-compute-20`/`nf-compute-50`, IPv6 egress ve 512 MiB/1024 MiB JVM davranışı UNVERIFIED.
- Northflank workflow template'i provider dashboard/API üzerinde oluşturulmalı; build → migrate/wait → exact revision API/Worker rollout → Worker heartbeat koşulu gerçek run ile kanıtlanmalı.
- Supabase staging ve production ayrı PostgreSQL 17/Auth projeleri, endpoint (direct/session pooler), TLS CA/`verify-full`, runtime DB role ve backup/recovery hazırlığı UNVERIFIED.
- Vercel project root/Production Branch/env ayarları, pnpm 11.24.0 gerçek Preview/Production build'i ve Production Deployment Checks plan/hesap erişimi UNVERIFIED.
- Deployment Checks yoksa protected Vercel CLI staged candidate akışı henüz repository workflow'una eklenmedi; runbook'taki kontrollü fallback Executor tarafından kurulmalı.
- Canlı API/Worker/Migration mode container smoke, URL, schema checksum/version ve provider revision eşleşmesi yok. Repository testleri provider kanıtı değildir.
- `backlog/FND-002.md` statüsü base commit'teki CI gerçeğine rağmen `PLANNED`; bu FND-003 kapsamında sessizce değiştirilmedi.
- GitHub runner, `ubuntu-latest` etiketinin Ubuntu 26'ya geçiş uyarısını verdi; mevcut koşu Ubuntu runner üzerinde başarılıdır, ileride image değişimi izlenmelidir.

Executor'ın özellikle incelemesi gerekenler:

- Northflank workflow template'inin gerçekten aynı SHA/image ile migration-before-rollout sırasını ve Worker heartbeat beklemesini uygulaması.
- GitHub protected `production` environment, token least-privilege izinleri ve `DEPLOYMENT_AUTOMATION_ENABLED` açılmadan önce dry-run/review.
- Vercel `release-ready` Deployment Check bağlantısı; özellik yoksa auto domain assignment kapalı staged promotion yolu.
- Supabase service DB role'ünün superuser/BYPASSRLS olmaması ve staging/production credential izolasyonu.

## 6. Sonraki aksiyon

- İncelemeye hazır mı? **Evet, repository/PR hazırlığı incelemeye hazır. Canlı deployment ve ticket DONE kararı hazır değildir.**
- Executor sırası: PR diff + CI incele → provider preflight/kota → staging kaynakları ve smoke → production kaynakları/migration/release gate → Vercel domain promotion → URL/SHA/schema evidence → ancak sonra merge/deploy politikasına göre ticket kapanışı.
- Main'e merge yapılmadı.
