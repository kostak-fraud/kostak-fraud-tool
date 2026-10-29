# Sentetik Transaction Veri Sözlüğü — Tasarım Temeli v0.1

**Durum: [HQ TASARIM VARSAYIMI]** Aşağıdaki alanlar **Ömer'in gerçek channel alan listesi değildir**. Mock generator, demo, filtreleme, SQL indeksleri ve Rule Builder şeması için önerilen asgari sözleşmedir. Ömer gerçek kurumsal veriyi değil, yalnızca anonim alan isimlerini daha sonra paylaşabilir. Değişiklikler `DATA-REVIEW` kontrolünden geçer.

## Ortak alanlar

| Alan (API) | Tür | Anlam | Filtre | Rule | Not |
|---|---|---|---|---|---|
| `id` | UUID | Benzersiz sentetik ID | exact | equality | Stable, idempotency |
| `tenant_id` | UUID | Kurumsal kapsam | kullanıcı filtresi yok | dahili | Sunucu kimliğinden |
| `channel` | enum | `wallet`, `pos`, `physical_pos` | sekme | rule scope | Sabit üç kanal |
| `occurred_at` | ISO timestamp | İşlemin sentetik gerçekleşme zamanı | range | okunabilir alan | UI sıralama |
| `received_at` | ISO timestamp | Motorun işlemi aldığı zaman | range | window clock (ilk sürüm) | Sunucu zamanı |
| `amount` | decimal(18,2) | İşlem tutarı | eq/gt/gte/lt/lte/range | SUM/AVG/MIN/MAX | Floating point kullanılmaz |
| `currency` | ISO 4217 | İlk demoda `TRY` | equals/in | WHERE | Kur çevrimi yok |
| `customer_ref` | opaque string | Sentetik müşteri kimliği | eq/in | anchor | Gerçek müşteri verisi yok |
| `card_ref` | opaque string? | Sentetik token, PAN değil | eq/in | anchor | Wallet'ta boş olabilir |
| `merchant_ref` | opaque string? | Sentetik iş yeri kimliği | eq/in | anchor | Bazı Wallet işlemlerinde boş |
| `merchant_risk` | enum? | `LOW`/`MEDIUM`/`HIGH` | eq/in | WHERE | Mock feature |
| `transaction_type` | enum | Transfer/payment/topup vb. | eq/in | predicate | Kanal türüne göre kısıtla |
| `review_status` | enum | Beş durum, ayrı domain kaynağı | eq/in | kural girdisi değil | DOMAIN.md |
| `risk_score` | integer | Efektif 0–100 | eq/range | hesaplanan çıktı | Raw skor ayrı |
| `assigned_user_id` | UUID? | İnsan sahipliği | eq/in | kural girdisi değil | `System` için null + source |

## Kanal özel alanlar (şimdilik öneri)

| Channel | Alan | Tür | Kullanım |
|---|---|---|---|
| Wallet | `sender_account_ref`, `receiver_account_ref` | opaque string? | Gelen/giden transfer kümeleri |
| Wallet | `transfer_direction` | IN / OUT | Mahiyet inceleme senaryosu |
| POS | `is_3ds` | boolean? | Secure/non-secure koşulu |
| POS | `card_ref`, `merchant_ref` | opaque string | Zamansal fraud kuralı |
| Physical POS | `terminal_ref` | opaque string | Terminal bazlı gruplama |
| Physical POS | `card_ref`, `merchant_ref` | opaque string | Fiziksel POS kümeleri |

## Uygulama standardı

- Sık filtrelenen ve gruplanan alanlar **tipli ve indekslenebilir** SQL kolonlarıdır. Ek mock metadata `jsonb` olabilir; UI/Rule Engine yalnız explicit izinli field registry üzerinden erişir.
- Her alanın type, nullability, channel availability ve desteklenen operator bilgisi tek backend field registry'de tanımlanır; OpenAPI/Rule Builder bununla uyumlu olur.
- Çoklu kolon filtresi varsayılan AND ile uygulanır. Aynı alanın operatör çeşitleri veri tipine göre sınırlandırılır. Serbest SQL expression kabul edilmez.
- Tüm sahte hesap/kart numaraları gerçek bankacılık formatlarını taklit etmek zorunda değildir; erişim loglarında maskelenir.
- Kanal bilgisiyle uyumsuz, eksik veya bilinmeyen metadata rule authoring sırasında validasyon hatası üretir; motorda null semantiği `RULE_ENGINE.md` dosyasına bağlıdır.

## Alan listesi geldiğinde kontrol edilecekler

1. Gerçek operasyon için *alan adları* ile eşlemeler (hiçbir gerçek değer/veri alınmaz).
2. Hangi alan hangi kanalda var, required/nullable, veri tipleri.
3. Filtre operatörü/formatı ve sıralanabilen kolonlar.
4. Agregasyon için indekslenmesi gereken grup anahtarları.
5. Backend API, generator ve frontend registry'nin aynı şemadan beslendiğini doğrulayan sözleşme testi.

**Bilinçli sınır:** Bu taslak akademik mock domain modeli olup gerçek ödeme/bankacılık entegrasyon şeması olarak kullanılmaz.

## Uygulama eşlemesi (2026-10-29)
- Tasarım sözlüğü backend'de `TransactionFieldRegistry` üzerinden tipli field metadata olarak yayımlanır: `GET /api/v1/transactions/fields` ve `?channel=wallet|pos|physical_pos`.
- Kalıcı sentetik tablo Flyway `V3__create_transactions.sql` migration'ında kurulur. Alan adları gerçek kurumsal şema değildir; gerçek alan sözlüğü geldiğinde DATA-REVIEW yapılmalıdır.
- `tenant_id`, `source_reference` ve `idempotency_key` UI filtre metadata'sına dahil edilmez. Bütün demo referansları `MOCK-` ile başlar; kart alanları PAN değildir.


## TX-002 evaluation state ve generator kontrolü
- Flyway V4 ile transactions.evaluation_state (pending/processing/processed/failed) eklenir; bu alan analistin gördüğü review_status değildir.
- simulation_controls tenant başına seed, enabled, rate_per_second ve kalıcı next_sequence tutar. Varsayılan disabled; üretim ve sequence ilerlemesi tek DB transaction'ında yapılır.
- Global APP_SIMULATION_ENABLED varsayılan false'tur; production'da true olarak başlatılması RuntimePreflight tarafından reddedilir. Tenant admin kontrol endpoint'i yalnız simülasyonun açık olduğu ortamlarda start/stop ve 1–10 event/s hızını değiştirir.
