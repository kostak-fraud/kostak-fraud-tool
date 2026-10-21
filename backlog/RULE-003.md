# RULE-003 — Zaman pencereli `COUNT` ve `SUM`, WHERE, grup anchor ve OR birleşimini evaluator’a ekle

**Epic:** Rules  
**Öncelik:** P0  
**Boyut:** L (XS/S/M/L; takvim tahmini değildir)  
**Bağımlılıklar:** RULE-002  
**Durum:** PLANNED

## Sonuç / Ticket amacı
Zaman pencereli `COUNT` ve `SUM`, WHERE, grup anchor ve OR birleşimini evaluator’a ekle.

## Kabul kriterleri
- [ ] Aynı card_ref son 1h risky merchant non-3DS COUNT>=5 OR SUM(amount)>=10000 çalışır.
- [ ] Pencereye yeni işlemin dahil olup olmadığına ilişkin policy deterministik testlidir.
- [ ] Tenant/channel/currency izolasyonu; zaman sınırları ve null anchor testleri vardır.
- [ ] İndeksli aggregate query için `EXPLAIN ANALYZE` ve demo veriyle gözlem raporu verilir.

## Zorunlu doğrulama
- Deterministic clock/window-boundary integration + EXPLAIN

## Kapsam dışı
MIN/MAX/AVG/COUNT DISTINCT başka ticket.

## Risk / preflight kontrolü
Window semantics HQ baseline onayı gerekli.

## Kaynaklar
- [`docs/RULE_ENGINE.md`](../docs/RULE_ENGINE.md)
- [`docs/ENGINE_SEMANTICS.md`](../docs/ENGINE_SEMANTICS.md)
- [`docs/DATA_DICTIONARY.md`](../docs/DATA_DICTIONARY.md)

## Executor DoR notu
Bu ticket için dependency’ler kapalı, ilgili açık ürün kararları çözülmüş, mevcut repo/CI koşulları doğrulanmış ve test ortamı uygun olmalıdır. `FND-001` için boş repo/CI başlangıcı istisnası uygulanır.
