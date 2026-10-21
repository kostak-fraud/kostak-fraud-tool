# Ticket Handoff — FND-002

## 1. Ticket ve branch

- Ticket: `FND-002`
- Branch: `feat/fnd-002-ci`
- Başlangıç SHA: `b057cf9c1b55e49d01bbbe4651645364b21fc369`
- Implementation SHA (negatif test revert'i sonrası): `9a18751f56322bcaaeeaf0fa694b52e3e901de3e`
- Handoff commit'i: Bu dosyayı içeren branch head; kesin SHA Worker teslim mesajında verilir.
- Kısa amaç: Frontend ve backend için deterministik GitHub Actions kalite kapısı kurmak, iki check'i `main` için zorunlu yapmak ve kırmızı check'in merge'ü engellediğini gerçek PR üzerinde kanıtlamak.

## 2. Yapılan değişiklikler

- Davranışsal değişiklik: `main` hedefli PR'larda ve `main` push'larında `frontend-ci` ile `backend-ci` job'ları koşar. Job'lardan biri başarısızsa workflow ve required check başarısız olur.
- Workflow: `.github/workflows/ci.yml`; `contents: read`, koşul/path filtresi yok, `continue-on-error` yok, her job için 20 dakika timeout var. Resmî Action'lar tam commit SHA'larına sabitlendi.
- Frontend: Node.js `24.20.0`, pnpm `11.24.0`, `pnpm install --frozen-lockfile`, lint, typecheck, test ve build.
- Backend: Temurin Java `25`, Maven Wrapper `3.9.12`, `./mvnw -B verify`. Linux runner için `backend/mvnw` executable bit'i `100755` yapıldı.
- Dokümantasyon: `README.md` içine tetikleyiciler, required check adları, merge politikası ve troubleshooting eklendi.
- GitHub ayarı: Mevcut `main-protection` ruleset'i (`25592010`) korunarak `frontend-ci` ve `backend-ci`, GitHub Actions app integration ID `15368` kaynağıyla required status check yapıldı. Diğer aktif `main` ruleset'i (`25591830`) değiştirilmedi.
- DB schema/migration/env etkisi: Yeni migration veya environment variable yok. CI sadece testlerin geçici Testcontainers PostgreSQL instance'larını kullanır.

## 3. Kabul kriterleri ve test kanıtı

| Kriter | Sonuç | Kanıt (komut/dosya/ekran) |
|---|---|---|
| AC-1 Frontend CI | Pass | Nihai run `39679258690`, `frontend-ci` job `119497144771`: frozen install, lint, typecheck, 2/2 test ve Next.js production build geçti. |
| AC-2 Backend CI | Pass | Nihai run `39679258690`, `backend-ci` job `119497144387`: `./mvnw -B verify` ve `BUILD SUCCESS`; `KostakApplicationTest` 1/1, `DatabaseIntegrationIT` 1/1. |
| AC-3 İzole PostgreSQL integration | Pass | GitHub-hosted Linux logu PostgreSQL `18.3`, iki geçici container JDBC portu, Flyway v1 migration ve jOOQ testini gösteriyor. Service container, Supabase, secret veya harici DB kullanılmadı. |
| AC-4 PR kalite kapısı | Pass | `.github/workflows/ci.yml` hem `pull_request` hem `push` için yalnız `main` tetikleyicisine sahip; iki job adı sabit ve koşulsuz. |
| AC-5 Protected main / required checks | Pass | Aktif `main-protection` ruleset `25592010`: PR, deletion ve non-fast-forward kuralları korundu; required checks `frontend-ci` + `backend-ci` eklendi. Ruleset: https://github.com/kostak-fraud/kostak-fraud-tool/rules/25592010 |
| AC-6 Başarısız PR doğrulaması | Pass | Geçici failing test commit'i `f8fb0ce2040e99ba7468ea3b67ce64eb2bc2fcea`; run `39679075291`; `frontend-ci` job `119496495850` failure, `backend-ci` success. Aynı anda PR API sonucu `mergeable: MERGEABLE`, `mergeStateStatus: BLOCKED`. Değişiklik `9a18751...` revert commit'iyle kaldırıldı; force-push yok. |

- PR: https://github.com/kostak-fraud/kostak-fraud-tool/pull/3
- İlk başarılı workflow: https://github.com/kostak-fraud/kostak-fraud-tool/actions/runs/39678829817
- Negatif workflow: https://github.com/kostak-fraud/kostak-fraud-tool/actions/runs/39679075291
- Negatif `frontend-ci` job: https://github.com/kostak-fraud/kostak-fraud-tool/actions/runs/39679075291/job/119496495850
- Revert sonrası başarılı workflow: https://github.com/kostak-fraud/kostak-fraud-tool/actions/runs/39679258690
- Nihai `frontend-ci`: https://github.com/kostak-fraud/kostak-fraud-tool/actions/runs/39679258690/job/119497144771
- Nihai `backend-ci`: https://github.com/kostak-fraud/kostak-fraud-tool/actions/runs/39679258690/job/119497144387
- Lint: Lokal `pnpm lint` ve GitHub `frontend-ci` başarılı.
- Typecheck: Lokal `pnpm typecheck` ve GitHub `frontend-ci` başarılı.
- Unit/integration test: Lokal frontend 2/2. Backend, geçici Temurin Java 25.0.4.1 Linux container'ında `./mvnw -B verify` ile başarılı; GitHub runner'da Surefire ve Failsafe testleri ayrı ayrı geçti.
- Build: Lokal `pnpm build` ve GitHub frontend build geçti; Maven jar/repackage/verify geçti.
- Git: `git diff --check` geçti; final diff yalnız `.github/workflows/ci.yml`, `README.md`, `backend/mvnw` mode ve `handoff.md` içerir.
- Manuel UI/UX test adımları: Uygulanmadı; ticket kullanıcı ekranını değiştirmiyor. Mevcut AppShell otomatik testleri CI'da 2/2 geçti.

## 4. Güvenlik ve operasyon

- Workflow token izni yalnız `contents: read`; secret, credential, private key, `pull_request_target` veya production veri kaynağı yok.
- Action supply-chain sınırı: `actions/checkout` v7.0.1, `actions/setup-node` v7.1.0, `actions/setup-java` v6.1.0 ve `pnpm/action-setup` v6.1.0 tam commit SHA ile pinlendi.
- Testcontainers izolasyonu: GitHub-hosted runner Docker daemon'ında `postgres:18.3-alpine3.23` kullanır; ayrı PostgreSQL service eklenmedi.
- Tenant/RBAC kontrolü: Bu ticket uygulama auth/tenant davranışını değiştirmiyor; kapsam dışı.
- Yarış koşulları/transaction atomicity: Domain mutation yok; kapsam dışı.
- Ruleset etkisi: `main-protection` active ve bypass actor yok (`current_user_can_bypass: never`). Mevcut PR zorunluluğu, force-push ve deletion korumaları aynen korundu.
- Rollback: Workflow sorunu olursa önce düzeltme commit'i tercih edilir. Zorunlu geri dönüşte required check kuralı ruleset'ten kontrollü olarak kaldırılıp workflow commit'i revert edilir; ruleset'ler silinmez veya yeniden adlandırılmaz.

## 5. Bilinen eksikler ve riskler

- Blocker var mı? Hayır; AC-1–AC-6 gerçek GitHub kanıtlarıyla geçti.
- Yerel ortam notu: Windows host'un varsayılan Java'sı 17 olduğu için `.\mvnw.cmd -B verify` doğrudan host JVM'iyle koşturulmadı. Aynı kaynak, Maven Wrapper ve Docker daemon'ı Temurin Java 25.0.4.1 geçici Linux container'ından `./mvnw -B verify` ile doğrulandı; ayrıca asıl GitHub Linux job'u geçti.
- İlk container-içinde lokal deneme Docker Desktop host adresi nedeniyle Ryuk'a ulaşamadı ve sonlandırıldı. Tekrar denemede sadece bu lokal nested-container kurgusu için `TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal` ve `TESTCONTAINERS_RYUK_DISABLED=true` kullanıldı; GitHub workflow'una bu env'ler eklenmedi. Artık test container'ı kalmadı.
- Bilinçli kapsam dışı maddeler: FND-003 deployment, Vercel/Railway/Supabase, production secrets, auth/RBAC, fraud domain, UI yeniden tasarımı ve dependency upgrade.
- Executor'ın özellikle gözden geçirmesi gereken yer: Ruleset `25592010` içindeki required check adlarının ve GitHub Actions app source ID'sinin korunması; PR #3 final `CLEAN` durumu ve workflow logları.

## 6. Sonraki aksiyon

- İncelemeye hazır mı? Evet.
- Worker'ın kısa rapor özeti: FND-002 CI workflow'u, iki required check ve README dokümantasyonu tamamlandı. Frontend/backend yerel kontrolleri ile GitHub-hosted Linux CI geçti; PostgreSQL Testcontainers, Flyway ve jOOQ loglarla doğrulandı. Kontrollü kırmızı `frontend-ci` PR merge'ünü `BLOCKED` yaptı, sonra normal revert ile temizlendi ve iki check yeniden yeşile döndü. Executor PR #3'ü inceleyebilir; Worker main'e merge etmedi ve ticket statüsünü değiştirmedi.
