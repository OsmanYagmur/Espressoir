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

   | Değişken                               | Production   | Preview + Development |
   | -------------------------------------- | ------------ | --------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`             | prod projesi | dev projesi           |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | prod projesi | dev projesi           |
   | `NEXT_PUBLIC_SIGNUP_ENABLED`           | `false`      | `false`               |

   ⛔ `SUPABASE_SECRET_KEY` ve `SUPABASE_DB_URL` Vercel'e **girmez**. Uygulama çalışırken bunlara hiç ihtiyaç duymuyor.

5. **Deploy.** İlk yayın `https://<proje-adı>.vercel.app` adresinde açılır.

## 3. Proje ayarları (bir kez)

- **Settings → Git → Production Branch:** `main`. PR'lar otomatik önizleme (Preview) URL'si alır.
- **Settings → Functions → Function Region:** Frankfurt, `fra1`. `apps/web/vercel.json` bunu zaten ayarlıyor; burada doğrula.
- **Settings → Build and Deployment → Root Directory:** "Skip deployments when there are no changes to the root directory or its dependencies" seçeneğini aç. Yalnızca `supabase/` veya `docs/` değişince gereksiz build olmaz.

## 4. espressoir.com'u bağla

1. Vercel → proje → **Settings → Domains → Add** → `espressoir.com`.
2. Vercel `www.espressoir.com`'u da eklemeyi önerecek. **"Redirect www.espressoir.com to espressoir.com"** seçeneğini seç (kalıcı yönlendirme, 308).
3. Alan adını aldığın firmanın DNS panelinde şu kayıtları gir. **Değerleri Vercel'in Domains ekranında gösterdiği gibi kopyala**; Vercel projeye özel değerler verebiliyor.

   | Tür     | Ad (Host)          | Değer                                                                                | TTL                    |
   | ------- | ------------------ | ------------------------------------------------------------------------------------ | ---------------------- |
   | `A`     | `@` (kök alan adı) | Vercel'in gösterdiği IP (çoğunlukla `76.76.21.21` ya da `216.198.79.1`)              | 3600 (veya varsayılan) |
   | `CNAME` | `www`              | Vercel'in gösterdiği değer (ör. `cname.vercel-dns.com` ya da `….vercel-dns-0xx.com`) | 3600 (veya varsayılan) |

4. `@` ve `www` için önceden kalmış `A`, `AAAA` veya `CNAME` kayıtlarını (park sayfası, yönlendirme hizmeti) **sil**. Çakışan kayıt doğrulamayı engeller.
5. Bir `CAA` kaydın varsa Let's Encrypt'e izin verdiğinden emin ol (`0 issue "letsencrypt.org"`). Hiç `CAA` kaydı yoksa bir şey yapman gerekmez.
6. Doğrulama birkaç dakikadan birkaç saate kadar sürebilir. Vercel iki alan adını da "Valid Configuration" olarak gösterdiğinde SSL sertifikası otomatik oluşturulur.

**Alternatif:** Alan adının nameserver'larını Vercel'e (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`) yönlendirirsen tüm DNS'i Vercel yönetir. Bu durumda e-posta (MX) gibi diğer kayıtları Vercel'de yeniden oluşturman gerekir.

Domain bağlandıktan sonra:

- Kod tarafında ek bir şey gerekmiyor; site adresi Vercel'in production domain değişkeninden otomatik okunuyor.
- Supabase prod → Authentication → URL Configuration → Site URL: `https://espressoir.com` (Faz 1'de giriş eklenince).

## Hobby notları

- Hobby yalnızca kişisel, ticari olmayan kullanım içindir. Reklam, sponsor veya ücretli üyelik gelirse Pro'ya geçmek gerekir. Mimari buna hazır, kod değişikliği gerekmez.
- Limit aşılırsa fatura çıkmaz, ilgili özellik o ay için durur.
