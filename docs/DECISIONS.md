# Karar Kaydı ve Açık Sorular

**Güncel:** 2026-10-29. `[ONAYLI]` Ömer tarafından teyit edilmiş iş kararıdır. `[ÖNERİ]` tartışma için, `[AÇIK]` çözülmeli. Bu sayfa kararın **kısa indeksidir**; kesin davranış için bağlı belgeye bakılır.

## 1. Onaylı ürün kararları

| ID | Karar özeti | Tek ayrıntı kaynağı |
|---|---|---|
| P-01 | Akademik proje + ileride ticarileşebilir, farklı ödeme kuruluşlarına hizmet edecek temel | [`PRODUCT.md`](PRODUCT.md) |
| P-02 | Üç kanal: Wallet / POS / Physical POS; gerçek zamanlı sentetik işlem | [`PRODUCT.md`](PRODUCT.md) |
| P-03 | Yoğun işlem tablosu, server pagination, yeni→eski sıralama, column filters, yatay scroll | [`UX.md`](UX.md) |
| P-04 | Kişi/kanal bazlı saved view; kaydedilmeyen filtre ve sıralama yenilemede kaybolur | [`UX.md`](UX.md) |
| P-05 | Kolonlar drag-and-drop taşınır; gizleme gerekmez | [`UX.md`](UX.md) |
| P-06 | Sıfır seçimli toplu aksiyon **yalnız o sayfanın** kayıtlarına, seçim varsa yalnız seçili ID'lere uygulanır | [`DOMAIN.md`](DOMAIN.md) |
| P-07 | Detaya tıklamak ayrı sayfayı açar, uygun işlem otomatik assign + In Review; aktif ilk analist yazma kilidini korur | [`DOMAIN.md`](DOMAIN.md) |
| P-08 | İkinci analist okuyabilir ama lock bırakılana kadar aksiyon/yorum yapamaz; final karar görüntülemeyle bozulmaz | [`DOMAIN.md`](DOMAIN.md) |
| P-09 | Beş review status; On Hold bilgi bekleyen incelemedir, ödeme bloklaması değil | [`DOMAIN.md`](DOMAIN.md) |
| P-10 | Kurallar kanal bazlı, skorlar kümülatif, puan katkısını fraud analisti belirler | [`RULE_ENGINE.md`](RULE_ENGINE.md) |
| P-11 | Risk aralığı 0–100; 100 ödeme blok eşiği, daha düşük ayrı review threshold | [`DOMAIN.md`](DOMAIN.md) |
| P-12 | No-code rule builder geçmiş zaman penceresi, agregasyon, grouping ve Boolean koşullara elverişli | [`RULE_ENGINE.md`](RULE_ENGINE.md) |
| P-13 | İzin bazlı erişim gereksinimi, detaylı rol modeli henüz kararlaştırılmadı | [`PRODUCT.md`](PRODUCT.md) |
| P-14 | Sol tarafta collapsible navigation; Formica'nın Store/Enrichment modelini klonlama zorunluluğu yok | [`UX.md`](UX.md) |
| P-15 | Analitik ekranı sonraki faz; false-positive hesaplanabilecek olay/geçmiş bilgisi korunmalı | [`PRODUCT.md`](PRODUCT.md) |
| P-16 | HQ → Executor → Worker → Executor, ticket başına ayrık oturumlar, handoff, merge sonrası canlı doğrulama | [`DELIVERY.md`](DELIVERY.md) |
| P-17 | UI/UX baştan tasarım kriteri, gereksiz review/overengineering yok | [`DELIVERY.md`](DELIVERY.md), [`UX.md`](UX.md) |

## 2. Onaylı teknik kararlar (21 Ekim 2026)

| ID | Karar özeti | Kanonik kaynak / gerekçe |
|---|---|---|
| T-01 | Java 25 LTS, Spring Boot 4.1.x, Spring Security, jOOQ + Flyway | [`TECH_STACK.md`](TECH_STACK.md), [`adr/ADR-0001-backend-and-persistence.md`](adr/ADR-0001-backend-and-persistence.md) |
| T-02 | Next.js 16.4.x + TypeScript, Tailwind/shadcn/ui, TanStack Table v8/dnd-kit | [`TECH_STACK.md`](TECH_STACK.md) |
| T-03 | Supabase PostgreSQL/Auth; backend-controlled tenant+RBAC, JWT JWKS | [`ARCHITECTURE.md`](ARCHITECTURE.md), [`adr/ADR-0003-hosting-auth-and-delivery.md`](adr/ADR-0003-hosting-auth-and-delivery.md) |
| T-04 | Modular monolith; aynı Java kod tabanından API+Worker process | [`ARCHITECTURE.md`](ARCHITECTURE.md), [`adr/ADR-0002-async-rule-evaluation.md`](adr/ADR-0002-async-rule-evaluation.md) |
| T-05 | PostgreSQL transactional outbox/jobs + idempotent rule evaluation; başlangıçta Kafka/Redis yok | [`ARCHITECTURE.md`](ARCHITECTURE.md), [`adr/ADR-0002-async-rule-evaluation.md`](adr/ADR-0002-async-rule-evaluation.md) |
| T-06 | Vercel web, Northflank backend/worker, Supabase DB/Auth, GitHub Actions protected main; Railway hedefi 2026-10-29'da supersede edildi | [`TECH_STACK.md`](TECH_STACK.md), [`adr/ADR-0003-hosting-auth-and-delivery.md`](adr/ADR-0003-hosting-auth-and-delivery.md) |

## 3. Öncelikli açık sorular (keşfi bloklamayan, tasarım/ticket öncesi çözülecek)

| Öncelik | Başlık | İlgili kaynak / beklenen karar |
|---|---|---|
| **Kritik** | Channel-specific transaction alan sözlüğü; zorunlu/opsiyonel alanlar ve filtre operatörleri | [`UX.md`](UX.md), [`RULE_ENGINE.md`](RULE_ENGINE.md); Ömer anonim örnekleri iletecek |
| **Kritik** | Review threshold global mi, channel başına mı; ilk demo eşik ayarı | [`DOMAIN.md`](DOMAIN.md) |
| **Kritik** | 100+ ham puanın ele alınışı; skor sınırlandırma ve gösterim | [`DOMAIN.md`](DOMAIN.md) |
| **Kritik** | 100 puanla bloklanan işlem hangi review status'ta başlar? | [`DOMAIN.md`](DOMAIN.md) |
| **Kritik** | Rule window current event katılımı; event time/late event; group-key, currency ve null semantiği | [`RULE_ENGINE.md`](RULE_ENGINE.md) |
| **Kritik** | İlk sürüm Rule Builder operatör matrisi ve kural lifecycle'ı | [`RULE_ENGINE.md`](RULE_ENGINE.md) |
| **Kritik** | İlk scaffold ile dependency sürümleri, DB connection, JWT verification, Docker ve deploy uyumluluğu doğrulama | [`TECH_STACK.md`](TECH_STACK.md), [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| **Önemli** | Bulk action kilitli/final kayıtlar, kısmi başarı, seçim yaşam süresi | [`DOMAIN.md`](DOMAIN.md) |
| **Önemli** | Otomatik System Not Fraud işleminde analistin detail click davranışı | [`DOMAIN.md`](DOMAIN.md) |
| **Önemli** | On Hold'dan tekrar inceleme, yorum yetkisi, audit ve lock release | [`DOMAIN.md`](DOMAIN.md) |
| **Önemli** | Minimal RBAC matrisi; tenant provisioning ilk MVP sınırı | [`PRODUCT.md`](PRODUCT.md) |
| **Önemli** | Transaction detail'in UI kompozisyonu, design system, responsive kriteri | [`UX.md`](UX.md) |

## 4. Mimari kararların kaydı nasıl tutulacak?

`docs/adr/ADR-0001-*.md` gibi kısa ADR dosyalarında karar gerekçeleri kaydedilir: **Context → Decision → Alternatives → Consequences → Status**. Sırf olası kararlar için sahte ADR üretilmeyecek. Önce gerçekten gerekçelendirilen karar, sonra implementation ticket'ı.
