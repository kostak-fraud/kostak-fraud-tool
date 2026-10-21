# Rule Engine / No-Code Rule Builder — İşlevsel Sözleşme

**Amaç:** Fraud analisti kod yazmadan tek işlem veya geçmişe bağlı karmaşık kurallar oluşturabilsin. Formica'nın `Store → Enrichment → Rule` iç yapısı **zorunlu tasarım değil**; bunun yerine anlaşılır, genişletilebilir expression modeli hedeflenir.

## 1. Desteklenmesi gereken yetenekler — [ONAYLI hedef]

1. **Kanal kapsamı:** Kural Wallet / POS / Physical POS kanallarından tam birine ait olur.
2. **Transaction koşulları:** Tipli alan karşılaştırmaları: eşit/eşit değil, büyük/küçük/eşik, değer listesinde var/yok; geçerli operatörler alan tipine göre sınırlandırılır.
3. **Mantıksal ifadeler:** İç içe `AND`, `OR`, `NOT` ile birden fazla koşul; görsel düzenlemede yapı okunabilir olmalı.
4. **Zaman pencereleri:** Ör. son 1 saat, 24 saat; olay zamanı/ingestion zamanı seçimi tasarım kararıdır.
5. **Gruplama:** Aynı kart, hesap, merchant vb. alanlara göre geçmiş işlem havuzu; gerektiğinde birleşik anahtarların tasarımı.
6. **Filtreli agregasyonlar:** `COUNT`, `SUM`, `MIN`, `MAX`, `AVG`, `COUNT DISTINCT` (amount, ID vb. uygun alanlara göre), agregasyona girmeden önce `WHERE` koşulları.
7. **Skorlama:** Kural açıklaması ve analistin belirlediği puan katkısı; eşleşen kuralların katkıları toplanır. Risk kararları için [`DOMAIN.md`](DOMAIN.md) tek otoritedir.
8. **Açıklanabilirlik:** İşlem detayında tetiklenen kurallar ve her birinin katkısı gösterilir; mümkün olduğunca sürümleriyle kayıt altına alınır.

**Arayüz ve motor aynı kural modelini kullanmalı.** Rule Builder'ın ürettiği yapı validasyondan geçmeli ve arka plan değerlendirme motoruna birinci sınıf girdi olmalı. Serbest metinle backend kodu/SQL çalıştırma **yok**.

## 2. Referans senaryo — sentetik

> POS kanalında, **aynı kartın**, **riskli merchant** üzerinde **3D Secure olmayan** son 1 saatlik işlemlerinde `COUNT >= 5` **VEYA** `SUM(amount) >= 10.000 TRY` koşulu sağlanıyorsa kural eşleşsin ve analistin belirlediği skor eklensin.

Kuralın parçaları:

- `channel = POS`
- Transaction pool predicate: `merchant_risk = HIGH AND is_3ds = false`
- Group anchor: yeni işlemin `card_id` alanı; geçmişten aynı `card_id` kayıtları.
- Time window: geçen 1 saat.
- Aggregate predicate: `COUNT(*) >= 5 OR SUM(amount) >= 10000`.
- Action: `add_risk_score(rule.score)`; açıklama/audit kaydı.

Bu örnekte **10.000 TRY son 1 saatlik toplam** olarak yazıldı. Tek işlem `amount >= 10.000` kontrolü ayrıca ifade edilebilir. Gerçek kurum müşteri bilgisi veya canlı kural kullanılmaz.

## 3. Önerilen mantıksal model — [ÖNERİ, ADR gerekli]

- `Rule`: `id`, `tenant_id`, `channel`, `name`, `description`, `score`, `enabled`, `version`, `expression`.
- `Expression`: recursively `all` (AND), `any` (OR), `not`, `field_comparison`, `window_aggregate_comparison` düğümleri.
- `window_aggregate_comparison`: `window`, `anchor_keys`, `where`, `aggregate_function`, `aggregate_field`, `operator`, `threshold`.
- Uygulama her field/operator eşleşmesini typed schema ile doğrular; döngüsel referanslar ve sınırsız iç içelik yasaklanabilir.

Bu model yalnızca **kavram önerisidir**, nihai JSON DSL/SQL/stream engine seçimi değildir. Aşağıdaki kararlar alınmadan gerçek implementation ticket'ına dönüştürülmez.

## 4. Teknik ve ürün açısından açık semantik kararları

- **Pencere anı:** Son 1 saat hesabı event time mı, ingest time mı? Geç gelen veya sırasız işlem ne olacak?
- **Yeni işlemin dahil edilmesi:** İçinde bulunulan transaction, kendi COUNT/SUM hesabına dahil mi?
- **Anchor & group semantics:** Birleşik anahtar (`card_id + merchant_id`) ilk MVP'de desteklenecek mi? Farklı currency tutarları nasıl normalize edilir?
- **NULL/missing fields:** Eksik veri filtrelerinde TRUE/FALSE/UNKNOWN mantığı nasıl?
- **Rule versioning:** Aktif kural güncellendiğinde geçmiş skorlar korunacak mı (varsayılan öneri evet)? Replay/test nasıl yapılacak?
- **Rule lifecycle:** Etkinleştir/pasifleştir, taslak/yayınla, geçerlilik tarihi ve kimlerin değiştirme yetkisi olduğu.
- **Risk contribution range:** Kural puanı için geçerli aralık ve negatif puan/puan düşürme desteklenecek mi?
- **Operatörlerin MVP matrisi:** No-code model genişlemeye elverişli olacak; iki aylık teslim için somut desteklenen ilk operatör listesi ve limitleri mimari/backlog aşamasında sabitlenecek.

## 5. UI/UX sözleşmesi ile ilişki

Kural yazarının önüne Store ve Enrichment teknik zorunluluğu koymamak **[ÖNERİ]**. Rule Builder'da koşul grubu, filtrelenen geçmiş işlem havuzu, pencere, gruplanma ve skor okuyarak anlaşılmalı. Ekran deneyiminin kalıcı kuralları: [`UX.md`](UX.md).

## 5. MVP değerlendirme temel varsayımları

Deterministik pencere sınırları, current-event katılımı, null ve currency davranışı, published rule snapshot ve SQL izin listesi tek yerde [`ENGINE_SEMANTICS.md`](ENGINE_SEMANTICS.md) dosyasında toplanmıştır. Bunlar ürün tarafından tek tek onaylanmış anlamına gelmez; ticket DoR kontrolünde teyit edilir.
