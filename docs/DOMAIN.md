# Domain Sözleşmesi: Transaction, Skor, İnceleme

**Yetkili kaynak:** Transaction yaşam döngüsü, atama/kilit ve bulk action davranışlarının ayrıntıları yalnız bu dosyada tutulur. `[ONAYLI]` kesin davranış; `[AÇIK]` henüz tanımlanmamış kenar durumdur.

## 1. Temel varlıklar

- **Tenant:** Farklı ödeme kuruluşlarının mantıksal sınırı; veri erişimi tenant bağlamından ayrılmamalı. `[ONAYLI hedef]`
- **Channel:** `wallet`, `pos`, `physical_pos`. Her işlem tek kanala ait. `[ONAYLI]`
- **Transaction:** Kimlik, tenant, channel, zaman, channel-specific alanlar, effective risk score, review status, mock payment block durumu, assignee gibi kavramsal özellikler. Gerçek alan sözlüğü `[AÇIK]`.
- **Rule / Rule version:** Belirli channel'a ait tanım; açıklama, puan katkısı, etkinlik ve expression. Rule engine sözleşmesi: [`RULE_ENGINE.md`](RULE_ENGINE.md).
- **Rule hit:** Bir işlemle eşleşen belirli kural versiyonu, puan katkısı ve değerlendirme zamanı. İleriye dönük analitik/açıklanabilirlik için saklanır. `[ÖNERİ]` veri tasarım kontratı.
- **Investigation session / lock:** Aktif editörün atomik biçimde tek kişi olmasını sağlar; assignment ile aynı şey değildir.
- **Comment / audit event:** Kimin, ne zaman, hangi işlemde ne yaptığı kaydı.

## 2. Risk değerlendirme — [ONAYLI]

1. Yeni işlemde varsayılan atama `System`.
2. Yalnızca işlemin **kanalına ait** aktif kurallar değerlendirilir.
3. Eşleşen kuralların fraud analisti tarafından belirlenmiş puanları **toplanır**. Hiç kural eşleşmemişse skor `0`.
4. Görünen risk skoru **0–100 aralığındadır**. **100** tüm kanallarda bloklama eşiğidir; bu bir *mock payment blocking* sonucudur.
5. Ayrıca yapılandırılabilir bir **review threshold** vardır (100'den düşük). Eşik altı `Not Fraud (System)`; eşiğe eşit/üstü ama 100'den küçük `Waiting for Review`. `100` puanda ödeme bloklanır ve işlem analistin inceleyebilmesi için erişilebilir kalır.

**[AÇIK]** Birden fazla rule hit sonucunda ham skor 100'ü aşarsa normalizasyon/sınırlandırma ve detay ekranında ham puanların gösterimi nasıl olacak? **[AÇIK]** Review threshold tüm tenant için tek mi, kanal bazında mı? **[AÇIK]** 100 puanlık bloklanmış işlemin review status'u otomatik `Waiting for Review` mü olacak? Bu **kuvvetli öneri**, henüz ayrı bir karar olarak onaylanmadı.

> **Önemli ayrım:** `review_status` (analist iş akışı), `payment_blocked` (mock ödeme sonucu) ve **dahili** `evaluation_state` (worker işlenme durumu) ayrı alan/kavramlardır. `evaluation_state` kullanıcıya altıncı fraud status olarak sunulmaz; ayrıntı [`ARCHITECTURE.md`](ARCHITECTURE.md) dosyasındadır. `On Hold` bir ödeme bloklama komutu değildir.

## 3. Review status — [ONAYLI sözlük]

Beş görünen statü: `Fraud`, `Not Fraud`, `On Hold`, `In Review`, `Waiting for Review`.

| Statü | Anlam |
|---|---|
| `Not Fraud` | Sistem skor eşiği altında bıraktı **veya** analist inceleyip nihai Not Fraud kararı verdi. Karar kaynağı (`System` / `Analyst`) ayrıca tutulmalı. |
| `Waiting for Review` | Skor inceleme eşiğine ulaştı; insan incelemesi bekliyor. |
| `In Review` | Yetkili analist işlemi aktif olarak incelemeye başladı. |
| `On Hold` | Analist nihai kararı erteledi; ör. gönderici bankadan transferin mahiyetine ilişkin bilgi bekleniyor. Payment block ile karıştırılmamalı. |
| `Fraud` | Analist fraud olarak sonuçlandırdı. |

`On Hold` sonrasında gelen bilgiye göre `Fraud` veya `Not Fraud` kararı verilebilir. `[AÇIK]` On Hold tekrar aktif incelemeye dönüşte tam geçiş grafiği, yorum/hold nedeninin zorunluluğu ve kimlerin işlem açabileceği. `[AÇIK]` Otomatik `Not Fraud (System)` işlemi analist açarsa sonlandırılmış gibi salt-okunur mu kalacak, yoksa yeniden inceleme başlatılabilecek mi?

## 4. Detay açılışı, assignment ve eşzamanlı erişim — [ONAYLI]

- Satıra tıklamak **ayrı transaction detay sayfası** açar.
- İlk uygun analist işlemi açınca işlem **ona assign edilir** ve `In Review` olur; ayrı "Assign to me" butonu gerekmez.
- İlk analist içerideyken ikinci analist detayları görebilir; fakat **Fraud, Not Fraud, On Hold, Comment** yapamaz. İkinci kullanıcı salt-okunur.
- İlk kişinin hâlen aktif olduğu oturumda assignment çalınamaz.
- İlk analist çıkıp aktif edit lock serbest bırakılınca başka bir analist uygun işlem için incelemeyi devralabilir. Ownership/audit geçmişi korunur.
- Daha önce analist tarafından sonuçlandırılmış işlem sadece **görüntülenerek** tekrar `In Review` yapılmaz.

**Uygulama gereği:** Kilit/claim sunucuda atomik yapılmalı; yalnız UI'da buton gizlemek yetmez. Browser crash ve bağlantı kaybında kalıcı kilidi önleyecek süre sonu/yenileme (lease) stratejisi mimari aşamada kararlaştırılmalı. HTTP istekleri yetki, tenant ve lock doğrulaması yapmalı. Assignment, edit lock ve son karar **ayrı olgular**dır.

## 5. Toplu Fraud / Not Fraud — [ONAYLI]

| Checkbox durumu | Etkilenecek işlem kümesi |
|---|---|
| Bir veya fazla seçim var | **Yalnız seçilmiş transaction ID'leri** |
| Hiç seçim yok | Filtreye uygun toplam sonuçlar **değil**, o anda ekranda görüntülenen **mevcut sayfadaki transaction ID'leri** |

Örnek: Filtre 1.000 sonuç, sayfa 100 kayıt gösteriyor. Sıfır seçimle Fraud basılması **sadece bu 100 ID'yi** hedefler; diğer 900 asla etkilenmez.

**Güvenlik ve doğruluk kuralı:** Gerçek zamanlı işlem akarken sayfa içeriği değişebilir; API'ye sayfa numarası veya bütün filtreyi yeniden işleten parametre değil, **aksiyon anında ekranda görünen ID listesi** gitmeli. Backend yetki, tenant, lock ve geçiş kontrolünü tekrar yapmalı.

**[ÖNERİ / UI onayı bekliyor]** Sıfır seçimde sayfa-geneli aksiyonun kapsamını belirgin bir onay metniyle göster; seçili işlemler için fazladan onay ekleme. **[AÇIK]** Kilitli/sonuçlanmış satırlar bulk action'a dahilse atlama, hata veya kısmi başarı davranışı; sayfalar arası selection temizliği.

## 6. Mock ödeme bloklaması

100 puanda ödeme bloklanması iş kuralıdır. Gerçek ödeme sistemleriyle entegrasyon yok; blok `payment_blocked` benzeri ayrı bir durumla **simüle edilir**. Nihai Fraud/Not Fraud analist kararı, geçmişte skor nedeniyle verilmiş blok kararını otomatik kaldırır mı? **[AÇIK]** Bu bağımsız bir ödeme yaşam döngüsü kararıdır.

## 7. Önerilen ilk sürüm tamamlayıcı politikalar — [HQ VARSAYIMI, ONAYLI DEĞİL]

- **Skor:** `raw_score = SUM(matched rule contributions)`, `risk_score = min(100, raw_score)`. Her katkı >= 0 ve <= 100; katkı hesabı değişmez rule-version snapshot ile audit'e yazılır.
- **Eşik:** Tenant+channel bazında düzenlenebilir `review_threshold` (`1..99`) öneriliyor; başlangıç demo fixture değeri **60** sadece örnektir, iş kuralı değil. Yeni transaction değerlendirmelerine uygulanır, eski işlem otomatik yeniden hesaplanmaz.
- **Blok:** 100 puana ulaşan işlemin `payment_blocked=true` ve `review_status=Waiting for Review` olması önerilir. Sonradan `Not Fraud` analist kararı verilmesi ödeme blokunun geçmişteki gerçeğini otomatik silmez; gerçek unblock entegrasyonu kapsam dışı.
- **Lock:** Aktif edit yetkisi atomik lease ile korunur, sekme çıkışında best-effort release, bağlantı kopuşunda lease expiry. `On Hold` aktif çalışmayı bitirir; yeniden açıldığında uygun yetkili analist lease kazanarak karar verebilir.
- **Bulk:** Her ID için yetki/lock/terminal-state kontrolü; engelli olanlar değiştirilmez ve ID bazlı sonuç döner. Hiç seçim olmamasında frontend yalnız mevcut sayfanın görünür ID listesini gönderir.
- **System Not Fraud:** Otomatik düşük risk işlemini yalnız görüntüleme sonrası edit başlatmanın kuralı açık olduğundan, detayda auto-assign kapsamı ilk etapta risk nedeniyle incelemeye düşen kayıtlarla sınırlanır. Bu varsayım Ömer tarafından doğrulanmadan nihai statü geçişi kodlanmaz.

Bu politikalardan müşteri/analist davranışı değiştirenler ilk ilgili ticket'ın DoR öncesi HQ'da onaylanır; diğerleri açık biçimde teknik default olarak sınanır. Ayrıntılı belirsizlik listesi [`DECISIONS.md`](DECISIONS.md) dosyasındadır.
