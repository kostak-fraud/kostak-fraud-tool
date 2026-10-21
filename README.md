# Fraud Monitoring Platform — Proje HQ Dokümantasyonu

**Sürüm:** v0.3 — Gereksinimler + mimari + UX blueprint + bağımlılık sıralı backlog  
**Tarih:** 2026-10-21  
**Durum:** Ürün gereksinimleri ve ana stack seçildi; **mock veri sözlüğü ve UX blueprint önerisi** ile ayrıntılı backlog oluşturuldu. Bazı domain kararları ve gerçek channel field sözlüğü açık; henüz uygulama/deploy yok.  
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