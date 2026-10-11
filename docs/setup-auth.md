# Giriş kurulumu: e-posta kodu, Google, Turnstile, davet

Faz 2A ile giriş şöyle çalışıyor:

- **E-posta kodu:** adresini yazan kişiye tek kullanımlık bir kod ve aynı işi gören bir bağlantı gider. Kodun kaç haneli olduğunu Supabase projesi belirler (bulut projelerinde 8, yerel test ortamında 6); site 6–10 haneyi kabul eder.
- **Google:** isteğe bağlı ikinci yol.
- **Parola:** yalnızca önceden parolası olan hesaplar (seninki) için duruyor; parolayla kayıt yok.
- **Kayıt kapalı:** yeni hesap yalnızca davetle açılır (`pnpm user:invite`).

Kod tarafı hazır; aşağıdaki adımlar hesap işleri olduğu için sende. Hepsi ücretsiz. Her adımı önce **dev** projesinde yap, önizleme adresinde dene, sonra **prod**'da tekrarla.

> **Sıra önemli.** Turnstile'ı Supabase'te açtığın anda, belirteç göndermeyen her giriş reddedilir (seninki dahil). O yüzden önce site anahtarını Vercel'e gir ve yayınla, **sonra** Supabase'te aç. Kilitlenirsen Supabase'te korumayı kapatman yeterli.

## 1. Migration'lar

```bash
pnpm db:push:dev      # önce dev
pnpm db:push:prod     # dev'de denedikten sonra
```

İki yeni migration var: `profiles_community` (kurulum durumu, özel hesap verisi, "yazabilir mi?" kuralı, profil görünümü) ve `account_rpcs` (kurulum, veri indirme, hesap silme). Veri silmezler; mevcut hesabın kurulumu tamamlanmış sayılır.

## 2. Dönüş adresleri

Supabase → **Authentication → URL Configuration**.

|                   | dev                                                                                      | prod                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Site URL**      | `http://localhost:3000`                                                                  | `https://espressoir.com`                                                                |
| **Redirect URLs** | `http://localhost:3000/auth/callback`<br>`https://espressoir-*.vercel.app/auth/callback` | `https://espressoir.com/auth/callback`<br>`https://espressoir.vercel.app/auth/callback` |

E-postadaki bağlantı ve Google dönüşü `/auth/callback` adresine gelir. Listede olmayan bir adres reddedilir ve bağlantı ana sayfaya düşer. Yıldızlı satır, Vercel'in her PR için ürettiği önizleme adreslerini kapsar.

## 3. E-posta servisi (Resend)

Supabase'in kendi e-posta servisi yalnızca proje ekibindeki adreslere yazar (saatte 2 e-posta) ve şablonları düzenletmez. Başkalarına kod ya da davet gidebilmesi için kendi gönderim servisin gerekir.

1. [resend.com](https://resend.com) → hesap aç (Free: günde 100, ayda 3.000 e-posta).
2. **Domains → Add Domain** → `espressoir.com`, bölge **EU (Ireland)**.
3. Resend üç kayıt gösterir (bir `MX`, iki `TXT`; adları `send` ve `resend._domainkey` ile başlar). Squarespace → **espressoir.com → DNS → Custom Records** altına aynen gir. Mevcut "Email Security" kayıtlarına dokunma; birlikte çalışırlar.
4. Resend'de **Verify** de; birkaç dakika sürebilir.
5. **API Keys → Create API Key** (yetki: _Sending access_). Dev ve prod için ayrı anahtar üret ki biri sızarsa diğeri etkilenmesin.
6. Supabase → **Authentication → Emails → SMTP Settings** → **Enable Custom SMTP**:

   | Alan         | Değer                  |
   | ------------ | ---------------------- |
   | Sender email | `giris@espressoir.com` |
   | Sender name  | `Espressoir`           |
   | Host         | `smtp.resend.com`      |
   | Port         | `465`                  |
   | Username     | `resend`               |
   | Password     | Resend API anahtarı    |

   ⛔ API anahtarı yalnızca Supabase'e girilir; Vercel'e ya da repoya girmez.

## 4. E-posta şablonları

Supabase → **Authentication → Emails → Templates**. Üç şablonun içeriğini depodaki dosyalardan kopyala. Terminalden panoya alırken Türkçe harflerin bozulmaması için: `LC_ALL=en_US.UTF-8 pbcopy < supabase/templates/magic-link.html`.

| Şablon         | Konu                                   | İçerik dosyası                         |
| -------------- | -------------------------------------- | -------------------------------------- |
| Magic Link     | `Espressoir giriş kodun: {{ .Token }}` | `supabase/templates/magic-link.html`   |
| Confirm signup | `Espressoir giriş kodun: {{ .Token }}` | `supabase/templates/confirmation.html` |
| Invite user    | `Espressoir'a davetlisin`              | `supabase/templates/invite.html`       |

Şablonlar düzenlenemiyorsa 3. adım (özel SMTP) henüz tamamlanmamıştır. O zamana kadar Supabase'in hazır e-postası gider: içinde kod olmaz, yalnızca bağlantı olur ve bağlantı yalnızca istendiği tarayıcıda çalışır.

## 5. Turnstile (bot koruması)

Giriş kodu isteği herkese açık bir uçtur; korumasız kalırsa biri başkalarının adreslerine senin adına e-posta yağdırabilir.

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Turnstile → Add widget**. Hostnames: `espressoir.com`, `vercel.app`, `localhost`. Mode: **Managed**.
2. **Site key** → Vercel → Environment Variables → `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (tüm ortamlar, tür Config) ve `.env.local`. Sonra **Redeploy**.
3. Giriş sayfasında doğrulama kutusunun göründüğünü kontrol et.
4. **Secret key** → Supabase → **Authentication → Attack Protection → Bot and Abuse Protection** → **Enable Captcha protection**, sağlayıcı **Turnstile**. Dev ve prod'un ikisinde de.

## 6. Google ile giriş (isteğe bağlı)

1. [console.cloud.google.com](https://console.cloud.google.com) → yeni proje (`espressoir`).
2. **APIs & Services → OAuth consent screen**: External; uygulama adı `Espressoir`; destek e-postan. Yayın durumunu **In production** yap ("Testing"de yalnızca eklediğin test kullanıcıları girebilir). Yalnızca e-posta ve profil istendiği için Google incelemesi gerekmez.
3. **Credentials → Create Credentials → OAuth client ID → Web application**:
   - Authorized JavaScript origins: `https://espressoir.com`, `http://localhost:3000`
   - Authorized redirect URIs: `https://<dev-ref>.supabase.co/auth/v1/callback` ve `https://<prod-ref>.supabase.co/auth/v1/callback`
4. Client ID ve secret → Supabase → **Authentication → Sign In / Providers → Google** → Enable (iki projede de).
5. Vercel'de `NEXT_PUBLIC_AUTH_GOOGLE=true` (ve `.env.local`) → **Redeploy**. Düğme bu değişkenle görünür.

Bilmen gerekenler:

- Google'ın onay ekranında alan adı olarak `<ref>.supabase.co` yazar. Kendi alan adını göstermek Supabase'in ücretli bir eklentisi; şimdilik böyle kalıyor.
- Kayıt kapalıyken Google yeni hesap **açmaz**. Davetle açılmış bir hesabın e-postası Google hesabınla aynıysa Google ile de girilebilir.

## 7. Davet göndermek

```bash
pnpm user:invite ada@example.com                 # dev
pnpm user:invite --env prod ada@example.com      # prod (proje ref'ini sorar)
```

Birden fazla adres yazılabilir. Davet edilen kişi bağlantıya tıklar, kullanıcı adını seçer, koşulları kabul eder ve defteri açılır.

**Bağlantı bir saat geçerlidir.** Davet kabul edilene kadar o kişinin hesabı yoktur; bu yüzden süresi dolan biri giriş sayfasından kod **isteyemez** (kayıt kapalı). Çözüm aynı komutu aynı adresle yeniden çalıştırmak: yeni bir bağlantı gider, eskisi geçersiz olur. Davet atmadan önce karşı tarafa haber vermek işi kolaylaştırır.

Süreyi uzatmak mümkün (Supabase → Authentication → Emails → "Email OTP Expiration", en fazla 86400 saniye = 24 saat), ama bu ayar giriş kodlarını da kapsar: kod ne kadar uzun süre geçerliyse tahmin edilmesi o kadar kolaylaşır. Uzatacaksan kod uzunluğunu 8'in altına indirme.

İlk daveti göndermeden önce: repoyu private yap ve yedekleri kur ([`backup.md`](./backup.md)). Başkalarının verisi yedeksiz bir veritabanında durmamalı.

## 8. Kaydı herkese açmak (ileride)

Şu üçü tamamlanmadan açma: KVKK metinlerinin hukuki incelemesi, yedekler, yorum/şikâyet/moderasyon (Faz 2C).

1. Supabase → **Authentication → Sign In / Providers** → "Allow new users to sign up" **açık**.
2. Vercel'de `NEXT_PUBLIC_SIGNUP_ENABLED=true` → **Redeploy**. Bu değişken yalnızca giriş sayfasındaki metni ve tanımadığı adrese kod gönderilip gönderilmeyeceğini belirler; asıl kapı 1. adımdaki ayardır.

## Sorun giderme

| Belirti                                                       | Neden ve çözüm                                                                                                                                       |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Güvenlik doğrulaması tamamlanamadı"                          | Supabase'te Turnstile açık ama sitede anahtar yok (ya da tersi). `NEXT_PUBLIC_TURNSTILE_SITE_KEY` ile Supabase'teki secret aynı widget'a ait olmalı. |
| Giriş düğmesi açılmıyor                                       | Turnstile kutusu yüklenemedi: widget'ın Hostnames listesinde bu alan adı yok.                                                                        |
| Kod e-postası gelmiyor                                        | Adres kayıtlı değil (kayıt kapalıyken bilinmeyen adrese e-posta gitmez), ya da özel SMTP yok ve adres proje ekibinde değil.                          |
| E-postada kod yok, yalnızca bağlantı var                      | Şablonlar güncellenmemiş (4. adım).                                                                                                                  |
| Bağlantı ana sayfaya düşüyor                                  | `/auth/callback` adresi Redirect URLs listesinde yok (2. adım).                                                                                      |
| "Bu bağlantı geçersiz ya da süresi dolmuş"                    | Bağlantı bir kez kullanılmış ya da bir saati geçmiş. Giriş sayfasından yeni kod iste.                                                                |
| "Bu davet bağlantısı geçersiz ya da süresi dolmuş"            | Davet bir saati geçmiş ya da yerine yenisi gönderilmiş. `pnpm user:invite` komutunu aynı adresle yeniden çalıştır.                                   |
| Google: "Kayıt şu an yalnızca davetle"                        | O Google hesabının e-postasıyla açılmış bir hesap yok.                                                                                               |
| `pnpm user:invite`: "e-posta servisi bu adrese gönderemiyor"  | Özel SMTP kurulmamış (3. adım).                                                                                                                      |
| Kendi hesabınla giremiyorsun ve Turnstile'dan şüpheleniyorsun | Supabase'te Captcha korumasını geçici olarak kapat, gir, nedenini bul, yeniden aç.                                                                   |
