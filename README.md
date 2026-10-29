# Fraud Monitoring Platform — Proje HQ Dokümantasyonu

**Sürüm:** v0.3 — Gereksinimler + mimari + UX blueprint + bağımlılık sıralı backlog  
**Tarih:** 2026-10-29
**Durum:** Ürün gereksinimleri ve stack seçildi; FND-001 scaffold, FND-002 CI ve UI-001 temel arayüz main'de. Railway staging API/Worker çalışıyor. Production Railway projesi ayrı ama boş; production release otomatik başlatılmıyor.
**Amaç:** UMDE ve bitirme projesi için çalışan akademik ürün; ileride farklı ödeme kuruluşlarına sunulabilecek güvenilir bir temel.

## Nereden başlamalı?

| İhtiyaç | Tek referans belge |
|---|---|
| Ürün hedefi, teslim sınırı ve özellik kapsamı | [`docs/PRODUCT.md`](docs/PRODUCT.md) |
| İşlem statüleri, skor, bloklama, kilit ve toplu aksiyon kuralları | [`docs/DOMAIN.md`](docs/DOMAIN.md) |
| No-code kuralların ifade edebilmesi gereken mantık | [`docs/RULE_ENGINE.md`](docs/RULE_ENGINE.md) |
| Seçilmiş diller, frameworkler, test araçları, hosting | [`docs/TECH_STACK.md`](docs/TECH_STACK.md) |
| Topoloji, domain modülleri, ingestion, rule evaluation ve tenant erişim tasarımı | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| Mimari kararların gerekçeleri ve vazgeçilen seçenekler | [`docs/adr/`](docs/adr/) |
| Ekran ve kullanılabilirlik sözleşmesi | [`docs/UX.md`](docs/UX.md) |
| Somut UI şemaları, component/token ve manuel UX testi | [`docs/UI_BLUEPRINT.md`](docs/UI_BLUEPRINT.md) |
| Önerilen mock transaction alanları | [`docs/DATA_DICTIONARY.md`](docs/DATA_DICTIONARY.md) |
| Kural yürütme zaman/aggregate semantiği varsayımları | [`docs/ENGINE_SEMANTICS.md`](docs/ENGINE_SEMANTICS.md) |
| RBAC izin matrisi / tenant erişimi | [`docs/RBAC.md`](docs/RBAC.md) |
| Executor → Worker → Executor, CI/CD ve kalite kapıları | [`docs/DELIVERY.md`](docs/DELIVERY.md) |
| Railway, Vercel ve Supabase kurulum/deploy/smoke adımları | [`docs/DEPLOYMENT_RUNBOOK.md`](docs/DEPLOYMENT_RUNBOOK.md) |
| Onaylanmış kararlar, varsayımlar ve açık sorular | [`docs/DECISIONS.md`](docs/DECISIONS.md) |
| 1 haftalık rapor ve 2 aylık yürütme planı | [`docs/ROADMAP.md`](docs/ROADMAP.md) |
| Backlog indeks ve her ticket’ın tekil kabul kriterleri | [`backlog/INDEX.md`](backlog/INDEX.md) ve [`backlog/`](backlog/) |
| İlk hafta ilerleme raporu (taslak) | [`docs/PROGRESS_REPORT.md`](docs/PROGRESS_REPORT.md) |
| Her ajan için kısa çalışma talimatı | [`AGENTS.md`](AGENTS.md) |
| Executor başlangıç metni, Worker handoff şablonu | [`templates/EXECUTOR_BASE.md`](templates/EXECUTOR_BASE.md), [`templates/HANDOFF_TEMPLATE.md`](templates/HANDOFF_TEMPLATE.md) |

## Dokümantasyon kuralı

- **Tek kaynak ilkesi:** Davranışın teknik ayrıntısı yalnızca kendisine ayrılmış belgede bulunur; başka belgeler bağlantı verir. `DECISIONS.md` kararın **kısa kaydı** ve karara ait belgenin bağlantısını barındırır; davranışı tekrar anlatmaz.
- **Statü ayrımı:** `[ONAYLI]` kullanıcıyla kararlaştırıldı, `[HQ UYGULAMA TEMELİ]` / `[HQ VARSAYIMI]` uygulanabilir teknik öneridir ve kullanıcı onayı değildir, `[ÖNERİ]` henüz benimsenmedi, `[AÇIK]` çözülemedi. Karar olmayan bir öneri, ticket'a kesin zorunluluk gibi aktarılmaz.
- **Değişiklik disiplini:** Bir iş kuralı değiştiğinde önce yetkili belgesi, sonra gerekiyorsa karar günlüğü ve ilgili ticket/acceptance criteria güncellenir.
- **Şirket gizliliği:** Kuruma ait ekran görüntüsü, gerçek müşteri/işlem verisi, kurum içi belgeler ve tescilli kural tanımları kullanılmaz. Tüm örnekler sentetiktir.

> **Ajanlar için:** Yalnızca bu README'i değil, [`AGENTS.md`](AGENTS.md) dosyasını ve ilgili ticket'ın bağlandığı tekil gereksinim belgelerini okuyun. Chat geçmişi, kod üretmek için gerekmemelidir.

## Lokal geliştirme

Bu scaffold yalnız sentetik lokal değerler kullanır. CI kalite kapısı mevcuttur; Railway staging çalışır, ancak production projesi ve production API deployment'ı henüz hazır değildir.

### Önkoşullar

- Eclipse Temurin veya uyumlu bir **Java 25** JDK
- **Node.js 24.20.0** ve Corepack
- `frontend/package.json` içinde sabitlenen **pnpm 11.24.0**
- Docker Engine ve Docker Compose
- Maven kurulumu gerekmez; `backend/mvnw` sabitlenmiş **Maven 3.9.12** sürümünü indirir.

### Environment ve PostgreSQL

PowerShell örneği:

```powershell
Copy-Item .env.example .env
docker compose config
docker compose up -d postgres
docker compose ps
```

PostgreSQL satırı `healthy` olana kadar bekleyin. `.env` yalnız lokal sentetik credential içerir ve Git tarafından izlenmez.

Backend'i çalıştırmadan önce aynı değerleri terminale yükleyin:

```powershell
Get-Content .env | ForEach-Object {
  if ($_ -match '^[^#].*=') {
    $name, $value = $_ -split '=', 2
    Set-Item -Path "Env:$name" -Value $value
  }
}
```

### Backend

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Uygulama başladıktan sonra:

- Health: http://localhost:8080/actuator/health
- Readiness: http://localhost:8080/actuator/health/readiness
- Release info: http://localhost:8080/actuator/info

Backend doğrulaması (Testcontainers için Docker çalışıyor olmalı):

```powershell
cd backend
.\mvnw.cmd -B verify
```

macOS/Linux üzerinde aynı komut `./mvnw -B verify` şeklindedir.

### Frontend

```powershell
cd frontend
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Arayüz http://localhost:3000 adresinde açılır. Ayrı ayrı kalite kontrolleri:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## CI ve PR kalite kapısı

GitHub Actions'taki `CI` workflow'u `main` hedefli her pull request'te ve `main` branch'ine yapılan her push'ta iki bağımsız kontrol çalıştırır:

- `frontend-ci`: Node.js 24.20.0 ve pnpm 11.24.0 ile frozen lockfile kurulumu, lint, typecheck, test ve production build.
- `backend-ci`: Temurin Java 25 ve Maven Wrapper ile `verify`; unit testleri, PostgreSQL Testcontainers integration testi, Flyway migration ve jOOQ sorgusunu kapsar.

Workflow production secret'larına veya harici bir veritabanına ihtiyaç duymaz. Backend integration testleri GitHub-hosted Linux runner'ın Docker ortamında geçici PostgreSQL 18.3 container'ları açar.

`main` korumasında required status check adları tam olarak `frontend-ci` ve `backend-ci` olmalıdır. Bir kontrol başarısız veya beklemedeyken PR merge edilmez; kontrolleri atlamak için path filtresi, `continue-on-error` veya koşullu job kullanılmaz.

### CI troubleshooting

- `frontend-ci` kurulumda kırılırsa `frontend/package.json` içindeki Node/pnpm sürümleri ile `frontend/pnpm-lock.yaml` dosyasının commit edildiğini ve `pnpm install --frozen-lockfile` komutunun lokal olarak geçtiğini doğrulayın.
- Lint, typecheck, test veya build hatasında ilgili `pnpm` komutunu `frontend/` altında aynı sırayla çalıştırın; workflow hata kodunu maskelemez.
- `backend-ci` Testcontainers/Docker hatası verirse job logunda Docker daemon erişimini ve `postgres:18.3-alpine3.23` image indirmesini kontrol edin. CI için ayrı PostgreSQL service veya production credential eklemeyin.
- Maven hatasını lokal olarak yeniden üretmek için Docker çalışırken `backend/` altında Windows'ta `.\mvnw.cmd -B verify`, Linux/macOS'ta `./mvnw -B verify` kullanın.
- Beklenen required check görünmüyorsa workflow'un PR tarafında en az bir kez koştuğunu ve ruleset'teki check adlarının `frontend-ci` / `backend-ci` ile birebir eşleştiğini kontrol edin.

## Deployment hazırlığı ve mevcut durum

Hedef topoloji Vercel web, iki ayrı Railway servisi üzerinde API + Worker ve Supabase PostgreSQL/Auth'tur. Aynı immutable backend image'ı `APP_MODE=api`, `APP_MODE=worker` ve tek seferlik `APP_MODE=migrate` davranışlarını sunar. Ayrıntılı environment sözleşmesi, sağlayıcı alanları, release sırası ve smoke kanıtı [`docs/DEPLOYMENT_RUNBOOK.md`](docs/DEPLOYMENT_RUNBOOK.md) içindedir.

Vercel main Git deployment'ları frontend/vercel.json ile kapalıdır. GitHub release workflows Railway orchestration doğrulanana kadar fail-closed'dur. Production migration, deployment ve promotion yapılmadı; FND-003 ancak gerçek production wiring + smoke kanıtı sonrası DONE sayılabilir.

### Ortamı durdurma

```powershell
docker compose down
```

Bu komut named volume'u silmez. Lokal veriyi silmek özellikle istenmiyorsa `docker compose down -v` kullanmayın.

### Troubleshooting

- **Port çakışması:** `.env` içindeki `POSTGRES_PORT` veya `SERVER_PORT` değerini boş bir porta alın. Frontend için `pnpm dev -- --port 3001` kullanılabilir; `SPRING_DATASOURCE_URL` PostgreSQL portuyla aynı kalmalıdır.
- **PostgreSQL unhealthy:** `docker compose ps` ve `docker compose logs postgres` çıktısını kontrol edin. Daha önce başka credential ile oluşmuş volume varsa mevcut veriyi silmeden önce içeriğinin gerekip gerekmediğini doğrulayın.
- **Java/Node/pnpm sürümü:** `java -version`, `node --version` ve `pnpm --version` çıktıları önkoşullarla eşleşmelidir. Corepack yanlış pnpm sürümü seçerse `corepack prepare pnpm@11.24.0 --activate` çalıştırın.
- **Docker/Testcontainers erişimi:** Docker Desktop/Engine'in çalıştığını ve mevcut kullanıcının Docker daemon'a erişebildiğini doğrulayın. Kurumsal proxy kullanılıyorsa image ve Maven indirmeleri için proxy ayarları gerekebilir.
- **DB credential veya bağlantı hatası:** `.env`, Compose container environment değerleri ve `SPRING_DATASOURCE_URL`/`SPRING_DATASOURCE_USERNAME`/`SPRING_DATASOURCE_PASSWORD` değerlerinin aynı database, kullanıcı ve porta işaret ettiğini doğrulayın.
