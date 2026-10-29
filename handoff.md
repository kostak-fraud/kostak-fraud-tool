# IAM-002 Worker Handoff

## Kimlik

- Ticket: `IAM-002 — Frontend Supabase Auth ve Authenticated API Client`
- Branch: `feat/iam-002-frontend-auth`
- Base SHA: `9cc5eb38c76f8b639e834b60a8b2c46f3430f6c8`
- Final implementation SHA: `f8c93c662639afe0ae9d21013960d62d9c0ead1a`
- Hedef: `main`
- Worker production'a veya staging verisine dokunmadı; main'e merge yapmadı.

## Uygulama özeti ve değişen alanlar

- `frontend/lib/supabase/` altında cookie tabanlı browser/server client'ları ve Next.js 16 session refresh/route guard akışı eklendi.
- `frontend/proxy.ts`, `/login`, `/transactions` ve `/rules` isteklerinde doğrulanmış `getClaims()` sonucu kullanıyor. Cookie içindeki session tek başına kimlik kanıtı kabul edilmiyor.
- `frontend/app/login/` ve `frontend/components/login-form.tsx` e-posta/parola `signInWithPassword` akışını, erişilebilir form durumlarını ve güvenli local return-to davranışını sağlıyor.
- `frontend/components/authenticated-workspace.tsx`, mevcut session'ı geri yüklüyor, `GET /api/v1/identity/me` çağrısını yapıyor ve loading/configuration/membership/permission/network durumlarını ayırıyor.
- `frontend/lib/api/client.ts`, yalnız `NEXT_PUBLIC_API_BASE_URL` kullanan bearer-token API client'ı ekliyor. `401` için tek refresh/retry, tekrarlanan `401` için sign-out ve `403` için session koruması var.
- `frontend/lib/api/identity.ts`, backend identity response'unu typed Zod sözleşmesiyle doğruluyor.
- `AppShell`, backend'den gelen permission'lara göre navigasyon sunuyor ve desktop/mobile görünür logout kontrolü içeriyor; mevcut genel yerleşim korunuyor.
- `backlog/IAM-002.md` oluşturuldu; `backlog/INDEX.md` ve `backlog/TX-004.md` auth → grid bağımlılığıyla güncellendi.
- Auth, route, API client, session restoration, logout, configuration ve secret-redaction sınırları için izole Vitest/Testing Library testleri eklendi.

## Kabul kriteri kanıtı

### Supabase Auth ve session

- `@supabase/ssr@0.12.7` ve `@supabase/supabase-js@2.118.0` tam sürümle sabitlendi; lockfile commit edildi.
- Login `signInWithPassword`; logout `signOut`; browser session `getSession` ile geri yükleniyor.
- Server client async Next.js `cookies()` API'sini kullanıyor. Proxy token refresh cookie'lerini hem request'e hem response'a taşıyor.
- Server route guard ve protected page doğrulaması `getClaims()` kullanıyor; server tarafında `getSession()` kimlik kanıtı yapılmadı.

### Route ve UX durumları

- Proxy testleri session'sız protected route'un login'e yönlendiğini ve authenticated login isteğinin yalnız güvenli local path'e döndüğünü kanıtlıyor.
- `https://...`, `//...`, `/\\...` ve `javascript:` return-to örnekleri reddediliyor.
- Protected içerik, browser session ve backend identity yüklenene kadar render edilmiyor; sahte tenant/role/user yok.
- Identity `403` login hatası değildir ve logout tetiklemez; ayrı tenant membership durumu gösterilir.
- Login formu label, autocomplete, required, disabled/pending ve güvenli hata metinlerine sahiptir; pending iken tekrar gönderim kapalıdır.

### API client ve identity

- Access token yalnız `Authorization: Bearer <token>` header'ına yazılıyor.
- Base URL eksik/geçersiz olduğunda import-time crash veya environment fallback yok; çağrı anında typed configuration error üretiliyor.
- Boş response, non-JSON success response, network error, `401`, `403` ve server hata durumları deterministik ele alınıyor.
- `401` en fazla bir `refreshSession` ve retry yapıyor. İkinci `401` sign-out yapıyor; `403` refresh/sign-out yapmıyor.
- Identity alanları `userId`, `membershipId`, `tenantId`, `tenantName`, `roles`, `permissions` olarak runtime'da doğrulanıyor. UI tenant/role verisi backend response'u olmadan üretmiyor.

### Güvenlik

- `service_role`, secret key, DB credential veya gerçek kullanıcı verisi eklenmedi.
- Token query parametresine veya loglara yazılmıyor; üretim kodunda auth/API error logu yok. Test, token değerinin `console.log/error` çağrısına gitmediğini doğruluyor.
- Client tenant ID göndermiyor ve Supabase PostgreSQL tablolarına doğrudan erişmiyor.
- Permission tabanlı navigasyon yalnız UI sunumu içindir; backend authorization authoritative kalır.

## Çalıştırılan kontroller

`frontend/` altında Node `v24.20.0`, pnpm `11.24.0` ile:

| Komut | Gerçek sonuç |
|---|---|
| `pnpm install --frozen-lockfile` | PASS — lockfile güncel, 378 ms |
| `pnpm lint` | PASS — ESLint hata/uyarı yok |
| `pnpm typecheck` | PASS — `tsc --noEmit` |
| `pnpm test` | PASS — 9 dosya, 32 test |
| `pnpm build` | PASS — Next.js 16.4.2 production build |

Ek lokal missing-config smoke:

- `GET /transactions?channel=wallet` → `307 /login?configuration=missing&next=%2Ftransactions%3Fchannel%3Dwallet`
- `GET /login?configuration=missing` → `200`, görünür `Sign-in configuration is missing` durumu

İlk toplu test denemesinde test router mock'unun her render'da yeni nesne üretmesi nedeniyle bir Vitest worker OOM oldu (29 test geçmişti). Mock sabit nesneye çevrildi; ardından tam suite iki kez `32/32 PASS` oldu. Ürün kodunda OOM gözlenmedi.

## İncelenen belgeler

Repo: `AGENTS.md`, `README.md`, `frontend/AGENTS.md`, istenen IAM/TX backlog dosyaları, `ARCHITECTURE.md`, `RBAC.md`, `UX.md`, `TECH_STACK.md`, `DEPLOYMENT_RUNBOOK.md`, `DELIVERY.md`, `DECISIONS.md`, ADR-0003.

Kurulu Next.js `16.4.2` yerel belgeleri:

- `node_modules/next/dist/docs/01-app/02-guides/authentication.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md`
- `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`

Güncel resmî Next.js authentication/proxy ve Supabase SSR client/changelog sayfaları da kontrol edildi. Next.js 16 `proxy.ts`, async cookies ve Supabase `getClaims()` yaklaşımı uygulandı.

## Ortam, canlı doğrulama ve drift

- Vercel Preview'da `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` eksik. Worker bunu tahmin etmedi, repository'ye veya Vercel'e yazmadı.
- Preflight bilgisindeki staging durumuna göre Auth user `0`, tenant `0`, membership `0`, aktif membership `0`, transaction `0`.
- Bu nedenle gerçek staging `login → identity` başarı smoke'u yapılmadı: **UNVERIFIED**.
- Staging'de test user, tenant, membership veya transaction oluşturulmadı.
- Preview deployment URL'si bu handoff hazırlanırken oluşmadı; URL/SHA: **UNVERIFIED / yok**.
- Güncel Railway staging API domain'i promptta `https://kostak-fraud-staging.up.railway.app`; `docs/DEPLOYMENT_RUNBOOK.md` hâlâ `https://kostak-fraud-tool-production.up.railway.app` yazıyor. Ticket sınırı gereği runbook değiştirilmedi.
- `backlog/IAM-001.md` `REVIEW`, `backlog/TX-003.md` `PLANNED` gösterirken main kodunda backend identity/transaction list implementasyonları bulunduğu yönündeki statü drift'i not edildi; kapsam dışı status düzeltmesi yapılmadı.

## Manuel doğrulama

1. Vercel Preview'a doğru staging publishable key güvenli environment ayarı olarak eklenmeli.
2. Ayrı Executor/onaylı provisioning ticket'ında sentetik staging Auth user + tek aktif tenant membership hazırlanmalı; secret handoff/PR'a yazılmamalı.
3. Login, refresh, identity tenant/role görünümü, permission nav, logout ve expired-session yönlendirmesi Preview'da manuel smoke edilmeli.
4. Membership olmayan geçerli Auth user ile `403` ekranının session'ı kapatmadığı doğrulanmalı.
5. Executor diff/security review ve GitHub `frontend-ci`/`backend-ci` sonuçlarını kontrol etmeli; ardından merge/deploy kararı vermeli.

## Bilinen sınırlar

- Canlı staging success path ve Vercel Preview, eksik publishable key ve staging kimlik/membership verisi nedeniyle doğrulanmadı.
- Public sign-up, password reset, invite, tenant selection/provisioning ve user management bilerek yoktur.
- Backend/migration/RLS değişikliği yapılmadı.
