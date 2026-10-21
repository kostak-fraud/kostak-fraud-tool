# RULE-004 — MIN, MAX, AVG, COUNT DISTINCT ve çoklu grup key kapsamını genişlet

**Epic:** Rules  
**Öncelik:** P1  
**Boyut:** M (XS/S/M/L; takvim tahmini değildir)  
**Bağımlılıklar:** RULE-003  
**Durum:** PLANNED

## Sonuç / Ticket amacı
MIN, MAX, AVG, COUNT DISTINCT ve çoklu grup key kapsamını genişlet.

## Kabul kriterleri
- [ ] Tipli agregasyonlar yalnız destekli sayısal/kimlik alanlarında çalışır.
- [ ] Birleşik grup anahtarında nullable/missing alanlar deterministik ele alınır.
- [ ] Aynı field registry ve AST backend/UI contractı korunur.

## Zorunlu doğrulama
- Unit/integration operator matrix

## Kapsam dışı
Join, arbitrary formulas ve streaming OLAP yok.

## Risk / preflight kontrolü
Önce P0 COUNT/SUM tam çalışır olmalı.

## Kaynaklar
- [`docs/RULE_ENGINE.md`](../docs/RULE_ENGINE.md)
- [`docs/ENGINE_SEMANTICS.md`](../docs/ENGINE_SEMANTICS.md)

## Executor DoR notu
Bu ticket için dependency’ler kapalı, ilgili açık ürün kararları çözülmüş, mevcut repo/CI koşulları doğrulanmış ve test ortamı uygun olmalıdır. `FND-001` için boş repo/CI başlangıcı istisnası uygulanır.
