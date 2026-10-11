# Vercel'e yayın ve espressoir.com

Hedef: **Vercel Hobby** (ücretsiz, ticari olmayan kullanım), fonksiyon bölgesi **Frankfurt (`fra1`)**, veritabanına yakın. Public sayfalar statik üretildiği için ziyaretçi başına sunucu fonksiyonu çalışmaz; limitler rahat kalır.

## 1. Repoyu private yap

GitHub → `OsmanYagmur/Espressoir` → **Settings → General → Danger Zone → Change visibility → Private**.
Haftalık şifreli DB yedekleri bu repoda Actions artifact'ı olarak saklanacak; repo public kalırsa bu artifact'lar herkese açık olur.

## 2. Projeyi Vercel'e bağla

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → GitHub'ı bağla. Private repo için Vercel GitHub uygulamasına bu repoya erişim izni ver.
2. `OsmanYagmur/Espressoir` → **Import**.
3. **Root Directory: `apps/web`** (Edit'e tıklayıp seç). Framework otomatik olarak Next.js algılanır. Install ve build komutlarını varsayılan bırak; pnpm, lockfile'dan algılanır.
4. **Environment Variables:**

   | Değişken                               | Production    | Preview + Development |
   | -------------------------------------- | ------------- | --------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`             | prod projesi  | dev projesi           |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | prod projesi  | dev projesi           |
   | `NEXT_PUBLIC_SIGNUP_ENABLED`           | `false`       | `false`               |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`       | site anahtarı | aynı anahtar          |
   | `NEXT_PUBLIC_AUTH_GOOGLE`              | `true`/boş    | `true`/boş            |

   Son iki satır giriş kurulumuyla gelir ([`setup-auth.md`](./setup-auth.md)); o adımlar yapılana kadar boş kalır.

   ⛔ `SUPABASE_SECRET_KEY` ve `SUPABASE_DB_URL` Vercel'e **girmez**. Uygulama çalışırken bunlara hiç ihtiyaç duymuyor.

   - **Type: Config** seç, Secret değil. `NEXT_PUBLIC_` ile başlayan değerler zaten tarayıcıya gider; Secret seçersen Vercel "Remove the public framework prefix…" uyarısı verir. Kaydedilmiş bir Secret sonradan Config'e çevrilemez: sil ve Config olarak yeniden ekle.
   - Preview + Development sütunu boş kalırsa PR önizlemeleri derlenmez (PR'daki **Vercel** satırı kırmızı olur; canlı site etkilenmez). Dev projesini sonradan eklemek: [`setup-supabase.md`](./setup-supabase.md), "Dev projesini sonradan eklemek".
   - Vercel'in önerdiği **Supabase entegrasyonunu ekleme** ("Optional Integrations → Add"). Proje zaten var; entegrasyon yeni bir veritabanı kurar ve gizli anahtarları Vercel'e taşır.

5. **Deploy.** İlk yayın `https://<proje-adı>.vercel.app` adresinde açılır.

## 3. Proje ayarları (bir kez)

- **Settings → Git → Production Branch:** `main`. PR'lar otomatik önizleme (Preview) URL'si alır.
- **Settings → Functions → Function Region:** Frankfurt, `fra1`. `apps/web/vercel.json` bunu zaten ayarlıyor; burada doğrula.
- **Settings → Build and Deployment → Root Directory:** "Skip deployments when there are no changes to the root directory or its dependencies" seçeneğini aç. Yalnızca `supabase/` veya `docs/` değişince gereksiz build olmaz.

## 4. espressoir.com'u bağla

1. Vercel → proje → **Settings → Domains → Add** → `espressoir.com`.
2. Vercel `www.espressoir.com`'u da eklemeyi önerecek. **"Redirect www.espressoir.com to espressoir.com"** seçeneğini seç (kalıcı yönlendirme, 308).
3. Vercel sana iki kayıt gösterecek. **Değerleri Vercel'in Domains ekranındaki gibi kopyala**; Vercel projeye özel değerler verebiliyor:

   | Tür     | Host  | Değer (örnek, Vercel'deki gerçek değeri kullan)          |
   | ------- | ----- | -------------------------------------------------------- |
   | `A`     | `@`   | `76.76.21.21` ya da `216.198.79.1` gibi bir IP           |
   | `CNAME` | `www` | `cname.vercel-dns.com` ya da `….vercel-dns-0xx.com` gibi |

### Squarespace Domains'te adım adım

Alan adı Squarespace'te kayıtlı. Squarespace'in DNS'ini kullanmaya devam edip yalnızca kayıt ekleyeceğiz; e-posta gibi diğer kayıtlar etkilenmez.

1. [account.squarespace.com/domains](https://account.squarespace.com/domains) → **espressoir.com** → sol menüde **DNS** → **DNS Settings**.
2. **Önce çakışan kayıtları sil.** "Squarespace Defaults" (veya "Squarespace Domain Parking") adlı hazır kayıt grubu varsa, grubun yanındaki çöp kutusu simgesiyle grubun tamamını sil. Bu grupta kökü Squarespace sunucularına bağlayan `A` kayıtları (`198.185.159.x`, `198.49.23.x`) ve `www` → `ext-sq.squarespace.com` `CNAME`'i bulunur. Silmezsen Vercel doğrulaması başarısız olur.
   - "Google Workspace" gibi e-posta (`MX`) kayıtları varsa **onlara dokunma**.
   - Domain ayarlarında bir **Domain Forwarding** (yönlendirme) tanımlıysa onu da kapat.
3. **Custom Records → Add Record:**
   - Type **A**, Host **@**, Data: Vercel'deki IP → **Save**
   - Type **CNAME**, Host **www**, Data: Vercel'deki değer → **Save**
   - TTL varsayılan kalabilir.
4. Vercel → Domains ekranında iki alan adının da **"Valid Configuration"** olmasını bekle. Genelde 5–30 dakika sürer, en fazla birkaç saat. SSL sertifikası otomatik oluşturulur.
5. Kontrol: tarayıcıda `https://www.espressoir.com` açınca adres `https://espressoir.com`'a dönmeli.

**Alternatif (önermiyorum):** Squarespace'te **Domain Nameservers → Use custom nameservers** ile `ns1.vercel-dns.com` / `ns2.vercel-dns.com` girersen tüm DNS'i Vercel yönetir. O zaman e-posta kayıtlarını Vercel'de yeniden kurman gerekir. **DNSSEC** açıksa önce kapatman gerekir, yoksa alan adı bir süre erişilemez olur.

Domain bağlandıktan sonra:

- Vercel'de `NEXT_PUBLIC_SITE_URL` değerini `https://espressoir.com` yap ve yeniden yayınla (ayrıntı: aşağıda "Site adresi").
- Supabase prod → Authentication → URL Configuration → Site URL: `https://espressoir.com`.

## Hobby notları

- Hobby yalnızca kişisel, ticari olmayan kullanım içindir. Reklam, sponsor veya ücretli üyelik gelirse Pro'ya geçmek gerekir. Mimari buna hazır, kod değişikliği gerekmez.
- Limit aşılırsa fatura çıkmaz, ilgili özellik o ay için durur.

## Faz 1'i canlıya alma sırası

Site artık derlenirken veritabanını okuyor. Sıra önemli: **önce veritabanı, sonra kod.**

1. `pnpm db:push:prod` (şema), `pnpm admin:bootstrap --env prod` (hesabın), `pnpm import:notion --env prod` (arşiv). Ayrıntılar: [`setup-supabase.md`](./setup-supabase.md), 5–7. adımlar.
2. Vercel'de **Production** ortam değişkenlerinin prod projesini gösterdiğini doğrula (yukarıdaki tablo).
3. PR'ı `main`'e merge et; Vercel derleyip yayınlar. Migration uygulanmamış bir veritabanına karşı derleme **başarısız olur** (bilerek: boş ya da yanlış bir site yayınlanmasın).
4. Önizleme (Preview) derlemeleri dev projesini okur; dev'e de aynı üç adımı uygula.

Sitede bir tadım ekleyip düzenlediğinde ilgili sayfalar hemen yenilenir. Veritabanını başka bir yoldan değiştirirsen (import, SQL) sayfalar en geç bir saat içinde kendini günceller.

## Derleme hata verirse

Vercel → **Deployments** → başarısız yayın → **Build Logs**; hata günlüğün sonundadır.

| Günlükteki satır                                                             | Anlamı ve çözümü                                                                                                                                         |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `… okunamadı: Invalid API key`                                               | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` yanlış ya da eksik kopyalanmış. `.env.prod.local` içindeki değerin aynısını gir (başında/sonunda boşluk olmasın). |
| `NEXT_PUBLIC_SUPABASE_URL ve … tanımlı olmalı`                               | İki değişken o ortam (Production ya da Preview) için tanımlı değil.                                                                                      |
| Bir tablonun ya da görünümün bulunamadığını söyleyen `… okunamadı: …` hatası | Migration'lar o veritabanına uygulanmamış: `pnpm db:push:prod`.                                                                                          |
| Yalnızca PR'daki **Vercel** satırı kırmızı, `main` yayını yeşil              | Preview ortamının değişkenleri eksik. Canlı siteyi etkilemez.                                                                                            |

Değişkeni düzelttikten sonra: **Deployments** → **⋯** → **Redeploy**. Başarısız bir derleme yayına alınmaz; site son başarılı sürümle açık kalır.

## Site adresi

Sayfaların kalıcı adresi (canonical), sitemap ve paylaşım görselleri şu sırayla belirlenir: `NEXT_PUBLIC_SITE_URL` → Vercel'in üretim alan adı değişkeni → `espressoir.com`.

**Alan adı bağlanana kadar adresi elle sabitle.** Otomatik algılama canlı projede çalışmıyor: 11 Ekim 2026'da sayfalar hâlâ bağlı olmayan `https://espressoir.com` adresini gösteriyordu. Aynı değişkenlerle yerel derleme doğru adresi üretiyor, yani neden Vercel proje ayarlarında; dışarıdan görülemiyor. Elle sabitlemek her durumda çalışır:

1. Vercel → proje → **Settings → Environment Variables** → `NEXT_PUBLIC_SITE_URL` (varsa düzenle, yoksa ekle): değer `https://espressoir.vercel.app`, ortam yalnızca **Production**, tür **Config**.
2. **Deployments** → son yayın → **⋯** → **Redeploy**.
3. Kontrol: <https://espressoir.vercel.app/robots.txt> dosyasının son satırı `Sitemap: https://espressoir.vercel.app/sitemap.xml` olmalı.

`espressoir.com` bağlandığında aynı değişkeni `https://espressoir.com` yap ve yeniden yayınla. Preview ortamına bu değişkeni ekleme; önizlemeler arama motorlarına kapalıdır.
