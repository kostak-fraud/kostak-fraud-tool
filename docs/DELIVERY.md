# Geliştirme ve Teslim Playbook'u

**Statü:** HQ tarafından kararlaştırılmış iş akışı. Araçların tam CLI/CI adımları ve branch naming pattern teknoloji/repo seçimi sonrasında kesinleşecek.

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

**Hedef:** `main`e merge edilen her commit deploy edilebilir ve uygulamaya yansımış olsun. Supabase/Vercel uygun adaylar; kesin teknoloji ve rollout kararı **henüz ADR ile alınmadı**.

**CI asgari önerisi (stack seçilince komutlara bağlanacak):**
- Lint/format ve typecheck; build.
- Unit tests: skor, status geçişleri, rule condition/window semantics.
- Integration tests: transaction pagination/filtering; authz/tenant isolation; atomic assignment/locking; page-scope bulk actions.
- DB migration doğrulaması ve etkili smoke testler.
- Secrets/env yönetimi; production veri ve mock data izolasyonu.

**Deploy akışı önerisi:** Branch/PR preview → korumalı main CI → migration stratejisi → otomatik production deploy → kritik kullanıcı akışı smoke check. Deploy başarısızlığında ticket 'done' sayılamaz; recovery stratejisi tanımlanmalı.

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

## 6. Koruyucu sınırlar

- Henüz onaylanmamış ürün kuralını worker tahmin ederek kalıcı hale getiremez.
- Mock/sentetik veri haricinde gerçek işlem, banka veya müşteri bilgisi kullanılmaz.
- Bir ticket'ın konusu dışında refactor yapılmaz; minimum açıklayıcı dokümantasyon ve test yeterlidir.
- Harici review yalnızca risk/karar gereği; her küçük diff için birden fazla onay şart değildir.
