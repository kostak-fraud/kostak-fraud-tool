# Erişim Yetkileri ve Kurum Sınırı — MVP Yetki Matrisi

**Durum: [HQ UYGULAMA TEMELİ, rol adları revize edilebilir].** Ömer'in Formica kullanıcı yönetimine erişimi yok. Matris burada önerilen ürün yetki modelidir; Formica'nın iddia edilen davranışı değildir.

| Yetki | Viewer | Analyst | Rule Author | Tenant Admin |
|---|:---:|:---:|:---:|:---:|
| `transactions.read` | ✓ | ✓ | ✓ | ✓ |
| `investigations.decide` | – | ✓ | – | ✓ |
| `investigations.comment` | – | ✓ | – | ✓ |
| `rules.read` | – | – | ✓ | ✓ |
| `rules.write` | – | – | ✓ | ✓ |
| `users.manage` | – | – | – | ✓ |
| `views.save_personal` | ✓ | ✓ | ✓ | ✓ |

- Aynı kişi birden fazla rol alabilir. Roller sadece izin kümelerini paketler; koruma **backend'de izin bazlı** yapılır.
- Kimlik: Supabase Auth. Kurum üyeliği ve izinler: kendi PostgreSQL tablolarımız. Auth JWT role claim'i tek başına authorization değildir.
- Kullanıcı kurumu JWT veya request body'de istediği gibi seçemez. İlk MVP'de **tek aktif tenant membership** ile demo yapılabilir; tüm transaction, rule, view, comment, lock ve audit tablolarında `tenant_id` tutulur ve API'de denetlenir.
- `Viewer` detay ekranını açabilir ama sahiplenmez/yazamaz. `Rule Author` transaction edit yetkisi olmadan kural yazabilir.
- Yetkisiz sayfalar sidebar'dan gizlense de URL ve API doğrudan çağrılarında 403 döndürür; diğer tenant'a ait ID'de bilgi sızdırmamak için 404 kullanılabilir.
- Kullanıcı yönetim UI'si MVP'de basit admin-only liste/rol atamadır; self-service sign-up, invite email ve faturalama dahil değildir.
- Test matrisi: tenant-A token'ı tenant-B ID erişemez; viewer karar/comment yapamaz; analyst rule güncelleyemez; rule author transaction edit edemez; admin kendi tenant'ı dışına yetki veremez.