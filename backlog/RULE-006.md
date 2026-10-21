# RULE-006 — Window aggregate condition’larını rule builder’a entegre edip örnek kompleks kuralı no-code yazdır

**Epic:** Rules UI  
**Öncelik:** P0  
**Boyut:** L (XS/S/M/L; takvim tahmini değildir)  
**Bağımlılıklar:** RULE-003, RULE-005  
**Durum:** PLANNED

## Sonuç / Ticket amacı
Window aggregate condition’larını rule builder’a entegre edip örnek kompleks kuralı no-code yazdır.

## Kabul kriterleri
- [ ] Group by, time window, WHERE, COUNT/SUM ve AND/OR/NOT aynı typed AST’ye map edilir.
- [ ] Aynı kart risky merchant nonsecure COUNT5 OR SUM10K kuralı UI’dan kurulup publish edilir.
- [ ] Yanlış alan/operator/window validasyonu yayınlamayı engeller.
- [ ] Kullanıcıya yayınlamadan önce okunabilir insan dili özeti gösterilir.

## Zorunlu doğrulama
- Playwright author-publish-evaluate E2E

## Kapsam dışı
Sentetik replay/test butonu P1.

## Risk / preflight kontrolü
Rule builder UX yüksek risk, Ömer manuel geçişi gerekli.

## Kaynaklar
- [`docs/UI_BLUEPRINT.md`](../docs/UI_BLUEPRINT.md)
- [`docs/RULE_ENGINE.md`](../docs/RULE_ENGINE.md)
- [`docs/ENGINE_SEMANTICS.md`](../docs/ENGINE_SEMANTICS.md)

## Executor DoR notu
Bu ticket için dependency’ler kapalı, ilgili açık ürün kararları çözülmüş, mevcut repo/CI koşulları doğrulanmış ve test ortamı uygun olmalıdır. `FND-001` için boş repo/CI başlangıcı istisnası uygulanır.
