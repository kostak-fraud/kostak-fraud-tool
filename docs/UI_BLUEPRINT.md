# UI Blueprint — Uygulamaya Geçmeden Önce Ekran Sözleşmesi

**Durum:** Kullanıcının anlattığı UX davranışları [`UX.md`](UX.md) dosyasında `[ONAYLI]`. Burada onlara uygun, uygulama sırasında test edilecek **HQ arayüz varsayımları** ve bileşen kararları vardır. Piksel-perfect Figma spesifikasyonu değildir.

## 1. Ortak tasarım sistemi

- Masaüstü öncelikli operasyon arayüzü; ilk hedef **1280 px ve üzeri**. 1024 px altında tablo yatay kaydırılır; kritik kontroller erişilebilir kalır, mobil fraud operasyonu MVP hedefi değildir.
- Sol menü genişletilebilir/daraltılabilir; aktif sayfa, kanal ve izin görünürlüğü açıkça gösterilir.
- 8 px tabanlı spacing ritmi, görünür focus ring, minimum 44 px action hedefi (yoğun tablo satırları 36–44 px olabilir), text için yeterli kontrast ve durumlar için hem renk hem metin.
- Tasarım tokenları: `surface`, `surface-muted`, `border`, `text-primary`, `text-secondary`, `primary`, `danger`, `success`, `warning`, `info`. Renkler Tailwind/shadcn tema değişkenleriyle merkezi tanımlanır; yerel component'a keyfi hex yazılmaz.
- Paylaşılan componentler: `AppShell`, `Sidebar`, `PageHeader`, `ChannelTabs`, `DataGrid`, `ColumnFilter`, `BulkActionBar`, `RiskScore`, `StatusBadge`, `TransactionDetailSection`, `RuleConditionGroup`, `WindowAggregateEditor`, `EmptyState`, `PermissionNotice`, `Toast`.
- Loading/skeleton, no-results/empty, network error/retry, permission denied, editing locked/read-only, pending mutation ve success toast ilk ekran ticket'larının parçası.

## 2. Transactions listesi — metinsel wireframe

```text
┌ Sidebar ┐  Transactions                                       [User]
│         │  [Wallet] [POS] [Physical POS]
│         │  Filters: [Status ▾] [Amount ▾] [+ Filter]   [Save view]
│         │  Selection: 0 selected / 100 visible       [Fraud] [Not Fraud]
│         │  ┌ □ ┬ Transaction ID ┬ Time ┬ Amount ┬ Status ┬ Score ┬ ...→ ┐
│         │  │ □ │ TX-...         │ ...  │ ...    │ ...    │ ...   │ ...  │
│         │  │ □ │ TX-...         │ ...  │ ...    │ ...    │ ...   │ ...  │
│         │  └───┴────────────────┴──────┴────────┴────────┴───────┴──────┘
│         │  Showing 100 / total result             [Previous] [Next]
└─────────┘
```

- Ekrana basılan her satır sabit transaction ID taşır. Kolon filtrelemesi ve server pagination URL'de geçici tutulabilir, ancak browser refresh'te **kaydedilmiş view geri yüklenir**; kalıcı olmayan düzen kalmaz. Uygulama URL query state ile saved-default ilişkisini tutarlı yönetir.
- Checkbox tıklamak satırın detay sayfasına yönlendirilmez; keyboard Enter ile satır detayına gidilebilir.
- Drag-and-drop kolon yeniden sıralama klavye alternatifine sahip olmalı; kolon gizleme yok. Checkbox/actions sticky önerisi tasarım testinde doğrulanacak.
- **0 seçili ⇒ o an görünür sayfanın tamamı** eylemi risklidir. Bu durumda buton sonrası kapsam belirten tek onay diyaloğu önerilir. Seçili satırlar için doğrudan işlem; sonuçta başarısız ID'ler açıkça raporlanır. Bu confirmation önerisi Ömer tarafından ayrıca onaylanmadı.
- Yeni işlem akışı mevcut sayfanın kayıtlarını kullanıcının altında kaydırmaz: yeni işlem sayacı ve `Refresh` aksiyonu (HQ varsayımı). Aktif seçimler refresh/navigasyon sırasında sıfırlanır.
- Kaydetme yalnız **kullanıcı+tenant+kanal başına tek varsayılan görünüm**ü günceller. Birden çok isimli preset MVP dışında.

## 3. Transaction detail — metinsel wireframe

```text
[← Transactions / Wallet]               TX-... [In Review] [Score 85/100]
Details: amount, time, merchant, account/card token and channel fields
Matched rules: name, rule version, score added, optional evaluated metric
Investigation: assigned user / read-only lock banner / comments timeline
                                                [On Hold] [Fraud] [Not Fraud]
```

- Ayrı route `transactions/:id`; kilit kazanıldığında edit kontrolü aktif olur. Başkasının aktif oturumunda ayrıntılar ve yorumlar okunabilir; tüm mutation butonları devre dışı, sebebi açıklanır.
- Eski son kararları açmak otomatik `In Review` yapmaz. Birden çok tab, kopuk ağ ve lease expiry durumları UI'da anlaşılır olmalı.
- `On Hold` sonrası kullanıcı beklenen dış bilgiyle ilgili yorum yazabilir; yeni karar bir sonraki uygun aktif edit oturumunda verilir (ayrıntılı state transition DOMAIN kaynağına bağlı).

## 4. Rules — liste ve no-code builder

```text
Rules [Wallet ▾]     [Create rule]
Rule name             Status       Score      Updated at    [Edit] [Toggle]

Create/Edit:
Name [_______________]     Channel [POS ▼]     Score [ 60 ]
Description [____________________________________________]
WHEN  [AND ▾]
  [merchant_risk] [equals] [HIGH]   [AND]
  [is_3ds]        [equals] [False]
  [OR GROUP: Window aggregation]
  Group by [card_ref]   During [last 1 hour]
  Where [merchant_risk=HIGH AND is_3ds=False]
  [COUNT(*) >= 5] OR [SUM(amount) >= 10000 TRY]
                              [Validate] [Save draft] [Publish]
```

- Condition builder, `field/operator/value` tiplerinin yanlış kombinasyonunu seçtirmez. Nested group sınırları görsel hiyerarşiyle okunur; her agregasyon hangi geçmiş kayıtları kapsadığını düz dille özetler.
- Draft/kural sürümü ve publish/disable state'leri `RULE_ENGINE.md` ile tutarlı uygulanır. Formica'nın Store/Enrichment kavramlarını ayrı ekran olarak şart koşmayız.
- Hatalı kuralda field-level validation, yayınlamada net hata; ağ kesilince görünür hata mesajı; kural yayınlanmadan gerçek değerlendirmeye alınmaz.
- Kural önizleme/sentetik replay ilk teslim için P1 olabilir; ilk P0'daki 'Validate' yapısal validasyondur ve risk üreten simülasyon değildir.

## 5. Manuel kullanılabilirlik turu (Ömer)

1. Wallet → POS geç; filtre uygula, kolon sırala, yenile: kaydedilmediyse geri dönsün; Save sonrası korunsun.
2. 1.000 sonuç/100 satır senaryosunda hiçbir checkbox seçmeden aksiyon kapsamı **100** olarak görünsün. 3 satır seçildiğinde yalnız 3 değişsin.
3. İşlem detayını iki analist hesabında aç: ikinci salt-okunur; ilk çıkınca kilit başka analiste devredilebilsin.
4. Rule builder'da 'aynı kart, son bir saat, riskli merchant, non-secure, COUNT 5 OR SUM 10K' kuralını kod yazmadan oluştur.
5. Sadece transactions yetkisi olan kullanıcı Rules ekranına URL ile gitse de API isteği reddedilsin.