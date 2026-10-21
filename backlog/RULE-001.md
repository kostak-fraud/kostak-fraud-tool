# RULE-001 — Typed versioned rule AST doğrulama, DB şeması ve CRUD/publish/disable API tasarla

**Epic:** Rules  
**Öncelik:** P0  
**Boyut:** M (XS/S/M/L; takvim tahmini değildir)  
**Bağımlılıklar:** TX-001, IAM-001  
**Durum:** PLANNED

## Sonuç / Ticket amacı
Typed versioned rule AST doğrulama, DB şeması ve CRUD/publish/disable API tasarla.

## Kabul kriterleri
- [ ] Kural yalnız bir channel/tenant için saklanabilir, skor katkısı backend validation’dan geçer.
- [ ] Draft, publish, disable ve yeni version dönüşümü auditli çalışır.
- [ ] Allowlist field/operator ve bounded expression depth; arbitrary SQL/code engellenir.
- [ ] Published version geçmiş değerlendirmeyi etkileyerek değiştirilemez.

## Zorunlu doğrulama
- AST unit invalid cases, permission and tenant tests

## Kapsam dışı
UI ve temporal evaluation yok.

## Risk / preflight kontrolü
AST değişikliğinin backwards-compatibility riski.

## Kaynaklar
- [`docs/RULE_ENGINE.md`](../docs/RULE_ENGINE.md)
- [`docs/ENGINE_SEMANTICS.md`](../docs/ENGINE_SEMANTICS.md)

## Executor DoR notu
Bu ticket için dependency’ler kapalı, ilgili açık ürün kararları çözülmüş, mevcut repo/CI koşulları doğrulanmış ve test ortamı uygun olmalıdır. `FND-001` için boş repo/CI başlangıcı istisnası uygulanır.
