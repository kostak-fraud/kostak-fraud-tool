# Backlog — Tekil Ticket Kaydı ve Uygulama Sırası

**Durum:** v0.3 planı; ticket'lar kod uygulanmış veya kullanıcıdan her varsayıma onay alınmış demek değildir. Her ticket'ın detay/kabul kriteri **tek kaynak olarak** `backlog/ID.md` içindedir. Bu sayfa sadece indeks ve grafiktir.

## Çalışma ilkeleri

- Her ticket için ayrı **Executor ve Worker chat**. Executor önce preflight/DoR, sonra branch + prompt, ardından worker handoff review + merge + canlı smoke.
- Tek ticket'ta tek ölçülebilir sonuç; kapsam artarsa alt ticket açılır. `P0` akademik demo için gerekli; `P1` zaman kalırsa veya P0'ı tamamlamak için şartsa.
- Büyük kuralların/ticketların tamamı son hafta beklenmez; ilk dikey dilim **generator → veri tablosu → basit rule hit → investigation** olarak erken çalıştırılır.
- **İlk hafta hedefi:** FND-001 → FND-002 → FND-003 + UI-001. UI-001 main'e merge edildi; FND-003 staging çalışsa da production release gate hâlâ fail-closed. Sonraki ürün bağımlılığı IAM-001 → TX-001 → TX-002/TX-003.
- Açık domain politikaları bazı ticket'ların DoR blocker'ıdır; `DECISIONS.md` ve ilgili source-of-truth doğrulanır. Transaction alan listesi gelmeden mock sözlükteki varsayımlar ayrıca gözden geçirilir.

## Öncelik ve bağımlılık indeksi

| Ticket | Epic | Pri | Boyut | Bağımlılıklar | Ana amaç |
|---|---|---|---|---|---|
| [FND-001](FND-001.md) | Foundation | P0 | M | — | GitHub monorepo içinde Java/Spring Boot ve Nextjs çalışan iskeletini, lokal DB ortamını ve ilk health endpoint/shell UI oluştur. |
| [FND-002](FND-002.md) | Foundation | P0 | S | FND-001 | PR kalite kapısı ve protected main akışını oluştur |
| [FND-003](FND-003.md) | Foundation | P0 | M | FND-001, FND-002 | Vercel web, Railway API/worker, explicit migration, Supabase DB/Auth ve main sonrası smoke hazırlığı kur |
| [UI-001](UI-001.md) | UI Foundation | P0 | M | FND-001 | Kullanılabilir sol navigasyon, channel tabs ve ortak component/tasarım token temelini kur |
| [IAM-001](IAM-001.md) | Security | P0 | M | FND-001 | Tenant, kullanıcı üyeliği, izin modeli ve Supabase Auth JWT doğrulamasını backend’e entegre et |
| [IAM-002](IAM-002.md) | Security | P0 | M | IAM-001, UI-001 | Frontend Supabase Auth session akışı ve access token taşıyan ortak API client oluştur |
| [TX-001](TX-001.md) | Transactions | P0 | M | FND-001, IAM-001 | Mock transaction kalıcı şema, Flyway migration ve indekslenebilir alan sözlüğü uygula |
| [TX-002](TX-002.md) | Transactions | P0 | M | TX-001 | Gerçek zamanlı sentetik generator ve idempotent persistent ingestion kur |
| [TX-003](TX-003.md) | Transactions | P0 | M | TX-001, IAM-001 | Kanal bazlı transaction list REST API sunucu sayfalama ve yeni→eski stabil sıralamayı sağla |
| [TX-004](TX-004.md) | Transactions UI | P0 | M | TX-003, UI-001, IAM-002 | Kanala göre dense transaction grid, stable pagination ve row→detail navigation iskeleti kur |
| [TX-005](TX-005.md) | Transactions | P0 | M | TX-003, TX-004 | Kolon tipi bazlı server-side çoklu filtreleri API ve UI üzerinden işlevsel hale getir |
| [TX-006](TX-006.md) | Transactions UI | P0 | M | TX-005, IAM-001 | Kullanıcı+tenant+channel özel tek saved default view ve kolon drag/drop sağla |
| [RULE-001](RULE-001.md) | Rules | P0 | M | TX-001, IAM-001 | Typed versioned rule AST doğrulama, DB şeması ve CRUD/publish/disable API tasarla |
| [RULE-002](RULE-002.md) | Rules | P0 | L | RULE-001, TX-002 | Worker üstünden tek transaction rule evaluation, rule-hit ve kümülatif score/status sonucu kaydet |
| [RULE-003](RULE-003.md) | Rules | P0 | L | RULE-002 | Zaman pencereli `COUNT` ve `SUM`, WHERE, grup anchor ve OR birleşimini evaluator’a ekle |
| [RULE-004](RULE-004.md) | Rules | P1 | M | RULE-003 | MIN, MAX, AVG, COUNT DISTINCT ve çoklu grup key kapsamını genişlet |
| [RULE-005](RULE-005.md) | Rules UI | P0 | M | RULE-001, UI-001 | Kural listesi ve no-code tek işlem condition builder UI geliştirilir |
| [RULE-006](RULE-006.md) | Rules UI | P0 | L | RULE-003, RULE-005 | Window aggregate condition’larını rule builder’a entegre edip örnek kompleks kuralı no-code yazdır |
| [INV-001](INV-001.md) | Investigation | P0 | M | TX-004, RULE-002 | Ayrı transaction detail route/API ile işlem, score, rule hits ve comment timeline read-only verisini göster |
| [INV-002](INV-002.md) | Investigation | P0 | L | INV-001, IAM-001 | Detay açılışında atomik edit lease, assignment, heartbeat ve release mekanizması kur |
| [INV-003](INV-003.md) | Investigation | P0 | M | INV-002 | Fraud/Not Fraud/On Hold kararları, comments ve audit olaylarını güvenli mutation API/UI ile oluştur |
| [TX-007](TX-007.md) | Transactions UI | P0 | M | TX-004, INV-003 | Checkbox seçimi veya seçim yokken yalnız görünür sayfa için toplu Fraud/Not Fraud işlemleri uygula |
| [OPS-001](OPS-001.md) | Live Updates | P1 | M | TX-002, TX-004 | SSE canlı güncelleme ve polling fallback ile analist listesini kesintisiz güncel tut |
| [OPS-002](OPS-002.md) | Hardening | P0 | M | RULE-003, INV-003, TX-007, IAM-001 | Tenant ve race condition güvenliği, DB performans, audit/idempotency ve deploy güvenlik kontrollerini güçlendir |
| [DEMO-001](DEMO-001.md) | Academic Delivery | P0 | M | FND-003, RULE-006, INV-003, TX-007, OPS-002 | Reproducible sentetik demo, akademik mimari/test kanıtı, final sunum/rapor hazırlığı |
| [RUL-007](RUL-007.md) | Rules UI | P1 | S | RULE-006 | Kuralı yayınlamadan önce sentetik örnek işlemler üzerinde read-only test/replay göster |
| [ADM-001](ADM-001.md) | Administration | P1 | M | IAM-001, UI-001 | Tenant admin için asgari kullanıcı listeleme ve rol/izin atama arayüzü |

## Kritik yollar ve çalışma paketleri

1. **Altyapı:** `FND-001 → FND-002 → FND-003`; UI iskeleti `UI-001` FND-001 sonrasında paralel olabilir.
2. **Demo veri/list:** `IAM-001 → IAM-002`; backend veri yolu `TX-001 → TX-002/TX-003`, ardından authenticated frontend bağımlılığıyla `IAM-002 + TX-003 + UI-001 → TX-004 → TX-005 → TX-006`.
3. **Rule engine:** `TX-001 → RULE-001 → RULE-002 → RULE-003 → RULE-006`; `RULE-005` UI-001 sonrasında RULE-001'le paralel geliştirilebilir.
4. **İnceleme:** `TX-004 + RULE-002 → INV-001 → INV-002 → INV-003 → TX-007`.
5. **Kapanış:** `OPS-002` güvenlik/perf → `DEMO-001`. P1 işler (`RULE-004`, `OPS-001`, `RUL-007`, `ADM-001`) P0'a zarar vermeyecek şekilde alınır.

## İlk rapor günü için gerçekçi kanıt

- PRD, domain/rule/UX sözleşmesi, mimari ADR, stack belgeleri, backlog ve risk/karar listesi.
- Repo/branch koruması, başarılı CI run, çalışan web/API URL ve Flyway migration **yalnız gerçekten yapılırsa** rapora dahil edilir.
- Demo videosu için tasarlanmış sentetik senaryo ve başlangıç ekranı mock içeriği olabilir; gerçek rule engine tamamlandı iddia edilmez.
- Değerlendirilecek gerçeğe uygun ilerleme formu: [`docs/PROGRESS_REPORT.md`](../docs/PROGRESS_REPORT.md).

## Ticket durumları

`PLANNED → READY-CANDIDATE → IN_PROGRESS → REVIEW → DONE` ya da `BLOCKED`. **DONE** yalnız executor tarafından main merge + CI + live smoke sonrası verilir. README ve teslim sözleşmesini okuyun.
