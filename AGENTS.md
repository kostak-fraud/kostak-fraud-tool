# Ajan Çalışma Sözleşmesi

Bu dosya tüm repo oturumlarının ortak giriş noktasıdır. Ürün kurallarını burada yeniden yazma; kaynakları [`README.md`](README.md) içinden bul.

## Değişmez ilkeler

1. Kullanıcı Ömer'dir; HQ ürün/mimari kararlarını verir. Executor hazırlık, preflight, inceleme ve merge ile ilgilenir. Worker kodlar ve test eder. Her ticket için **ayrı Executor ve Worker chat** kullanılır.
2. Worker yalnızca Executor'ın hazırladığı ticket kapsamını uygular; bağımsız kapsam genişletmez. Belirsizlik varsa `handoff.md` içinde açıklar, uydurmaz.
3. Ürün öncelikle 2 aylık akademik teslim için geliştiriliyor; gelecekte ticarileşebilir, tenant-aware mimari amaçlanıyor. Gerçek ödeme/müşteri verisi kullanılmaz.
4. UI/UX kabul kriterlerinin parçasıdır; işlevsel ama kullanışsız ekran "bitti" sayılmaz. Önce [`docs/UX.md`](docs/UX.md) okunur.
5. Güvenlik, tenant izolasyonu, backend yetki kontrolü, deterministik test ve gözlemlenebilirlik önemlidir. Gereksiz soyutlama, onay zinciri, kapsam dışı refactor ve erken mikroservisleşme istemiyoruz.
6. Her main merge gerekli kontrolleri geçmeli ve canlıya yansıyıp doğrulanabilmelidir. Stack ve ortam kararları [`docs/TECH_STACK.md`](docs/TECH_STACK.md) dosyasında; mimari [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) dosyasında.
7. **Tech stack ve temel topoloji HQ tarafından seçildi.** Mock field sözlüğü ve bazı yaşam döngüsü semantikleri **tasarım varsayımıdır, Ömer onayı değildir**. Tam dependency patch pinleri ve açık domain kararları tamamlanmış sayılmaz. İlk scaffold ticket’ında uyumluluk kanıtı gerekir.

## Ticket çalışma biçimi

- **Executor / başlatma:** Ticket önkoşulları, [`backlog/INDEX.md`](backlog/INDEX.md) ve tekil ticket dosyası, dependency, repo ve test/CI durumunu kontrol et. Başlanamazsa blocker ile dur. Başlanabilirse yalnız o ticket'a ait branch açıp sınırları ve kabul kriterlerini içeren Worker prompt'u üret.
- **Worker / uygulama:** Sadece atanmış branch'te değişiklik yap, ilgili otomatik testleri çalıştır, UI/UX durumlarını uygula, kök dizine `handoff.md` oluştur. Main'e merge etme.
- **Executor / kapanış:** Worker raporunu ve `handoff.md` dosyasını okuyarak diff, testler, DB migrasyonları, güvenlik ve kabul kriterlerini kontrol et. Bloklayıcı sorun varsa Worker'a somut geri bildirim; yoksa merge/deploy/doğrulama ve ticket kapanışı.

Detaylı koşullar: [`docs/DELIVERY.md`](docs/DELIVERY.md). Şablonlar: [`templates/`](templates/).