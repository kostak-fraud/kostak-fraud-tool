# UMDE / Bitirme Projesi — İlk Haftalık İlerleme Raporu Taslağı

**Dönem:** 21–28 Ekim 2026 (yaklaşık; Ömer'in gerçek rapor tarihi ayrıca doğrulanır).  
**Durum:** Taslak. Teslim veya implementasyon tamamlandı iddiası içermez. 

## 1. Proje ve motivasyon

Farklı ödeme işlem kanalları üzerinden akan sentetik olayların kural bazlı analiz edildiği, fraud operasyon ekibinin işlem inceleyebildiği ve kural yazabildiği kullanılabilir bir akademik platform tasarlanıyor. Akademik teslim öncelikli, gelecekte çoklu ödeme kuruluşuna hizmet verebilecek mimari sınırlar hedefleniyor.

## 2. Bugüne kadar tamamlanan **tasarım/hazırlık** işleri

- [x] Ürün modülleri, aktörler ve temel transaction lifecycle gereksinimleri yazılılaştırıldı.
- [x] Analist tablosu, saved view, bulk action, detay ve edit lock davranışları belgelenmeye başlandı.
- [x] No-code rule engine yetenekleri ve sentetik örnek kural tanımlandı.
- [x] İlk tech stack / altyapı topolojisi, mimari ADR'ler ve test standardı seçildi.
- [x] MVP önceliği ve dependency-based ticket planı oluşturuldu.
- [ ] Repo iskeleti, başarılı CI, production deployment ve çalışan demo **gerçekleştirilirse** kanıtla işaretlenecek.

## 3. Önerilen mimari özet

Next.js 16 + TypeScript UI; Java 25 + Spring Boot 4.1.x modular monolith (API ve worker); PostgreSQL/Supabase; Vercel frontend, Northflank API/worker; GitHub Actions kalite kapıları. Deployment yalnız gerçek URL, revision ve smoke kanıtı üretildiğinde tamamlanmış raporlanır. Ayrıntılar `TECH_STACK.md`, `ARCHITECTURE.md` ve `DEPLOYMENT_RUNBOOK.md` dosyalarındadır.

## 4. Üretilen artefaktlar

- PRD, domain sözleşmesi, rule engine gereksinimleri, UX blueprint, sentetik veri sözlüğü.
- Tech stack, ADR'ler, tenant/RBAC önerisi, delivery runbook.
- Backlog/ticket kabul kriterleri ve ilk hafta planı.
- Repo linki: **[gerçek URL buraya]**
- CI çalışma kanıtı: **[run URL]**
- Production web/API kanıtı: **[deploy URL / commit SHA / health]**

## 5. Önümüzdeki iş paketleri

1. İlk 1 hafta: FND-001, FND-002, koşullar uygunsa FND-003, UI-001.
2. Sonraki haftalar: sentetik transaction ingestion/list/filter, rule engine + builder, investigation lock/actions, P0 E2E ve demo.
3. Riskler: ana veri alanlarının henüz doğrulanmaması; kısa süre; hosting bütçesi ve izinler; rule aggregation ve eşzamanlı kilit doğruluğu.

## 6. Akademik rapor için dürüstlük notu

Çalışan sistem, entegrasyon veya test sonucu **yalnızca gerçek repo/CI/prod kanıtı mevcutsa tamamlandı** denmeli. Bu belge ilk gün tasarım ilerlemesini raporlamaya uygundur; başarılmamış implementasyonu tamamlanmış gibi sunmak için kullanılmaz.
