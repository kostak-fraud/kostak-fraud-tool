# RULE-005 — Kural listesi ve no-code tek işlem condition builder UI geliştirilir

**Epic:** Rules UI  
**Öncelik:** P0  
**Boyut:** M (XS/S/M/L; takvim tahmini değildir)  
**Bağımlılıklar:** RULE-001, UI-001  
**Durum:** PLANNED

## Sonuç / Ticket amacı
Kural listesi ve no-code tek işlem condition builder UI geliştirilir.

## Kabul kriterleri
- [ ] Rules listesinde channel, score, status ve edit/publish/disable kontrolü vardır.
- [ ] Nested Boolean condition grupları, field/operator/value typed editörü çalışır.
- [ ] Validation açıklayıcıdır; read-only user rule mutation yapamaz.
- [ ] Loading/error/empty/success durumları ve keyboard flow testlidir.

## Zorunlu doğrulama
- Vitest and Playwright typed validation

## Kapsam dışı
Temporal widget RULE-006.

## Risk / preflight kontrolü
Kural karmaşıklığı UI’da görünür ve anlaşılır olmalı.

## Kaynaklar
- [`docs/UX.md`](../docs/UX.md)
- [`docs/UI_BLUEPRINT.md`](../docs/UI_BLUEPRINT.md)
- [`docs/RULE_ENGINE.md`](../docs/RULE_ENGINE.md)
- [`docs/RBAC.md`](../docs/RBAC.md)

## Executor DoR notu
Bu ticket için dependency’ler kapalı, ilgili açık ürün kararları çözülmüş, mevcut repo/CI koşulları doğrulanmış ve test ortamı uygun olmalıdır. `FND-001` için boş repo/CI başlangıcı istisnası uygulanır.
