# Rule Evaluation — İlk Uygulama Semantiği

**Durum: [HQ TEKNİK VARSAYIMI — ÜRÜN ONAYI GEREKTİREBİLİR].** Rule Engine söz dizimi ve yetenek hedefi [`RULE_ENGINE.md`](RULE_ENGINE.md); skorlama sonucu [`DOMAIN.md`](DOMAIN.md) otoritesindedir. Bu dosya **MVP için deterministik değerlendirme tercihlerinin** kaydıdır; kullanıcıyla netleşmemiş davranışları `[VARSAYIM]` olarak işaretler.

| Konu | MVP varsayımı | Değişirse etkisi |
|---|---|---|
| Zaman referansı | `received_at` (backend clock), son W süre `(T-W, T]` | Gerçek entegrasyonda event-time + lateness stratejisi |
| Current transaction | Yeni işlem kendi COUNT/SUM pencere verisine **dahil** | Test eşikleri 1 işlem kayar |
| Group anchor | Mevcut işlemin bir veya iki tanımlı alanına **birebir eşleşme** | Çoklu wildcard/joins sonraki faz |
| WHERE | Yalnız geçmiş/pencere veri kümesini filtreler; current event'i de aynı predicate'e tabi tutar | Karmaşık koşul değerlendirmesi |
| Null/unknown | Null group anchor eşleşmez; karşılaştırma geçersiz veriyle `false`; `is null` explicit operator ayrı | 3-değerli mantık gelecek faz |
| Currency | İlk demo TRY; amount aggregate yalnız aynı currency'deki işlemlere uygulanır | FX dönüşümü/çoklu para gerekir |
| Window function | P0 `COUNT`, `SUM`; P1 `MIN`, `MAX`, `AVG`, `COUNT DISTINCT` | Ek SQL operator destek testi |
| Boolean | Nested AND/OR/NOT, max depth ve max leaf sayısı konfigüre edilmiş | DoS/maliyet limiti gerekir |
| Version | Published rule immutable snapshot; edit yeni versiyon üretir, geçmiş hit tekrar hesaplanmaz | Replay ayrı operasyon |
| Publish | Draft → Published/Enabled ↔ Disabled; ilk sürümde approval zinciri yok | Yetki ve audit |
| Eval ordering | Tenant+channel için ilk kurulumda tek tüketici veya anahtar bazlı sıralama; worker job idempotent | Yatay dağılımda ordering mimarisi gerekir |

**Performans ve güvenlik:** Rule AST'nin yalnız allowlist alanları ve operatörleri SQL parametreleri ile derlenir; evaluator süre/ağaç boyutu/ara sonuçlar için üst sınır uygular. Runtime raw SQL, scripting, kullanıcı kodu, cross-tenant lookup yok. Özellikle aggregation filter ve group key'nin tenant+channel kapsamı zorunlu.

**Açık ürün kararı:** `received_at` seçimi gerçek bankacılık işlemlerinin geç/yeniden sıralı gelişindeki doğruluğu garanti etmez. Bu proje yalnız sentetik gerçek zamanlı olaylarla demo yaptığından ilk sürüm önerisidir; kurumsal canlı entegrasyondan önce event-time yaklaşımı gözden geçirilir.