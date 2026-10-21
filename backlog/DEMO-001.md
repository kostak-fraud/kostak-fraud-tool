# DEMO-001 — Reproducible sentetik demo, akademik mimari/test kanıtı, final sunum/rapor hazırlığı

**Epic:** Academic Delivery  
**Öncelik:** P0  
**Boyut:** M (XS/S/M/L; takvim tahmini değildir)  
**Bağımlılıklar:** FND-003, RULE-006, INV-003, TX-007, OPS-002  
**Durum:** PLANNED

## Sonuç / Ticket amacı
Reproducible sentetik demo, akademik mimari/test kanıtı, final sunum/rapor hazırlığı.

## Kabul kriterleri
- [ ] Tek komutla demo fixtures üretilebilir; transaction→rule score→review/block→analyst decision anlatılır.
- [ ] En az iki rol, üç kanal, saved view, aggregate rule ve locked detail gösterilebilir.
- [ ] CI/prod URL/commit, test sonuçları ve limitler gerçek kanıtla raporlanır.
- [ ] Ürün ekran görüntüleri yalnız kendi uygulamamızdandır; kurum bilgisi yer almaz.

## Zorunlu doğrulama
- Playwright critical flow, demo rehearsal, acceptance checklist

## Kapsam dışı
Real payment integrations / fraud dashboard yok.

## Risk / preflight kontrolü
Akademik rapor teslim tarihi Ömer ile ayrı teyit edilir.

## Kaynaklar
- [`docs/ROADMAP.md`](../docs/ROADMAP.md)
- [`docs/PRODUCT.md`](../docs/PRODUCT.md)
- [`docs/UI_BLUEPRINT.md`](../docs/UI_BLUEPRINT.md)

## Executor DoR notu
Bu ticket için dependency’ler kapalı, ilgili açık ürün kararları çözülmüş, mevcut repo/CI koşulları doğrulanmış ve test ortamı uygun olmalıdır. `FND-001` için boş repo/CI başlangıcı istisnası uygulanır.
