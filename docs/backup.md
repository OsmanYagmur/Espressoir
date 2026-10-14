# Yedek ve uyandırma

Supabase Free planda otomatik yedek yok ve 7 gün hareketsiz kalan proje duraklatılıyor. İki GitHub Actions iş akışı bunları karşılıyor. İkisi de bir kez kurulur.

> Önce repoyu **private** yap (bkz. [`deploy-vercel.md`](./deploy-vercel.md), 1. adım). Yedekler şifreli olsa da herkese açık bir repoda durmamalı.

## 1. Haftalık yedek (`backup.yml`)

Her pazartesi 03:17 UTC'de prod veritabanının `pg_dump` dökümünü alır, **runner'dan çıkmadan önce** `gpg` (AES-256) ile şifreler ve iş akışı artifact'ı olarak 90 gün saklar. Döküm `public` ve `auth` şemalarını içerir (tadımlar, kahveler, hesaplar).

**Fotoğraflar bu yedeğe girmez.** Dosyalar Supabase Storage'da durur (`media` kovası); veritabanında yalnızca adresleri vardır. Döküm geri yüklenirse tadımlar fotoğraflarını adresleriyle hatırlar, ama Storage kaybolduysa dosyalar geri gelmez. Fotoğraf yedeği şimdilik yok; ücretsiz katmanda en sade yol Supabase panelinden kovayı ara sıra indirmek. Ayrı bir yedek komutu istenirse eklenir.

GitHub → repo → **Settings → Secrets and variables → Actions → Secrets → New repository secret:**

| Secret              | Değer                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| `PROD_DB_URL`       | Prod projesinin **Session pooler** bağlantı adresi (`.env.prod.local` içindeki `SUPABASE_DB_URL`)        |
| `BACKUP_PASSPHRASE` | Uzun, rastgele bir parola. **Parola yöneticine kaydet:** bu olmadan yedek açılamaz, GitHub da göstermez. |

Kurduktan sonra bir kez elle dene: **Actions → Backup (prod database) → Run workflow.** İş bitince sayfanın altındaki **Artifacts** bölümünde `espressoir-prod-YYYY-AA-GG.dump.gpg` görünmeli.

### Yedekten geri yükleme

Artifact'ı indir (zip içinden `.dump.gpg` çıkar). Bilgisayarında `gpg` ve Postgres 17 istemcisi (`pg_restore`) gerekir (`brew install gnupg libpq`).

```bash
gpg --decrypt espressoir-prod-2026-10-12.dump.gpg > espressoir.dump
pg_restore --list espressoir.dump | head        # içinde ne var, bak
```

Veriyi geri yüklemek için hedef veritabanının bağlantı adresiyle:

```bash
pg_restore --dbname "<hedef-veritabanı-adresi>" --data-only \
  --schema=public --schema=auth espressoir.dump
```

- Hedef, migration'ları uygulanmış **boş** bir proje olmalı: yeni bir Supabase projesi aç, `.env.prod.local` dosyasını ona göre güncelle, `pnpm db:push:prod` ile şemayı kur, sonra veriyi yükle. Dolu bir veritabanının üstüne yüklemek kopya anahtar hatası verir.
- ⚠️ **Bu adımlar henüz baştan sona denenmedi.** Yedeğin gerçekten geri yüklenebildiğini görmek için ilk yedekten sonra bir kez dev projesine prova yapalım; bu sayfayı o provaya göre güncelleyeceğim.
- Geri yükleme canlı veriyi etkileyen bir iştir; yapmadan önce birlikte bakalım.
- İşin bitince açık dökümü sil: `rm espressoir.dump`.

## 2. Uyandırma (`keepalive.yml`)

Salı ve cuma 05:23 UTC'de her iki projenin API'sinden tek satır okur; bu, projeyi "aktif" tutar. Prod duraklarsa site açılmaz; dev duraklarsa Vercel önizleme derlemeleri başarısız olur.

Bu değerler gizli değil (tarayıcıya da gidiyorlar), o yüzden **variable** olarak girilir: **Settings → Secrets and variables → Actions → Variables → New repository variable:**

| Variable                        | Değer                                       |
| ------------------------------- | ------------------------------------------- |
| `PROD_SUPABASE_URL`             | prod `NEXT_PUBLIC_SUPABASE_URL`             |
| `PROD_SUPABASE_PUBLISHABLE_KEY` | prod `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| `DEV_SUPABASE_URL`              | dev `NEXT_PUBLIC_SUPABASE_URL`              |
| `DEV_SUPABASE_PUBLISHABLE_KEY`  | dev `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`  |

Eksik olan proje atlanır (uyarı verir, hata vermez).

## Bilmen gerekenler

- GitHub, **60 gün hiç commit almayan** repolarda zamanlanmış iş akışlarını kendiliğinden kapatır ve e-posta atar. O e-posta gelirse Actions sekmesinden yeniden etkinleştir.
- Zamanlanmış işler birkaç dakika gecikebilir; önemli değil.
- Artifact'lar 90 gün sonra silinir. Daha uzun saklamak istediğin bir yedeği indirip güvenli bir yere koy.
