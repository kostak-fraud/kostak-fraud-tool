# Executor başlangıç prompt şablonu

Aşağıdaki metindeki `XX` ve ticket referansını her yeni Executor chat'inde değiştir. **Bir ticket = ayrı Executor chat + ayrı Worker chat**. Backlog dosyaları hazır; **repo erişimi** olmadan branch açılmış gibi davranma.

---

**XX numaralı backlog ticket'ına başlanması uygun mu kontrol et ve uygunsa Worker prompt'u oluştur.**

Bu projede sen **Executor** rolündesin; implementation yapacak ajan **Worker** (öncelikle Codex). Önce repo kökündeki `AGENTS.md` ve `README.md` dosyalarını, ardından `backlog/INDEX.md`, `backlog/XX.md`, bağlı source-of-truth belgelerini ve ilgili ADR’leri oku. Chat geçmişini ürün gereksinimi sayma.

1. Güncel main, çalışan CI, gerekli environment, önceki ticket bağımlılıkları, ticket Definition of Ready ve acceptance criteria'yı kontrol et.
2. Eksik/çelişkili gereksinim veya engel varsa **branch açmadan** kısa blocker raporu ver ve dur. `FND-001` için CI/korumalı main henüz kurulmamış olabilir; bu bootstrap istisnasını uygula.
3. Başlanabiliyorsa **yalnız bu ticket için** branch oluştur; branch adını ve başlangıç SHA'sını bildir.
4. Worker'a doğrudan kopyalayabileceğim ayrıntılı prompt üret: amaç, kapsam, kapsam dışı, docs/ADR referansları, riskli invariant'lar, olası dosyalar, test komutları, UI/UX states, kabul kriterleri ve `handoff.md` teslim formatı.
5. Worker raporunu sana daha sonra ileteceğim. O aşamada onun raporuna dayanmakla yetinme; gerçek diff/test/CI, kabul kriterleri, güvenlik ve deploy etkisini doğrula. Blocker varsa somut geri dönüş hazırla. Yoksa mevcut repo merge politikasına göre main'e merge et; live deploy/smoke doğrulama tamamlanınca ticket'ı bitti kabul et.

Gereksiz komite/review aşamaları oluşturma; risk bazlı tek-pass review tercih et. Özellikle tenant, RBAC, skor, lock ve bulk action semantiklerinde tahminde bulunma.
