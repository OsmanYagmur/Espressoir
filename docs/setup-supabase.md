# Supabase kurulumu (dev + prod)

Docker gerekmez. Geliştirme doğrudan bulut **dev** projesine karşı yapılır; **prod** yalnızca canlı site içindir.

## 1. İki projeyi aç

[supabase.com/dashboard](https://supabase.com/dashboard) → **New project** (Free plan). Bu adımı iki kez yap:

| Alan              | dev                                         | prod              |
| ----------------- | ------------------------------------------- | ----------------- |
| Name              | `espressoir-dev`                            | `espressoir-prod` |
| Region            | **Central EU (Frankfurt)**, `eu-central-1`  | aynı              |
| Database password | güçlü bir parola (parola yöneticine kaydet) | farklı bir parola |

> İpucu: Parolada yalnızca harf ve rakam kullanırsan bağlantı adresinde (URL) karakter kodlamasıyla (`%40` gibi) uğraşmazsın.

## 2. Auth ayarları (her iki projede)

**Authentication → Sign In / Providers → Email**

- Email sağlayıcısı: **açık**
- **Allow new users to sign up: KAPALI.** Kayıt Faz 2'ye kadar kapalı. Hesabın `pnpm admin:bootstrap` ile oluşturulur (aşağıda, 6. adım).
- Minimum parola uzunluğu: **10**. Email sağlayıcı ayarlarında "Minimum password length" alanı; dashboard sürümüne göre parola güvenliği ayarlarında da olabilir.

**Authentication → URL Configuration:**

- Site URL: dev için `http://localhost:3000`, prod için `https://espressoir.com` (domain bağlanana kadar `https://<proje>.vercel.app`)

## 3. Anahtarları topla

Her proje için:

| Değişken                               | Nerede                                                                                         |
| -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Project Settings → Data API → Project URL (`https://<ref>.supabase.co`)                        |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys → **Publishable key** (`sb_publishable_…`)                         |
| `SUPABASE_SECRET_KEY`                  | Project Settings → API Keys → **Secret key** (`sb_secret_…`)                                   |
| `SUPABASE_DB_URL`                      | Üstteki **Connect** düğmesi → **Session pooler** → URI. `[YOUR-PASSWORD]` yerine parolanı yaz. |
| `SUPABASE_*_PROJECT_REF`               | Proje URL'sindeki `<ref>` kısmı                                                                |

Projende hâlâ eski adlı anahtarlar varsa: **anon** = publishable, **service_role** = secret.

**Neden Session pooler?** Free planda doğrudan bağlantı yalnızca IPv6 destekliyor; çoğu ev ağı ve GitHub Actions IPv4 kullanıyor. Session pooler IPv4 ile çalışır.

## 4. Env dosyalarını doldur

```bash
cp .env.example .env.local        # dev projesinin değerleri
cp .env.example .env.prod.local   # prod projesinin değerleri
```

İki dosyaya da `SUPABASE_DEV_PROJECT_REF` ve `SUPABASE_PROD_PROJECT_REF` değerlerini yaz. Script'ler bunlarla yanlış projeye bağlanmayı engeller. İki dosya da git'e girmez.

⚠️ `SUPABASE_SECRET_KEY` RLS'i atlar. Yalnızca yerel script'lerde kullanılır; **Vercel'e veya başka bir yere koyma.**

## 5. Migration'ları uygula

```bash
pnpm db:push:dev            # dev'e uygula (önce görmek için: pnpm db:push:dev --dry-run)
```

Prod'a, dev'de doğruladıktan sonra:

```bash
pnpm db:push:prod           # onay için prod proje ref'ini yazman istenir
```

`pnpm types:gen` artık veritabanına bağlanmaz: tipleri doğrudan `supabase/migrations` klasöründen, bilgisayarında çalışan gömülü bir Postgres ile üretir. Yeni bir migration yazınca çalıştır ve çıkan dosyayı commit et (CI bayat kalırsa uyarır).

## 6. Hesabını oluştur

Kayıt kapalı olduğu için ilk (ve şimdilik tek) hesap bir script ile açılır. `.env.local` içindeki `OWNER_USERNAME` (yalnızca `a–z`, `0–9`, `_`; 3–24 karakter) ve `OWNER_EMAIL` değerlerini doldur, sonra:

```bash
pnpm admin:bootstrap              # dev: parolayı sorar (en az 10 karakter), ekrana yazmaz
pnpm admin:bootstrap --env prod   # prod: aynı adımlar, .env.prod.local ile
```

Parola doğrudan Supabase Auth'a gider; hiçbir dosyaya yazılmaz. Script hesabı `admin` yapar. Tekrar çalıştırmak zararsızdır: hesap varsa yalnızca kontrol eder, parolayı değiştirmez.

Giriş: `/giris` (sayfanın en altındaki **Panel** bağlantısı da oraya götürür).

## 7. Notion arşivini içe aktar

1. Notion'da veritabanını aç → **•••** → **Export** → **Markdown & CSV**. İnen CSV'yi `data/notion-export.csv` olarak kaydet. (Satır sayfalarının `.md` dosyaları da varsa `data/notion-export/` klasörüne koy; sayfa içine yazdığın ek notlar tadım notuna eklenir.) `data/` klasörü git'e girmez.
2. Önce bak, sonra yaz:

```bash
pnpm import:notion --offline     # hiçbir yere bağlanmadan dener; raporu yazar
pnpm import:notion --dry-run     # dev'de dener, sonunda geri alır
pnpm import:notion               # dev'e yazar
pnpm import:notion --env prod    # prod'a yazar (proje ref'ini sorar)
```

Her çalıştırma `data/import-report.md` dosyasını yazar: kaç marka/kahve/tadım eklendi, hangi markalar birleştirildi, hangi alanlar boş bırakıldı, hangi değerler kurallardan türetildi, hangi notlar için yazım önerisi var.

- **Tekrar çalıştırmak güvenli:** daha önce aktarılan satırlar tanınır ve atlanır; kopya oluşmaz. Sitede düzelttiğin bir kayıt, sonraki import'ta ezilmez.
- **Kurallar tek dosyada:** marka eşleştirmeleri, yazım düzeltmeleri, form/yöntem eşlemeleri ve menşe çıkarımı `scripts/notion/rules.ts` içinde. Bir çıkarımı istemiyorsan o satırı sil.
- Import'tan sonra site en geç bir saat içinde kendini yeniler; hemen görmek istersen Vercel'de **Redeploy** de.

## Migration kuralları

- Yeni değişiklik: `pnpm db:new <ad>` → `supabase/migrations/<zaman>_<ad>.sql`. **Aynı adla** `supabase/rollbacks/<zaman>_<ad>.down.sql` geri alma dosyasını da yaz; CI ikisini de test ediyor.
- Uygulanmış bir migration'ı asla düzenleme; yeni bir migration ekle.
- Mobil uygulama gelecek: önce ekle, sonra kaldır (eski uygulama sürümleri bir süre eski şemayı kullanır).
- Veri silen veya geri alınamaz bir değişiklikten önce mutlaka konuşalım.

## Free plan sınırları

- En fazla 2 aktif proje (dev + prod tam olarak bu).
- 7 gün hareketsiz kalan proje duraklatılır. `keepalive` iş akışı haftada iki kez iki projeye de birer istek atar (kurulum: [`backup.md`](./backup.md)). Yine de duraklarsa dashboard'dan **Restore** demen yeterli.
- **Otomatik yedek yok.** `backup` iş akışı her hafta prod'un şifreli `pg_dump` yedeğini alır (kurulum ve geri yükleme: [`backup.md`](./backup.md)).
- Görsel dönüştürme (image transformations) yok. Fotoğraflar yüklenmeden önce tarayıcıda küçültülecek (Faz 3).
