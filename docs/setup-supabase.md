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
- **Allow new users to sign up: KAPALI.** Kayıt Faz 2'ye kadar kapalı. Hesaplar `pnpm admin:bootstrap` ile oluşturulacak.
- Minimum parola uzunluğu: **10**. Email sağlayıcı ayarlarında "Minimum password length" alanı; dashboard sürümüne göre parola güvenliği ayarlarında da olabilir.

**Authentication → URL Configuration** (Faz 1'de giriş eklenince gerekecek):

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
pnpm types:gen              # TS tiplerini dev şemasından üret; değişiklik çıkmamalı
```

Prod'a, dev'de doğruladıktan sonra:

```bash
pnpm db:push:prod           # onay için prod proje ref'ini yazman istenir
```

## Migration kuralları

- Yeni değişiklik: `pnpm db:new <ad>` → `supabase/migrations/<zaman>_<ad>.sql`. **Aynı adla** `supabase/rollbacks/<zaman>_<ad>.down.sql` geri alma dosyasını da yaz; CI ikisini de test ediyor.
- Uygulanmış bir migration'ı asla düzenleme; yeni bir migration ekle.
- Mobil uygulama gelecek: önce ekle, sonra kaldır (eski uygulama sürümleri bir süre eski şemayı kullanır).
- Veri silen veya geri alınamaz bir değişiklikten önce mutlaka konuşalım.

## Free plan sınırları

- En fazla 2 aktif proje (dev + prod tam olarak bu).
- 7 gün hareketsiz kalan proje duraklatılır. Faz 1'de prod için haftada iki kez "uyandırma" iş akışı eklenecek. Dev duraklarsa dashboard'dan **Restore** demen yeterli.
- **Otomatik yedek yok.** Faz 1'de haftalık, şifreli `pg_dump` iş akışı eklenecek.
- Görsel dönüştürme (image transformations) yok. Fotoğraflar yüklenmeden önce tarayıcıda küçültülecek (Faz 3).
