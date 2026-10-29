# Uygulanabilir Yol Haritası — 21 Ekim 2026 Başlangıç

**Zaman:** İlk ilerleme raporu ~28 Ekim 2026; akademik teslim ~iki ay (kesin tarihler teyit edilmedi). Ticket detayları yalnız [`backlog/INDEX.md`](../backlog/INDEX.md) ve ilgili tekil ticket dosyasında bulunur. Bu plan, kesin haftalık taahhüt değil risk/bağımlılık sırasıdır.

| Zaman aralığı | Öncelikli çıktı | Hedef ticket'lar | Kanıt |
|---|---|---|---|
| Hafta 1 | Repo, CI ve mümkünse canlı boş web/API; ilk ekran iskeleti | FND-001, FND-002, FND-003, UI-001 | Repo, Actions run, deploy URL + smoke, kendi ürünümüz screenshot |
| Hafta 2 | Auth, tenant ve sentetik DB/ingestion | IAM-001, TX-001, TX-002 | Migration, seeded synthetic stream |
| Hafta 3 | Dense kanal tablosu, pagination, filtering | TX-003, TX-004, TX-005 | Filtreli liste demo ve API test |
| Hafta 4 | Saved view, direct rule model/evaluation | TX-006, RULE-001, RULE-002 | View refresh + score/status demo |
| Hafta 5 | COUNT/SUM temporal engine, rule builder başlangıcı | RULE-003, RULE-005 | 1h COUNT/SUM rule integration test |
| Hafta 6 | Gelişmiş builder, transaction detail, atomik lock | RULE-006, INV-001, INV-002 | No-code senaryo ve 2 analist lock testi |
| Hafta 7 | Not/comment/final verdict, page-scope bulk | INV-003, TX-007 | End-to-end fraud analyst flow |
| Hafta 8 | Güvenlik/perf/test, akademik demo ve rapor | OPS-002, DEMO-001 | CI/production URL, test raporu, canlı demo |

**P1 fırsatları:** RULE-004 (diğer agregasyonlar), OPS-001 (SSE + fallback), RUL-007 (rule preview), ADM-001 (kullanıcı yönetim UI). P0 geç kalıyorsa P1 askıya alınır. Haftalar arasında paralellik mümkün, ancak dependency zinciri atlanmaz.

## Risk yönetimi

- **Bir haftalık rapor:** İlk hafta tamamen uygulama bitirmek yerine doğrulanabilir altyapı kanıtı ve ürün/mimari/backlog dokümantasyonu hedeflenir. Çalışan repo/deploy varsa ayrıca gösterilir, yoksa dürüstçe planlanmış denir. Taslak: [`PROGRESS_REPORT.md`](PROGRESS_REPORT.md).
- **Zamansal Rule Engine:** Belirlenmiş sınırlı P0 senaryosunu uçtan uca çalıştır; kullanıcı SQL/kod çalıştırmasını hiçbir aşamada açma.
- **Erişim ve ödemeler:** Vercel, Northflank, Supabase ve GitHub org/repo izinleri Ömer tarafından sağlanmalıdır; eksikse deployment hazırlığı yapılabilir ancak Executor canlı rollout/smoke için external blocker raporu verir.
- **Açık domain kararları:** Kural/lock/bulk ticket'ları yanlış varsayım ile başlamasın. [`DECISIONS.md`](DECISIONS.md) listesi DoR kapısıdır.
- **UI/UX:** Ekranlar son hafta cilalanmaz; UI-001 ve her UI ticket'ı `UI_BLUEPRINT.md` altındaki manuel turla geliştirilir.
