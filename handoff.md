# Ticket Handoff — FND-001

## 1. Ticket ve branch

- Ticket: `FND-001`
- Branch / commit SHA: `feat/fnd-001-scaffold` / implementation `fc603040d3ad4267ca4f23d2b021ee3e84e0dbdb` (bu dosya ayrı handoff commit'indedir)
- Başlangıç SHA doğrulaması: `d976e63a53302e46564a5d68e984aa621c329054` branch'in ancestor'ıdır.
- Kısa amaç: Java 25 / Spring Boot 4.1.1 backend, Next.js 16.4.2 frontend, lokal PostgreSQL 18.3 ve health/AppShell foundation scaffold'u.

## 2. Yapılan değişiklikler

- Davranışsal değişiklik: `/actuator/health` ve `/actuator/health/readiness` endpoint'leri eklendi; sade AppShell ana sayfası ve semantik sidebar/navigation/main yapısı oluşturuldu.
- Önemli dosya/klasörler: `backend/`, `frontend/`, `compose.yaml`, `.env.example`, `.gitignore`, `.gitattributes`, root `README.md`.
- DB schema/migration/env etkisi: `V1__create_scaffold_probe.sql` yalnız genel amaçlı `scaffold_probe` tablosu ve tek sentetik probe satırı oluşturur. Lokal Compose PostgreSQL host portu, makinedeki 5432 çakışmasını önlemek için varsayılan `55432` olarak belgelenmiştir.
- Sürüm disiplini: Spring Boot `4.1.1`, Java release `25`, Maven Wrapper `3.3.4` + Maven `3.9.12`, Next.js `16.4.2`, Node `24.20.0`, pnpm `11.24.0` ve doğrudan frontend dependency'leri exact sürümdür. TanStack Table bilinçli olarak v8 (`8.21.3`) tutuldu.

## 3. Kabul kriterleri ve test kanıtı

| Kriter | Sonuç | Kanıt (komut/dosya/ekran) |
|---|---|---|
| Java 25 + Spring Boot 4.1.1 + Maven Wrapper | Pass | Temurin `25.0.4.1`; `backend\\mvnw.cmd -B verify` → `BUILD SUCCESS` |
| PostgreSQL Testcontainers + Flyway + jOOQ integration | Pass | Failsafe `DatabaseIntegrationIT`: PostgreSQL `18.3`, Flyway v1 uygulandı, jOOQ probe count `1`; test sayısı 1, hata 0 |
| Backend context smoke | Pass | Surefire `KostakApplicationTest`: test sayısı 1, hata 0 |
| Next.js strict + lockfile | Pass | `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm build`; statik `/` route üretildi |
| Frontend lint/test | Pass | `pnpm lint`; `pnpm test` → 1 dosya, 2 test geçti |
| AppShell render ve klavye sırası | Pass | Testing Library render testi + `userEvent.tab()` focus testi |
| Compose yapı ve health | Pass | `docker compose config`; `docker compose up -d postgres`; `docker compose ps` → PostgreSQL `healthy`, host `55432` |
| Lokal Flyway migration | Pass | Backend startup log: `Successfully applied 1 migration`; DB sorgusu: `1:true`, `scaffold_probe` count `1` |
| Health / readiness smoke | Pass | `GET /actuator/health` → `{"groups":["liveness","readiness"],"status":"UP"}`; readiness → `{"status":"UP"}` |
| README/env/troubleshooting | Pass | Root `README.md`, `.env.example`; port, unhealthy DB, tool version, Docker/Testcontainers ve credential konuları mevcut |
| Secret / gerçek veri yok | Pass | Yalnız sentetik lokal değerler; hedefli token/private-key taraması eşleşme bulmadı |

- Lint: `pnpm lint` başarılı.
- Typecheck: `pnpm typecheck` başarılı, TypeScript `strict: true`.
- Unit/integration test: `backend\\mvnw.cmd -B verify` başarılı; frontend 2 test başarılı.
- Build: Spring Boot jar ve `pnpm build` başarılı.
- Manuel UI/UX test adımları: Frontend `pnpm dev` ile açıldı; Edge headless görüntüsü `1280x900` alınıp incelendi. Sidebar ve içerik üst üste binmiyor, yatay taşma yok, aktif `Overview` açık, sahte fraud aksiyonu yok. Klavye ilk Tab hedefi otomatik testte `Overview`; görünür focus ring merkezi `--focus` token'ına bağlıdır. Computer-use tarayıcı oturumu yerel kernel asset yolu hatasıyla açılamadığı için interaktif ekran turu headless görüntü + DOM/test kanıtıyla tamamlandı.

## 4. Güvenlik ve operasyon

- Tenant/RBAC kontrolü: Bu ticket kapsamında auth/tenant/RBAC yok; frontend doğrudan DB erişimi eklemez.
- Yarış koşulları/transaction atomicity: Domain işlemi yok; kapsam dışı.
- Health güvenliği: `show-details: never`; response credential, connection string veya DB ayrıntısı açığa çıkarmıyor.
- Migration/deploy/rollback notları: Migration additive ve versioned'dır. Production deploy yoktur. Geri dönüş gerekirse destructive otomatik rollback yerine sonraki versioned forward-fix migration kullanılmalıdır.
- Compose kapanışı: `docker compose down` çalıştırıldı; named volume silinmedi.

## 5. Bilinen eksikler ve riskler

- Blocker var mı? Hayır.
- Ortam notu: Makinenin varsayılan Java'sı 17 idi; doğrulama taşınabilir Temurin 25 ile yapıldı. Normal kullanım için README'deki Java 25 önkoşulu karşılanmalıdır.
- Uyumluluk notu: `eslint-config-next@16.4.2` peer aralığı ESLint 10'u henüz kabul etmediği için exact `eslint@9.39.2` kullanıldı; lint/build başarılıdır.
- Bilinçli kapsam dışı maddeler: CI/GitHub Actions, deploy, Supabase/Auth/JWT, tenant/RBAC, transaction/domain tabloları, worker/job/outbox, rule engine, transaction grid ve gerçek fraud davranışı.
- Executor'ın özellikle gözden geçirmesi gereken yer: Başlangıçta çalışma klasöründe Git metadata yoktu ve bazı dokümantasyon dosyaları remote branch'e göre önceden değiştirilmişti. Git branch doğru SHA'ya bağlandı; bu pre-existing docs değişiklikleri Worker commit'lerine alınmadı ve çalışma ağacında korunuyor.

## 6. Sonraki aksiyon

- İncelemeye hazır mı? Evet.
- Worker'ın kısa rapor özeti: FND-001 scaffold'u backend, frontend, lokal PostgreSQL ve dokümantasyonla tamamlandı. Zorunlu backend/frontend/Compose kontrolleri ile lokal migration ve health smoke geçti. Main'e merge veya push yapılmadı; Executor mevcut branch commit'lerini ve korunmuş pre-existing docs değişikliklerini ayrı ayrı incelemelidir.
