# Deployment Runbook — Railway, Vercel ve Supabase

**Güncel:** 2026-10-29  
**Durum:** Staging API/Worker çalışır durumda. Production Railway projesi ayrı ve boş; otomatik production release bilerek fail-closed.  
**Kapsam:** Ortam sözleşmesi, secret sınırları, release hazırlığı ve smoke kanıtı. Bu belge canlı production deployment yapıldığı anlamına gelmez.

## 1. Mevcut gerçek durum

| Kaynak | Mevcut durum | Güvenlik notu |
|---|---|---|
| Railway staging project | accomplished-vibrancy, environment staging | API + Worker tek replica; son doğrulanan SHA 614bafe8 |
| Railway staging API | kostak-fraud-tool, service ID 339a4353-7b6e-4ff6-a8cd-290048d87db3 | APP_MODE=api, readiness /actuator/health/readiness, port 8080 |
| Railway staging Worker | kostak-worker, service ID 5ba0ffb7-4e9f-46ee-8a14-c6e7e05f4d45 | Public domain yok; heartbeat + DB status kontrolü |
| Railway production project | kostak-fraud-production, project ID 88aee7c7-224e-4fac-a87b-c72ac4d956f0 | production environment boş; servis/deployment/secret kopyalanmadı |
| Supabase staging | kostak-fraud-staging, ref hsefejuxovhilcuexqzr | Flyway V1 başarıyla çalıştı |
| Supabase production | kostak-fraud-prod, ref fiyawipisqyfgvgkmvxn | Proje aktif; production migration çalıştırılmadı |
| Vercel | kostak-fraud-tool, root frontend/ | Preview API URL staging'e bağlı; main Git-triggered deploy kapalı |
| Public HTTP smoke | UNVERIFIED | Mevcut executor/web ağında Railway DNS/HTTP isteği doğrulanamadı |

## 2. Mimari

- Vercel yalnız frontend/ Next.js uygulamasını çalıştırır.
- Railway API ve Worker ayrı sürekli Java process'leridir; staging ortamında aynı repository revision'ını kullanırlar.
- Supabase PostgreSQL ve Auth ayrı staging/production projelerindedir.
- API/Worker startup migration çalıştırmaz. Migration davranışı APP_MODE=migrate ve SPRING_FLYWAY_ENABLED=true ile explicit olarak çağrılır.
- Üretim release'i için hedef sıralama: exact SHA → backend image build → migration başarı → API deploy/readiness → Worker deploy/heartbeat → exact SHA ve latest-main smoke → Vercel production promotion. Bu sıralama henüz canlı Railway production ortamında uygulanıp doğrulanmadı.

## 3. Backend environment contract

| Değişken | Beklenen değer / kullanım |
|---|---|
| APP_MODE | API api, Worker worker, migration migrate |
| APP_ENV | staging veya production; Railway environment adıyla uyumlu tutulur |
| SPRING_PROFILES_ACTIVE | APP_ENV ile eşleşir |
| APP_RELEASE_SHA | Tam 40 karakter lowercase Git commit SHA |
| SPRING_DATASOURCE_URL | PostgreSQL JDBC URL, database adı açık, TLS sslmode=require veya daha güçlü |
| SPRING_DATASOURCE_USERNAME/PASSWORD | Runtime'a özel least-privilege DB role; secret store'da tutulur |
| SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE | Küçük değer; deployed preflight en fazla 4 kabul eder |
| SPRING_FLYWAY_ENABLED | API/Worker false, migration true |
| SPRING_FLYWAY_URL/USER/PASSWORD | Gerekliyse migration'ın ayrı bağlantı bilgileri; staging'de Flyway history oluşturma timeout'unda bu ayrı bağlantı sözleşmesi kullanıldı. Secret değerleri loglama. |
| SUPABASE_URL | API Auth config'i için doğru environment Supabase URL |
| SUPABASE_JWKS_URL | HTTPS Supabase JWKS endpoint |
| SUPABASE_JWT_ISSUER | Supabase Auth issuer |
| SUPABASE_JWT_AUDIENCE | Onaylı audience; tipik authenticated, ancak runtime'da açıkça ayarlanır |
| APP_CORS_ALLOWED_ORIGINS | Tam ve HTTPS Vercel origin'leri; production'da * yasak |
| APP_WORKER_HEARTBEAT_INTERVAL | Varsayılan 30s |
| APP_WORKER_HEARTBEAT_FILE | Writable path; varsayılan /tmp/kostak-worker-heartbeat |
| APP_WORKER_HEARTBEAT_MAX_AGE_SECONDS | Heartbeat freshness sınırı |

Production secret değerleri GitHub issue, PR, handoff, Vercel frontend env veya chat içine yazılmaz. Gerekli DB password bilgisi Supabase dashboard'dan güvenli şekilde alınmalı/oluşturulmalı ve doğrudan Railway production secret store'una girilmelidir. Var olan production parolası bu bağlantıdan okunamadığı için otomatik reset/rotation yapılmadı.

## 4. Railway staging ve production

### Staging
- Project accomplished-vibrancy, environment adı staging.
- API service ID 339a4353-7b6e-4ff6-a8cd-290048d87db3; Worker ID 5ba0ffb7-4e9f-46ee-8a14-c6e7e05f4d45.
- API public URL: https://kostak-fraud-tool-production.up.railway.app. Host adı eski environment adına bağlı kalmış olabilir; environment rename domain adını otomatik değiştirmedi.
- Son gözlenen API ve Worker deployments 614bafe8 SHA'sında SUCCESS ve 1/1 replica idi. Recent failed attempts kayıtta kaldı; current state ile karıştırılmamalı.
- Worker healthcheck gerçek heartbeat dosyasının güncelliğini ve db_status=UP bilgisini ister.

### Production
- Ayrı project kostak-fraud-production, environment production oluşturuldu; şu anda hiç service yok.
- Bu proje bilerek staging'den kopyalanmadı. API/Worker service ve variable ekleme öncesi production DB role, password, TLS endpoint ve auth config güvenli secret store'a hazır olmalı.
- Production service source/main branch ayarı yapılırken bağımsız Git auto-deploy açılmamalı. Release gate tamamlanmadan production deployment veya migration başlatılmamalı.

## 5. Vercel

- Project kostak-fraud-tool, root directory frontend/, framework Next.js, Node 24.x.
- frontend/vercel.json içindeki git.deploymentEnabled.main=false, Git ile main branch'inden otomatik production deployment'ı kapatır; feature branch Preview'ları açık kalır.
- NEXT_PUBLIC_API_BASE_URL yalnız Preview hedefinde Railway staging API URL'sidir. Production hedefinde staging API URL'si oluşturulmaz.
- NEXT_PUBLIC_SUPABASE_URL Preview'da staging Supabase, Production'da production Supabase URL'sini kullanır. Publishable key'ler yalnız ilgili environment'a ayrı atanır; DB password/service role frontend'e verilmez.
- Vercel production deployment 614bafe8 için daha önceki deneme CANCELED durumunda. Main deploy guard merge edildikten sonra yeni main merge'i production deployment oluşturmamalıdır; bu davranış deployment listesiyle tekrar doğrulanır.
- Production deployment check veya staged candidate/promote akışı kurulmadan main auto deploy açılmaz.

## 6. Release gate — şu anda fail-closed

- DEPLOYMENT_AUTOMATION_ENABLED true olmadıkça release-ready job'u skipped olur.
- Otomasyon yanlışlıkla true yapılırsa bile mevcut CI ve manual-release workflows Railway release orchestration hazır olmadığı için fail-closed olur; Northflank runner devre dışıdır ve hiçbir provider isteği göndermez.
- release-ready yeşil olmadan production domain promotion yapılmamalı. Şimdiki yapılandırma production release'inin doğrulandığı anlamına gelmez.
- Otomasyonu açmadan önce:
  1. Production Railway API/Worker servislerini ve environment-specific secret'ları hazırla.
  2. Tek exact revision/image için migration-first sırasını çalıştır ve hata durumunda rollout'un durduğunu kanıtla.
  3. API readiness + /actuator/info exact SHA ve Worker heartbeat/DB status smoke testini gerçek URL'den geçir.
  4. Latest-main guard'ı release öncesi ve sonrası doğrula.
  5. Vercel Production domain assignment/promotion adımının release gate'i beklediğini kanıtla.
  6. Ancak bundan sonra otomasyon için ayrı değişiklik ve açık release onayı yap.

## 7. Smoke kontrolü

DNS erişimli bir runner'dan:

- GET https://<api-host>/actuator/health/liveness → HTTP 200 / UP.
- GET https://<api-host>/actuator/health/readiness → HTTP 200 / UP, DB component healthy.
- GET https://<api-host>/actuator/info → app.release.sha beklenen tam SHA.
- Worker deploy log/heartbeat: son heartbeat yaşı limitin altında, db_status=UP, APP_RELEASE_SHA API ile aynı.
- Migration log: exit code 0, Flyway version/checksum; yalnız staging'de şu anki V1 uygulanmış durumda.
- Vercel Preview HTML/JS, Preview API URL ve staging Supabase URL'si staging'e işaret eder. Production target için henüz çalışan API yok.
- Gerçek URL veya HTTP cevabı yoksa placeholder kanıt sayılmaz. Bu runbook'ta public smoke UNVERIFIED durumundadır.

## 8. Migration ve recovery

- İlk Railway staging migration denemesinde Flyway history oluşturma sırasında bağlantı/pool timeout yaşandı. Ayrı SPRING_FLYWAY_URL/USER/PASSWORD değerleriyle staging V1 başarılı oldu; migration-mode Hikari davranışı için regression testi eklenmeli.
- Production'a V1 veya sonraki migration'ı bu runbook nedeniyle çalıştırma. Önce production service/credential ve backup/recovery durumu doğrulanmalı.
- Migration başarısızsa API/Worker rollout yapılmaz; mevcut uyumlu revision ayakta kalır. Uygulanmış migration düzenlenmez; yeni versioned fix-forward migration tercih edilir.
- API/Worker regression'da schema ile uyumlu önceki immutable revision'a dönülür. DB schema otomatik rollback edilmez.
- Secret sızıntısında secret rotate edilir, erişim/log/artifact incelenir ve yalnız gerekli service rollout yapılır.

## Resmî sağlayıcı referansları
- Railway: https://docs.railway.com/
- Supabase Postgres connections: https://supabase.com/docs/guides/database/connecting-to-postgres
- Supabase SSL enforcement: https://supabase.com/docs/guides/platform/ssl-enforcement
- Supabase JWT/JWKS: https://supabase.com/docs/guides/auth/jwts
- Vercel Git deployment configuration: https://vercel.com/docs/project-configuration/git-configuration
- Vercel environment variables: https://vercel.com/docs/environment-variables
