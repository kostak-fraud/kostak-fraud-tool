# UI/UX Sözleşmesi — v0.1

**Durum:** Doğrulanmış ekran davranışları + ayrılmış tasarım önerileri. UI/UX kozmetik son aşama değil, her ticket'ın Definition of Done unsurudur.

## 1. Genel bilgi mimarisi

- Sol tarafta açılır/kapanır navigasyon menüsü. `[ONAYLI]`
- Transactions alanında üstte **yan yana Wallet / POS / Physical POS** seçimleri. `[ONAYLI]`
- Rules bölümü: kural listesi, oluşturma/düzenleme/etkinleştirme deneyimi. `[ÖNERİ]` Ayrı 'Rule Management' modülü yok.
- Users & Permissions ve Settings görünümü sadece ilgili yetkiler için. `[ÖNERİ]`
- Formica'nın Store/Enrichment/Rule menüsünün birebir kopyalanması şart değil. `[ONAYLI]`

## 2. Transactions liste ekranı — [ONAYLI]

- Kanal değiştirilince ilgili transaction tablosu gelir.
- Sıralama varsayılan **yeniden eskiye**. Büyük hacim: **sunucu tarafında pagination** ve filtreleme; tek istekte milyonlarca kayıt alınmaz.
- **Yoğun veri tablosu:** Her satır işlem, çok sayıda kolon ve yatay scroll; alanların gerçek şeması ayrıca temin edilecek.
- Her satırın yanında checkbox. Tablo üstü veya erişilebilir bir alanda **Fraud / Not Fraud** hızlı aksiyonları.
- Her kolonda kullanılabilir tipine uygun filtre arayüzü ve birden fazla sütunu birleştiren filtreler.
- **Kolon sırası** drag-and-drop ile değişir. **Kolon gizleme yok**.
- Filtre ve kolon sırası, kullanıcı `Save` dediğinde **kullanıcı+kanal bazında** varsayılan hale gelir. Save öncesi değişiklikler refresh ile sıfırlanır; başka kişiyi etkilemez.
- Sayfalamayla bulk action'ın hangi ID'lere etki edeceğinin kesin sözleşmesi: [`DOMAIN.md`](DOMAIN.md#5-toplu-fraud--not-fraud--onayli).

## 3. Transaction detail — [ONAYLI]

- Satıra tıklama **yeni detay sayfasına** götürür, yan panel açmaz.
- İşlem alanları, risk skoru, tetiklenen kurallar ve kural başına skor görünür.
- Yorum geçmişi ve yorum ekleme; Fraud, Not Fraud, On Hold butonları.
- Kullanıcının aktif edit lock'u yoksa salt-okunur görünüm ve aksiyonların neden kullanılamadığını anlatan geri bildirim.
- Otomatik sahiplenme, statü değişimi ve kilit kuralları: [`DOMAIN.md`](DOMAIN.md#4-detay-acilisi-assignment-ve-eszamanli-erisim--onayli).

## 4. Rule Builder — hedeflenen deneyim

- Teknik terminolojiye aşina olmayan fraud analisti için koşul ekleme, iç içe AND/OR/NOT gruplama.
- Gerekli durumlarda 'aynı kart/hesap', 'son 1 saat', 'işlem sayısı/toplamı' gibi kavramları görünür şekilde seçtirme.
- Alana uygun operatör ve value editörü; anlamsız/uyumsuz kombinasyonlarda açık validasyon mesajı.
- Kural açıklaması ve puan katkısı; mevcut tanımın kolay okunabilir özetini gösterme.
- Kaydetmeden önce sentetik örnek işlemlerle kural deneme `[ÖNERİ]`, zaman/kapsamla değerlendirilir.
- Her önemli ekranın **empty, loading, error, success, disabled/read-only** durumları ticket'a eklenmeli.

## 5. Tasarım önerileri — henüz onaylı ürün kararı değil

- Yatay scroll'da checkbox ve transaction ID gibi ilk kolonların sticky kalması.
- Çoklu seçim sayısını ve page-scope etkisini belirgin göstermek.
- Seçim yokken tüm görünen sayfaya uygulanacak hızlı aksiyon için net kapsam onayı; seçili işlemlerde ekstra modal yok.
- Gerçek zamanlı yeni veriler mevcut pagination seçimini kararsızlaştırmasın; 'yeni işlem var / yenile' yaklaşımı değerlendirilsin.
- Klavye erişimi, okunabilir durum renkleri, tarih/sayı para formatı ve mobilde minimum destek seviyesi tasarım aşamasında belirlenmeli.

## 6. Her UI ticket'ının kabul kriteri kontrol listesi

- Ana kullanıcı akışı az tıklamayla tamamlanıyor mu?
- Filtre ve tablo durumları geri yüklenebilir ve öngörülebilir mi?
- Yanlışlıkla Fraud kararı verme riski ekran metniyle azaltılmış mı?
- Permission ve edit-lock eksikliği açıkça gösteriliyor mu?
- Büyük veri, yatay scroll, loading/empty/error durumları test edilmiş mi?
- UI'ı Ömer manuel smoke test ile onaylayabilecek kadar tutarlı mı?

**Not:** Bu belge piksel tasarım/final design system değil; ilk ekranları yazmadan önce tasarım tokenları, bileşen kütüphanesi ve kullanıcı akışlarının ortak kararı alınacaktır.

## 7. Ekran blueprint

Ekran şemaları, component sınırları, varsayılan durumlar, tasarım tokenları ve manuel UX turu: [`UI_BLUEPRINT.md`](UI_BLUEPRINT.md). Buradaki doğrulanmış kullanıcı davranışı değişmez; blueprint tasarım önerilerini ayrı statüde tutar.
