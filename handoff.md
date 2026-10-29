# Ticket Handoff — FND-003 Railway Docker Build Compatibility Fix

## 1. Ticket ve branch

- Ticket: `FND-003` hedefli devamı — Railway Docker build compatibility fix
- Branch: `codex/fnd-003-railway-docker-build`
- Base branch/SHA: `main` / `278cacda8a5ad6453651ecd2f2820cafebd12f25`
- Doğrulanan implementation head (handoff commit'i öncesi): `493e5f9a7684a96830b1f8ca0a2ebd902f8e7c57`
- PR: https://github.com/kostak-fraud/kostak-fraud-tool/pull/5
- Kısa amaç: Railway'in reddettiği anonymous BuildKit Maven cache mount'unu kaldırmak; mevcut Java 25 image/runtime sözleşmesini değiştirmeden API ve Worker image build'ini tekrar mümkün hâle getirmek.

## 2. Railway Docker build compatibility fix

Railway'de hem `kostak-fraud-tool` API hem `kostak-worker` image build'i aşağıdaki parser hatasıyla durdu:

```text
dockerfile invalid: flag '--mount=type=cache,target=/root/.m2' is missing an id argument at Line 10
```

Uygulanan çözüm:

- `backend/Dockerfile` içindeki `RUN --mount=type=cache,target=/root/.m2 ...` kaldırıldı; standart `RUN ./mvnw -B -DskipTests package ...` kullanılıyor.
- Maven dependency cache optimizasyonundan vazgeçildi; build taşınabilirliği tercih edildi.
- Java 25 build/runtime stage'leri, iki pinned image digest'i, multi-stage JAR copy, non-root `10001:10001`, `JAVA_TOOL_OPTIONS`, port ve `ENTRYPOINT ["java", "-jar", "/app/application.jar"]` değişmedi.
- `APP_MODE=api|worker|migrate` tek immutable image davranışı değiştirilmedi.
- `backend-ci`, Railway uyumsuz cache mount yeniden eklenirse gerçek Docker build başlamadan fail edecek regresyon kontrolü içeriyor. Required job adı `backend-ci` değişmedi.

Değişen dosyalar:

- `backend/Dockerfile`
- `.github/workflows/ci.yml`
- `handoff.md`

Doğrulama:

| Kontrol | Sonuç | Kanıt / not |
|---|---|---|
| Railway cache-mount regresyon kontrolü | PASS | `backend-ci` cache mount bulunmadığını doğruladı |
| `docker build --tag ... backend` | PASS (CI) | GitHub Actions run `40805235908`, gerçek `backend/` context build'i |
| Java 25 Maven package/image build | PASS (CI) | Docker build logunda Maven `BUILD SUCCESS` |
| Runtime user | PASS (CI) | Image inspect sonucu `10001:10001` assertion'ı geçti |
| API healthcheck smoke | PASS (CI) | `/app/worker-healthcheck.sh`, `APP_MODE=api` |
| Worker eksik-heartbeat negative smoke | PASS (CI) | Healthcheck eksik heartbeat'i başarı saymadı |
| Backend testleri | PASS (CI) | 17 unit/application + PostgreSQL 17.11/18.3 integration testleri |
| Frontend ve release yardımcıları | PASS (CI) | `frontend-ci`; 10 release testi, lint/typecheck/test/build |
| Lokal release helper testleri | PASS | 10/10 |
| Lokal worker healthcheck shell testleri | PASS | WSL üzerinden |
| Compose runtime config | PASS | `docker compose --profile runtime config --quiet` |
| Lokal image build | UNVERIFIED | Docker Desktop process'leri vardı fakat daemon iki context'te de yanıt vermedi; komut kontrollü olarak durduruldu |

PR açılması mevcut Git entegrasyonu tarafından otomatik bir Vercel **Preview** deployment'ı tetikledi ve check başarılı oldu. Worker manuel Vercel/Railway deployment veya production promotion başlatmadı. Bu PR Railway canlı redeploy kanıtı değildir.

Railway'de yeniden deployment öncesi:

1. Her iki servisin build root/context ayarının `backend/` ve Dockerfile'ın bu context içindeki `Dockerfile` olduğundan emin ol.
2. API'de `APP_MODE=api`, Worker'da `APP_MODE=worker` değerini; `APP_ENV` ile `SPRING_PROFILES_ACTIVE` tutarlılığını kontrol et.
3. Provider start command'in image `ENTRYPOINT`ini yanlışlıkla override etmediğini doğrula.
4. API/Worker ile aynı revision kullanan migration adımını DB rollout'tan önce ayrıca doğrula; bu fix DB veya Flyway'i canlıda çalıştırmadı.
5. Supabase connection/TLS/credential ve `APP_RELEASE_SHA` değerlerini secret çıktısı almadan kontrol et.
6. Önce build logunda Dockerfile parser aşamasının geçtiğini, ardından API readiness ve Worker heartbeat'i doğrula.

## 3. Önceki FND-003 tesliminden devralınanlar

Bu bölüm `main`e merge edilmiş önceki FND-003 handoff özetidir ve tarihsel olarak Northflank adını içerir. HQ'nun güncel hedefi Railway'dir; bu dar compatibility PR'ı deployment mimarisi ve provider dokümanlarını baştan yazmaz.

- `APP_MODE=api|worker|migrate` authoritative runtime preflight'i eklendi. API/Worker Flyway'i açamaz; Migration non-web çalışır, Flyway'i çalıştırır ve tamamlanınca exit eder.
- Staging/Production için explicit ve birbiriyle uyumlu `APP_ENV` / `SPRING_PROFILES_ACTIVE`, tam 40 karakter commit SHA, TLS'li ve database adı açık PostgreSQL URL'si, ayrı credential, en fazla 4 bağlantılık pool ve API Supabase Auth sözleşmesi fail-fast doğrulanır. Deployed Spring profili `APP_ENV` olmadan, deployed `APP_ENV` ise eşleşen aktif profil olmadan başlayamaz. IAM/JWT enforcement uygulanmadı; `IAM-001` kapsamındadır.
- API startup DB probe, DB-backed readiness ve exact runtime SHA veren `/actuator/info` eklendi. Release gate hem readiness `UP` hem exact SHA eşleşmesi ister.
- Worker DB startup probe, periyodik redacted heartbeat, non-daemon sürekli process ve graceful shutdown uygulandı. Worker healthcheck eksik, symlink, bayat veya `db_status=DOWN` heartbeat'i reddeder.
- Java 25 multi-stage, digest-pinned, non-root Docker image ve local Compose `postgres → migrate → api/worker` sırası eklendi.
- PostgreSQL 17.11 ve 18.3 üzerinde iki eşzamanlı Flyway migrator, schema doğrulama ve jOOQ probe testleri eklendi. Bu, Flyway yarış kilidini ve V1 idempotency davranışını sınar.
- `release-ready`, aynı `main` CI run'ında `frontend-ci` + `backend-ci` başarılarını bekler ve check SHA / release SHA / checkout SHA eşitliğini doğrular. Northflank başlamadan hemen önce ve provider smoke sonrasında GitHub ref API'sinden güncel main HEAD tekrar okunur; eski geç tamamlanan veya HEAD'i doğrulanamayan otomatik run fail-closed olur. Böylece hem `workflow_run` check association hem de concurrency'nin garanti etmediği commit ordering riski kapatıldı. Northflank run benzersiz adla tetiklenir, run ID bulunur, SHA/branch arguments doğrulanır ve sonuç başarıya kadar poll edilir. Manuel SHA, repo kodu çalıştırılmadan önce `origin/main` ancestry kontrolünden geçer; manuel job latest-main kısıtına tabi değildir ve farklı `manual-release` adıyla Vercel gate'ini açamaz.
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

## 4. Önceki FND-003 kabul kriterleri ve test kanıtı

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
| Eski otomatik commit'in yeni revision üzerine yayınlanmaması | PASS (repository scope) / LIVE UNVERIFIED | Rollout öncesi + smoke sonrası latest-main guard; hızlı iki push regresyon testi; gerçek Northflank run'ı yok |
| Production secret repo/PR/log dışı | PASS (repository scope) | Secret pattern taraması yalnız yasaklayıcı doküman referanslarını buldu; PR workflow production secret kullanmıyor |
| Canlı URL, schema version, provider revision ve smoke | NOT RUN / BLOCKER | Harici Northflank, Supabase ve Vercel kaynakları kurulmadı; kanıt uydurulmadı |

Test özeti:

- Second revision PR CI: https://github.com/kostak-fraud/kostak-fraud-tool/actions/runs/40798968050
  - `frontend-ci`: PASS — 10 release/workflow gate testi + worker healthcheck script, frozen install, lint, typecheck, 2 frontend test, Next.js production build.
  - `backend-ci`: PASS — Java 25 Maven verify; 17 unit/application test + 2 PostgreSQL integration testi; PostgreSQL 17.11 ve 18.3; Docker image build/non-root/healthcheck smoke.
  - `release-ready`: PR context'inde tasarım gereği `skipped`; job yalnız `main` push'unda ve iki required job başarılıysa çalışır.
- Lokal `corepack pnpm install --frozen-lockfile`: PASS.
- Lokal `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`: PASS.
- Lokal release gate/workflow sözleşme Node testleri: PASS, 10/10.
- Lokal worker healthcheck WSL/Linux testi: PASS.
- `docker compose --profile runtime config --quiet`: PASS.
- `git diff --check`: PASS.
- Secret pattern taraması: PASS; gerçek secret bulunmadı.
- Lokal backend revision testi: UNVERIFIED — makinede Java 17 var; proje Java 25 istediği için Maven derleme başlamadan `release version 25 not supported` ile durdu. Aynı revision Java 25 PR `backend-ci` üzerinde tamamen geçti.
- Lokal Docker/üç-mode Compose smoke: UNVERIFIED — Docker Desktop process/daemon yanıt vermedi. Aynı revision Dockerfile'ı PR `backend-ci` üzerinde build edildi; non-root `10001:10001` ve image healthcheck smoke geçti.
- Manuel UI/UX: Uygulanmadı; bu ticket yeni kullanıcı ekranı içermiyor.

## 5. Güvenlik ve operasyon

- Tenant/RBAC: İşlem/tenant verisi veya authorization eklenmedi. Supabase URL/JWKS/audience yalnız fail-fast contract'tır; gerçek JWT validation ve backend membership `IAM-001` kapsamındadır.
- Secret güvenliği: Frontend yalnız `NEXT_PUBLIC_*` publishable değerlerini kabul eder. DB password, Northflank token ve provider deployment secretları yalnız provider/protected environment store'larında tanımlanmalıdır.
- Release güvenliği: Otomatik production release yalnız aynı `main` CI run'ında iki required job başarılı olduktan, `GITHUB_SHA == RELEASE_SHA == checkout SHA` doğrulandıktan ve release SHA rollout öncesinde güncel main HEAD çıktıktan sonra protected `production` environment'ta çalışır. Provider smoke sonrasında latest-main kontrolü tekrar geçmeden check başarılı olmaz. GitHub ref API hatası da fail-closed'dur. Manuel SHA `main` ancestry doğrulanmadan repository script'i çalıştırılmaz; manuel rollback latest-main kısıtından bilinçli olarak muaftır ve `manual-release` check'i Vercel `release-ready` kapısını karşılayamaz.
- Migration: API/Worker Flyway'i açamaz. Northflank workflow concurrency `forbid` ve explicit migration/wait sırası ile kurulmalıdır. Destructive rollback yok; backup/recovery + fix-forward kullanılır.
- Rollback: Schema ile uyumlu önceki immutable API/Worker image'ına ve önceki Vercel deployment'ına dönüş mümkündür; schema otomatik geri alınmaz.
- Gözlemlenebilirlik: API readiness ve release SHA; Worker redacted heartbeat/DB status/release SHA sağlar. Full JDBC URL veya credential loglanmaz.

## 6. Bilinen eksikler ve riskler

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

## 7. Sonraki aksiyon

- İncelemeye hazır mı? **Evet, repository/PR hazırlığı incelemeye hazır. Canlı deployment ve ticket DONE kararı hazır değildir.**
- Executor sırası: PR diff + CI incele → provider preflight/kota → staging kaynakları ve smoke → production kaynakları/migration/release gate → Vercel domain promotion → URL/SHA/schema evidence → ancak sonra merge/deploy politikasına göre ticket kapanışı.
- Main'e merge yapılmadı.
