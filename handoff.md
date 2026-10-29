# IAM-002 Worker Handoff

## Kimlik ve kapsam

- Ticket: `IAM-002 — Frontend Supabase Auth ve Authenticated API Client`
- Executor finding fix: sayfa bazlı permission kontrolü ve kanıtların SHA bazında ayrıştırılması
- Branch: `feat/iam-002-frontend-auth`
- Base: `main`
- Base SHA: `9cc5eb38c76f8b639e834b60a8b2c46f3430f6c8`
- Executor tarafından incelenen başlangıç HEAD'i: `ab2fbee8157cd564d454e83480e01e2f458bee84`
- Finding fix implementation commit'i: `c1a377bf07529afd4e3191fb4fc73ac8feca05d8`
- Final implementation ve CI/Preview kanıt subject SHA'sı: `c1a377bf07529afd4e3191fb4fc73ac8feca05d8`
- Handoff kanıt güncellemesi bu SHA'dan sonra gelen yalnız-belge commit'idir; uygulama kodunu değiştirmez.
- Worker `main`e merge yapmadı; production/staging verisine, environment değişkenlerine veya secret'lara dokunmadı.

## Finding düzeltmesi

- `frontend/components/authenticated-workspace.tsx`
  - `transactions` sayfası için `transactions.read`, `rules` sayfası için `rules.read` gereksinimi tanımlandı.
  - Backend identity başarıyla yüklendikten sonra aktif sayfa permission'ı yoksa protected `children` render edilmiyor.
  - Mevcut `AppShell` içinde anlaşılır `ForbiddenState` gösteriliyor; session aktif kalıyor ve logout erişilebilir olmaya devam ediyor.
  - Sidebar'ın backend permission'larına göre filtrelenmesi korundu.
  - Bu kontrol yalnız UI/content presentation katmanıdır; backend authorization authoritative kalır.
- `frontend/components/authenticated-workspace.test.tsx`
  - Yalnız `transactions.read` olan identity'nin `/rules` içeriğini göremediği doğrulandı.
  - Yalnız `rules.read` olan identity'nin `/transactions` içeriğini göremediği doğrulandı.
  - Gerekli permission'a sahip identity'nin aktif sayfa içeriğini görebildiği doğrulandı.
  - Permission eksikliğinin `signOut` veya login redirect tetiklemediği; logout kontrolünün erişilebilir kaldığı doğrulandı.
  - Mevcut membership `403` davranışı korunarak test suite içinde geçmeye devam etti.

## Değişen dosyalar

- `frontend/components/authenticated-workspace.tsx`
- `frontend/components/authenticated-workspace.test.tsx`
- `handoff.md`

Backend, migration, environment, secret, backlog veya ilgisiz ürün alanında değişiklik yapılmadı.

## Lokal doğrulama

`frontend/` altında Node `v24.20.0`, pnpm `11.24.0` ile:

| Komut | Gerçek sonuç |
|---|---|
| `pnpm install --frozen-lockfile` | PASS — lockfile güncel, 364 ms |
| `pnpm lint` | PASS — ESLint hata/uyarı yok |
| `pnpm typecheck` | PASS — `tsc --noEmit` |
| `pnpm test` | PASS — 9 dosya, 35 test, 5.18 s |
| `pnpm build` | PASS — Next.js 16.4.2 production build |

Ek hedefli doğrulama:

- `pnpm vitest run components/authenticated-workspace.test.tsx --pool=threads --maxWorkers=1`: PASS — 1 dosya, 6 test.
- `git diff --check`: PASS.

## CI ve Preview kanıtı

Bu bölümdeki tüm sonuçlar aynı subject SHA'ya aittir. Önceki commitlere ait run/deployment kayıtları final kanıt olarak kullanılmamıştır.

- Kanıt subject SHA: `c1a377bf07529afd4e3191fb4fc73ac8feca05d8`
- GitHub Actions run: `40828812009`
  - `frontend-ci`: PASS — 40 s — job `123297985998`
  - `backend-ci`: PASS — 1 m 38 s — job `123297985658`
  - `release-ready`: SKIPPED — mevcut fail-closed production policy; deployment/merge yapılmadı
- Vercel commit status: SUCCESS — `Deployment has completed` — subject SHA `c1a377bf07529afd4e3191fb4fc73ac8feca05d8`
- Vercel deployment: `https://vercel.com/omer-akkiyals-projects/kostak-fraud-tool/7fdrefGAZRWpFRVP9GtBBjvskVb4`
- Preview URL: `https://kostak-fraud-tool-git-feat-iam-00-b60ccd-omer-akkiyals-projects.vercel.app`
- Vercel bot status: `Ready`, güncelleme zamanı `2026-10-29T06:22:58Z`

## Ortam ve canlı doğrulama

- Vercel Preview için gerekli publishable key veya staging test üyeliği bu ticket kapsamında oluşturulmadı/değiştirilmedi.
- Vercel deployment'ın `READY` olması gerçek login akışının başarılı olduğu anlamına gelmez.
- Gerçek staging `login → identity` success path: **UNVERIFIED**.
- Staging'de kullanıcı, tenant, membership, transaction veya başka test verisi oluşturulmadı.
- Public sign-up, password reset, invite, tenant provisioning/selection ve user management kapsam dışıdır.

## Executor yeniden inceleme notu

Executor'ın diff'i, sayfa permission presentation davranışını, membership `403` regresyonunu ve bu belgede tek SHA'ya bağlanan `frontend-ci`, `backend-ci` ve Vercel Preview kanıtlarını yeniden kontrol etmesi beklenir. PR draft olarak bırakılmıştır; merge/deploy/migration yapılmamıştır.
