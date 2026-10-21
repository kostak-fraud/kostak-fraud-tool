# Ürün Tanımı ve Kapsam (PRD v0.1)

**Durum:** Kapsam taslağı. İşlevsel gereksinimlerin büyük bölümü `[ONAYLI]`; fazlara yerleştirme ve bazı kabuller `[ÖNERİ]`.

## 1. Problem ve amaç

Fraud analisti, farklı işlem kanallarındaki yüksek hacimli işlemleri filtreleyip hızlıca incelemek, geçmiş davranışa dayanan risk kuralları oluşturmak, eşzamanlı analist çakışmasını önlemek ve neden riskli görüldüğünü açıklayarak karar vermek ister. Ürün, gerçek zamanlı **sentetik** işlemler üzerinden bu operasyonel akışı gösteren kullanılabilir bir fraud monitoring platformudur.

**Kısa vadeli çıktı:** UMDE/bitirme projesinde demo yapılabilen güvenilir sistem. **Uzun vadeli tasarım hedefi:** Farklı ödeme kuruluşlarının izole tenant olarak çalışabileceği ve daha sonra ticari gereksinimlerle geliştirilebilecek altyapı. İlk sürüm gerçek finansal işlem kabul etmeyecek.

## 2. Kullanıcı profilleri

- **Fraud Analyst:** İşlemleri filtreler, inceler, sahiplenir, yorumlar, Fraud/Not Fraud/On Hold kararları verir.
- **Rule Author:** Kendisine izin verilen kanallarda no-code kural oluşturur, inceler ve yönetir.
- **Platform Admin:** Kullanıcı ve izinleri yönetir; yapılandırma sorumlusu olabilir.
- **Read-only Reviewer:** Sadece yetkili olduğu kayıtları görüntüler.

Bu profiller **rol şeması kesinleşti** anlamına gelmez; permission-based yetkilendirme ihtiyacının ürün karşılıklarıdır. Ayrıntılı RBAC matrisi açık karardır.

## 3. Ürün modülleri

### 3.1 Transactions — [ONAYLI]

- `Wallet`, `POS` (sanal POS) ve `Physical POS` kanalları.
- Kanal bazında güncelden eskiye sıralanan yoğun tablo; sunucu taraflı sayfalama, filtreleme.
- Alan başına filtreler ve aynı anda çoklu filtre koşulları.
- Çok kolonlu yatay kaydırma, drag-and-drop kolon sıralama; **kolon gizleme yok**.
- Kişiye ve kanala özel, açıkça kaydedilince kalıcılaşan varsayılan filtre/kolon sıralaması.
- Checkbox seçimine göre ve seçim olmadığında yalnız **mevcut sayfanın** kayıtlarına etki eden Fraud/Not Fraud toplu aksiyonları (kesin semantik: [`DOMAIN.md`](DOMAIN.md)).
- İşlem detayı için ayrı sayfa; kural eşleşmeleri, puanlar, işlem alanları, yorumlar ve karar aksiyonları.
- İşlem açılışında otomatik assignment ve çakışmasız inceleme oturumu (kesin semantik: [`DOMAIN.md`](DOMAIN.md)).

### 3.2 Rule Engine & Rule Builder — [ONAYLI hedef yetenekler]

- Alan bazlı tek işlem koşulları, iç içe AND/OR/NOT ifade grupları.
- Kanal bazlı kurallar, zamansal sorgular ve gruplanmış agregasyonlar.
- `COUNT`, `SUM`, `MIN`, `MAX`, `AVG`, `COUNT DISTINCT` gibi operatörleri ifade edebilme.
- Fraud analisti tarafından seçilen puan ve kural açıklaması; eşleşen kural puanlarının toplanması.
- No-code arayüz; Formica'nın `Store/Enrichment/Rule` kullanıcı akışını birebir kopyalamak zorunda değiliz. Ayrıntılar: [`RULE_ENGINE.md`](RULE_ENGINE.md).

### 3.3 Gerçek zamanlı mock data — [ONAYLI]

- Üç kanala uygun, gerçek müşteri verisi içermeyen sentetik transaction generator.
- Kuralların ve zamana bağlı tetiklenmelerin demo sırasında gözlemlenebilmesi.
- Tekrar üretilebilir test senaryoları ve örnek riskli paternler `[ÖNERİ]`.

### 3.4 Yetkilendirme ve kurum sınırı — [ONAYLI amaç / uygulama detayı açık]

- Bazı kullanıcılar yalnız Transactions'ı, bazıları Rule tarafını kullanabilir; izinler sunucu tarafında uygulanmalı.
- Gelecekte çoklu ödeme kuruluşuna satış hedefi nedeniyle tenant izolasyonuna imkan verecek veri modeli ve API kapsamı.
- İlk sürümde self-service onboarding, abonelik, faturalandırma gibi SaaS operasyonları zorunlu değil.

## 4. Kapsam öncelik önerisi — henüz HQ onayı bekler

| Faz | İçerik | Durum |
|---|---|---|
| **MVP çekirdeği** | Mock generator, 3 kanal tablo/filtre/sayfalama/saved view, detay/yorum/aksiyon/kilit, RBAC asgari, rule builder + çalışan temel zaman/grup/agregasyon, skor ve inceleme/blok semantiği | `[ÖNERİ]` öncelik paketi |
| **Teslim kalitesi** | Otomatik test/CI/CD, erişilebilir ve tutarlı UI, audit trail, güvenlik kontrolleri, örnek demo verisi ve UMDE/bitirme raporu | `[ÖNERİ]` zorunlu kalite seviyesi |
| **Sonraki faz** | Fraud analytics dashboard, rule false-positive ve performans raporları, gerçek ödeme kurumu entegrasyonu, SaaS faturalama/abonelik, yatay çok büyük ölçekli stream processing | `[ONAYLI]` analytics sonraya; diğerleri `[ÖNERİ]` kapsam dışı |

**Veri hazırlığı:** Analitik ekranı ertelense de kural eşleşmeleri, kural versiyonları, skor katkıları ve analist nihai kararının geçmişi kaydedilmeli. Bu, gelecekte yanlış pozitif analizi için gereklidir. Veri saklama/retention politikası açık karardır.

## 5. Başarı ölçütleri (öneri)

- Sentetik bir risk paterni stream içinde üretilince doğru zaman penceresindeki kural eşleşir ve ilgili transaction skorlanır.
- Bir fraud analisti filtreleme → işlem açma → tetiklenen kuralları görme → yorum → karar akışını tamamlar.
- İkinci analist aynı anda açık işlemde salt-okunur kalır, yetkisiz aksiyon API'de de reddedilir.
- Kullanıcıya özel kaydedilmiş tablo görünümü yeniden yüklemeyle geri gelir; kaydedilmemiş değişiklik gelmez.
- Bulk action sadece seçilmiş ID'lere veya seçimsiz durumda o anda görüntülenen sayfanın ID'lerine uygulanır.
- Her main merge'ü kontrolleri geçtikten sonra canlı ortamda doğrulanabilir.

## 6. Bilinçli sınırlamalar

- Gerçek müşterilerin verileri ve şirkete ait gizli konfigürasyonlar kullanılmaz.
- İşlem bloklama bir ödeme ağında gerçek fon hareketini durdurmaz; mock ödeme yaşam döngüsü üzerinde gösterilir.
- İlk sürümde analytics ekranı zorunlu değil; ancak temel olay/karar kayıtları gerekir.
- Formica'nın mevcut ekranlarını, proprietary iş mantığını veya uygulama isimlendirmesini birebir kopyalama hedefi yoktur.
