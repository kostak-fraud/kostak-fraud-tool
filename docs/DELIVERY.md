# Geliştirme ve Teslim Playbook'u

**Statü:** HQ tarafından kararlaştırılmış iş akışı. FND-001 scaffold ve FND-002 GitHub Actions kalite kapısı mevcut; Vercel + Northflank + Supabase release hazırlığı FND-003 kapsamında incelemede, harici deployment henüz doğrulanmadı. Ayrıntılar: [`TECH_STACK.md`](TECH_STACK.md) ve [`DEPLOYMENT_RUNBOOK.md`](DEPLOYMENT_RUNBOOK.md).

## 1. Roller ve sorumluluk

| Katılımcı | Yetki ve sorumluluk |
|---|---|
| **HQ (bu sohbet)** | Ürün kapsamını, mimari/ADR kararlarını, backlog ve öncelikleri, standartları yönetir. |
| **Executor (ticket başına ayrı chat)** | Ticket readiness/bağımlılık/repo kontrolü; branch açar, Worker prompt'u hazırlar; teslimi inceler; blocker yoksa merge/deploy doğrular. |
| **Worker (ticket başına ayrı chat)** | Genellikle Codex (nadiren Cursor); belirlenmiş ticket'a uygun implementasyon/test; `handoff.md` ve kısa özet. Main'e merge etmez. |
| **Ömer** | İşlevsel öncelik, fraud semantiği, manuel UI/UX doğrulama; gerektiğinde harici Cursor/ajan review. |

## 2. Executor → Worker → Executor protokolü

**Başlatma / Executor**
1. Güncel main, açık PR/branch, ortam sağlığı ve ticket numarası/içeriğini doğrula.
2. Ticket'ın dependency'leri, acceptance criteria, kapsamı, test planı, veri/DB gereksinimleri tamam mı kontrol et (`Definition of Ready`).
3. Başlanabilir değilse sebebiyle dur; şüpheli durumda branch/worker başlatma.
4. Başlanabilir ise ticket'a ait branch oluştur; worker'a amaç, kapsam dışı alanlar, referans docs, dosya sınırları, güvenlik ve gerekli kontrolleri içeren **özel prompt** oluştur.

**Uygulama / Worker**
1. Verilen branch'te küçük, anlaşılır commit'lerle çalış.
2. İlgili kod, test, şema/migration, UI states, dokümantasyon güncellemelerini yap.
3. Gerektiği yerde mevcut repo komutlarıyla lint/typecheck/unit/integration/build kontrollerini çalıştır; çalıştıramadıklarını açıkça yaz.
4. Repo köküne `handoff.md` yaz: değişiklik özeti, dosyalar, test sonuçları, görsel davranış, riskler, bilinçli eksikler ve manuel doğrulama yönergesi.
5. Executor'a kısa rapor ver. Onay beklemeden scope büyütme veya main'e merge etme.

**Review / Executor**
1. Worker özetine güvenip geçme; git diff, handoff, test/log sonuçları ve acceptance criteria doğrulansın.
2. İlgili güvenlik kontrolleri: tenant filtreleri, RBAC, lock, API input validation, migration ve secret maruziyeti.
3. **Risk bazlı hafif review:** Küçük, düşük riskli ticket için kısa tek-pass yeterli; yüksek riskli değişiklikte hedefli ek test/harici review istenebilir. Gereksiz review hiyerarşisi kurulmaz.
4. Blocker varsa Worker'a somut düzeltme listesi; yoksa mevcut repo politikasına göre merge et ve hedef ortamda uygulamayı doğrula. Ticket status/evidence bağlantıları güncellensin.

## 3. Kalite kapısı ve ortam yaklaşımı

**Hedef:** `main`e merge edilen her commit deploy edilebilir ve uygulamaya yansımış olsun. **Karar:** Vercel web, Northflank Java API/Worker ve Supabase DB/Auth; gerekçe ve 2026-10-29 provider değişikliği ADR-0003'te kayıtlıdır.

**Mevcut zorunlu CI:**
- `frontend-ci`: frozen install, lint, typecheck, test ve build.
- `backend-ci`: Maven `verify`, unit + Testcontainers PostgreSQL integration + Flyway.
- Required check adları değiştirilmez veya atlanmaz; PR workflow'larına production secret verilmez.
- Domain geliştikçe skor/status/rule, pagination/filter, authz/tenant, lock ve bulk-action testleri aynı kapıya eklenir.

**Hedef release akışı:**

1. Branch/PR kalite kontrolleri ve production verisinden izole Vercel Preview.
2. Protected `main` merge ve iki required check'in başarılı olması.
3. Commit SHA ile izlenebilir immutable backend image build.
4. Aynı image ile explicit `APP_MODE=migrate` job; başarı beklenir, hata rollout'u durdurur.
5. Aynı revision ile `APP_MODE=api` ve `APP_MODE=worker` Northflank rollout'u.
6. API readiness + exact release SHA ve Worker liveness/heartbeat doğrulaması; ardından başarılı GitHub `release-ready` check.
7. Vercel Git deployment için `release-ready` bekleyen Production Deployment Check ile domain assignment; özellik yoksa staged `--skip-domain` candidate → smoke → promote.
8. HTTP/config/demo-safe smoke, schema version ve revision/SHA kanıtı.

Provider auto-deploy mekanizmaları bu sıralamayı garanti etmiyorsa birbirinden bağımsız açılmaz; Northflank workflow/release akışı migration sonucunu bekler. Deploy başarısızlığında ticket `DONE` sayılamaz. Destructive migration rollback yerine backup/recovery + fix-forward, uygulama için önceki uyumlu image/Vercel deployment geri dönüşü kullanılır.

## 4. Ticket Definition of Ready (DoR)

- ID, kısa hedef ve neden gerekli olduğu.
- Bağımlılıkları kapanmış ya da açık engel listesi var.
- Girdi/çıktı, acceptance criteria, testler, UI states ve gerekli migration etkisi belli.
- Başlangıç referansları: ilgili source-of-truth docs linkleri.
- Mimari karar gerektiren belirsizlikleri çözülmüş.

## 5. Ticket Definition of Done (DoD)

- Kabul kriterleri karşılandı; uygun otomatik kontroller geçti.
- Yeni özelliklerde erişim kontrolü, hata/empty/loading durumları, test verisi ve audit ele alındı.
- `handoff.md` mevcut, Executor review tamam, blocker yok.
- Main merge/deploy başarılı ve gerekli smoke doğrulama yapılmış.
- Çalışan URL, provider logu, schema version ve commit/revision SHA gerçek kanıtla kaydedilmiş; yalnız repository config'i deployment kanıtı sayılmamış.

## 6. Koruyucu sınırlar

- Henüz onaylanmamış ürün kuralını worker tahmin ederek kalıcı hale getiremez.
- Mock/sentetik veri haricinde gerçek işlem, banka veya müşteri bilgisi kullanılmaz.
- Bir ticket'ın konusu dışında refactor yapılmaz; minimum açıklayıcı dokümantasyon ve test yeterlidir.
- Harici review yalnızca risk/karar gereği; her küçük diff için birden fazla onay şart değildir.

## 7. Deployment kanıtı ve external blocker sınırı

- Hosting provider ayarı, GitHub protection ya da gerçek secret konfigürasyonu ek izin istiyorsa **yapılmış gibi davranılmaz**; gereken dış aksiyon ve `UNVERIFIED` kanıt açıkça yazılır.
- FND-003 repository hazırlığı external hesap olmadan `REVIEW` olabilir; Northflank/Vercel/Supabase rollout ve smoke tamamlanmadan `DONE`, `DEPLOYED` veya `VERIFIED` olamaz.
- Supabase Auth environment sözleşmesinin bulunması JWT authentication/authorization'ın tamamlandığı anlamına gelmez; IAM-001 kapanana kadar bu açıkça kapsam dışıdır.
- Northflank Developer Sandbox yalnız akademik demo ortamı olarak ele alınır; ticari production SLA/compliance sonucu çıkarılmaz.
