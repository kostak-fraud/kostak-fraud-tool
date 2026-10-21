# RULE-002 — Worker üstünden tek transaction rule evaluation, rule-hit ve kümülatif score/status sonucu kaydet

**Epic:** Rules  
**Öncelik:** P0  
**Boyut:** L (XS/S/M/L; takvim tahmini değildir)  
**Bağımlılıklar:** RULE-001, TX-002  
**Durum:** PLANNED

## Sonuç / Ticket amacı
Worker üstünden tek transaction rule evaluation, rule-hit ve kümülatif score/status sonucu kaydet.

## Kabul kriterleri
- [ ] Direkt alan koşulları AND/OR/NOT ile değerlendirilir; hitler version bazlı saklanır.
- [ ] Matchler toplanıp raw/effective skor yazılır, review threshold ve blok flag uygulanır.
- [ ] Aynı transaction retry ikinci defa score/hit eklemez.
- [ ] Worker crash/restart ve farklı channel/tenant rule izolasyonu test edilir.

- [ ] Rule hit, skor, bloke alanı ve `EVALUATED` işaretleme aynı atomik işlemde yazılır; tekrar işleme toplam skoru değiştirmez.

## Zorunlu doğrulama
- Testcontainers scoring threshold+retry scenarios

## Kapsam dışı
Zaman penceresi sorguları RULE-003.

## Risk / preflight kontrolü
100+ score/block/review varsayımı onay gerektirir.

## Kaynaklar
- [`docs/RULE_ENGINE.md`](../docs/RULE_ENGINE.md)
- [`docs/ENGINE_SEMANTICS.md`](../docs/ENGINE_SEMANTICS.md)
- [`docs/DOMAIN.md`](../docs/DOMAIN.md)

## Executor DoR notu
Bu ticket için dependency’ler kapalı, ilgili açık ürün kararları çözülmüş, mevcut repo/CI koşulları doğrulanmış ve test ortamı uygun olmalıdır. `FND-001` için boş repo/CI başlangıcı istisnası uygulanır.
