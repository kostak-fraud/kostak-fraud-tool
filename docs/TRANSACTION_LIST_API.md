# Transaction List API

**Endpoint:** `GET /api/v1/transactions`

Bu endpoint yalnız kimliği doğrulanmış ve server-side üyeliğinden `transactions.read` izni çözülen
kullanıcılar içindir. Tenant kapsamı JWT subject'ten bulunan tek aktif üyelikle belirlenir. İstekten
gelen bir `tenantId`, header veya UI state sorgu kapsamını değiştirmez.

## Request

| Parametre | Zorunlu | Varsayılan | Sözleşme |
|---|---:|---:|---|
| `channel` | Evet | — | Yalnız `wallet`, `pos`, `physical_pos`; eksik, boş veya bilinmeyen değer `400` döndürür. |
| `page` | Hayır | `0` | Zero-based ve negatif olamaz. |
| `pageSize` | Hayır | `50` | `1..100`; üst sınır aşılırsa `400`, sessiz clamp uygulanmaz. |

Örnek:

```http
GET /api/v1/transactions?channel=wallet&page=0&pageSize=50
Authorization: Bearer <jwt>
```

Sıralama client tarafından değiştirilemez ve her zaman
`occurred_at DESC, id DESC` şeklindedir. Yalnız `evaluation_state = 'processed'` satırları listelenir;
bu dahili alan response'a çıkarılmaz ve analyst-facing `reviewStatus` ile karıştırılmaz.

## Response

```json
{
  "items": [
    {
      "id": "00000000-0000-4000-8000-000000000001",
      "channel": "wallet",
      "occurredAt": "2026-10-29T10:00:00Z",
      "receivedAt": "2026-10-29T10:00:01Z",
      "amount": 42.50,
      "currency": "TRY",
      "customerRef": "MOCK-CUST-001",
      "cardRef": null,
      "merchantRef": null,
      "merchantRisk": null,
      "transactionType": "transfer",
      "reviewStatus": "not_fraud",
      "riskScore": 0,
      "assignedUserId": null,
      "paymentBlocked": false,
      "senderAccountRef": null,
      "receiverAccountRef": "MOCK-ACCT-001",
      "transferDirection": "in",
      "is3ds": null,
      "terminalRef": null
    }
  ],
  "page": 0,
  "pageSize": 50,
  "totalElements": 1,
  "totalPages": 1
}
```

Response, V3 transaction şeması ile `TransactionFieldRegistry` içindeki analyst-visible alanları
kullanır. `tenantId`, `sourceReference`, `idempotencyKey`, `rawScore`, dahili evaluation state ve
ingestion/audit kolonları response'a dahil değildir.

Sonucun bulunmadığı veya istenen page sonuç aralığının dışında kaldığı durumda `items` boş olur;
istenen `page`/`pageSize` ile aynı logical result set'in `totalElements` ve `totalPages` değerleri
dönmeye devam eder. Hiç eşleşme yoksa `totalPages` değeri `0` olur.

## Error contract

- JWT yok/geçersiz: `401 Unauthorized`.
- Kimliği doğrulanmış ancak `transactions.read` izni olmayan principal: `403 Forbidden`.
- Geçersiz channel veya pagination: `400 Bad Request`.

## Pagination ve sorgu maliyeti

MVP'de zero-based page navigasyonu ve exact total metadata gerektiği için bounded SQL
`LIMIT/OFFSET` kullanılır. Offset `long` olarak overflow kontrollü hesaplanır; tüm kayıtlar belleğe
alınmaz. Derin sayfalar offset büyüdükçe daha pahalıdır; ileride page-number gereksinimi değişirse
keyset/cursor ayrı bir sözleşme olarak değerlendirilebilir.

Page ve exact-count sorguları aynı üç predicate'i kullanır: authorized `tenant_id`, istenen `channel`
ve `evaluation_state = 'processed'`. Exact `COUNT(*)` eşleşen küme büyüdükçe lineer maliyet taşır ve
her list isteğinde çalışır. TX-003 entegrasyon testi 50.000 sentetik PostgreSQL satırında doğal planner
ile `EXPLAIN ANALYZE, BUFFERS` çalıştırır; ölçülen plan ve indeks kararı Worker handoff'unda kaydedilir.
