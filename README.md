# Espressoir

**Her fincanın bir hatırası var.** Espressoir bir kahve tadım defteri: içtiğin kahveyi puanlar, nasıl demlediğini ve aklında kalan tatları not edersin. Kişisel bir Notion listesinden doğdu; bugün davetle katılan üyelerin tadımlarını, yorumlarını, kafe ziyaretlerini, demleme rehberlerini ve bir kahve atölyesini barındırıyor. Yayında: [espressoir.com](https://espressoir.com).

Kapsam ve yol haritası: [`PROJECT_BRIEF.md`](./PROJECT_BRIEF.md) · Tasarım kuralları: [`design/DESIGN.md`](./design/DESIGN.md) · Kod kuralları ve alınmış kararlar: [`CLAUDE.md`](./CLAUDE.md)

## Yığın

Next.js 16 (App Router, Cache Components) · TypeScript (strict) · Tailwind CSS 4 (tasarım token'larına bağlı) · Supabase (Postgres, Auth, RLS) · Zod · Vitest (+ gömülü Postgres: PGlite) · Playwright · pnpm + Turborepo · Vercel (Hobby, `fra1`)

## Klasör yapısı

```
design/            Tasarım dili (DESIGN.md), token'lar (tokens.css), bileşen referansı, içerik metinleri
apps/web/          Next.js uygulaması (Vercel'in Root Directory'si); src/content/ atölye programları ve bilgi yazıları
apps/mobile/       iPhone uygulaması (düz React Native); aynı kuralları ve metinleri paylaşır
packages/core/     siteConfig, Türkçe katlama/slug, puan, istatistik, liste filtresi, öneri, demleme, arama
packages/i18n/     Tüm arayüz metinleri (Türkçe sözlük)
packages/db/       Şemadan üretilen tipler, arşiv okuma modelleri, tadım formu doğrulaması
packages/config/   Ortak tsconfig ve ESLint ayarları
supabase/          config.toml, migrations/, rollbacks/
scripts/           DB push, tip üretimi, Notion import, hesap oluşturma, testler
docs/              Kurulum, yayın ve yedek rehberleri
data/              Notion export'un ve import raporu (git'e girmez)
```

## Başlangıç

Gerekenler: **Node 22** (`.nvmrc`) ve **pnpm 10** (`corepack enable` yeterli). Docker gerekmez.

`corepack enable` yetki hatası verirse (Node sistem klasörüne kuruluysa olur), `pnpm` komutunu PATH'indeki kendi klasörlerinden birine koy: `corepack enable pnpm --install-directory <klasör>`.

```bash
pnpm install
pnpm dev:offline               # hesap/anahtar gerekmeden: http://localhost:3000
```

`dev:offline`, `data/notion-export.csv` dosyanı (yoksa örnek veriyi) bilgisayarında çalışan gömülü bir Postgres'e aktarır ve siteyi oradan gösterir. Sayfaları görmek ve tasarım üzerinde çalışmak için yeterli; giriş ve panel için gerçek bir Supabase projesi gerekir:

```bash
cp .env.example .env.local     # dev Supabase değerlerini gir (docs/setup-supabase.md)
pnpm db:push:dev               # migration'ları dev projesine uygula
pnpm admin:bootstrap           # hesabını oluştur
pnpm import:notion --dry-run   # Notion arşivini dene; sonra --dry-run olmadan yaz
pnpm dev                       # http://localhost:3000
```

## Komutlar

| Komut                               | Ne yapar                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------- |
| `pnpm dev`                          | Web uygulamasını dev Supabase'e karşı başlatır                                              |
| `pnpm dev:offline`                  | Aynısı, veriyi yerel bir anlık görüntüden okuyarak (Supabase gerekmez)                      |
| `pnpm build`                        | Tüm paketleri derler (web: production build)                                                |
| `pnpm check`                        | lint + typecheck + testler (RLS ve import testleri dahil, gömülü Postgres'te)               |
| `pnpm test:e2e:offline`             | Örnek veriyle derler ve Playwright testlerini çalıştırır                                    |
| `pnpm test:e2e`                     | Playwright testleri, hazır bir derlemeye karşı (CI'da gerçek Supabase ile)                  |
| `pnpm format`                       | Prettier ile biçimlendirir                                                                  |
| `pnpm db:new <ad>`                  | Yeni migration dosyası (geri alma dosyasını da yaz: `supabase/rollbacks/`)                  |
| `pnpm db:push:dev` / `db:push:prod` | Migration'ları dev/prod'a uygular (prod onay ister)                                         |
| `pnpm types:gen`                    | `packages/db` tiplerini migration'lardan yeniden üretir                                     |
| `pnpm tokens:gen`                   | `design/tokens.css` renklerini CSS okuyamayan yerler için TS'e yazar (paylaşım görseli vb.) |
| `pnpm admin:bootstrap`              | Hesabını oluşturur ve admin yapar (`--env prod` ile canlıda)                                |
| `pnpm user:invite <e-posta>`        | Kayıt kapalıyken davet gönderir (sitede: `/osman` → Moderasyon → Davetler)                  |
| `pnpm import:notion`                | Notion CSV'sini içe aktarır (`--offline`, `--dry-run`, `--env prod`)                        |
| `pnpm seed:dev`                     | Dev'e örnek arşivi yükler (prod'u reddeder)                                                 |
| `pnpm media:sweep`                  | Hiçbir kaydın göstermediği fotoğraf dosyalarını listeler (`--apply` siler)                  |
| `pnpm export:analytics`             | Herkese açık tadımları takma adla CSV'ye döker: `data/analytics/` (yalnızca okur)           |
| `pnpm import:recommendations`       | Python'da kurduğun modelin önerilerini yükler (`--file`, `--model`, `--dry-run`, `--clear`) |

Playwright tarayıcısı kurulu değilse: `pnpm --filter @espressoir/web exec playwright install chromium`, ya da kurulu Chrome'u göster: `PLAYWRIGHT_CHROMIUM_EXECUTABLE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`.

## Sayfalar

| Adres                             | İçerik                                                                                                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                               | Önce defter: "İlk tadımını kaydet", örnek bir kayıt, nasıl çalışır, son tadımlar, en beğenilen kahveler, rehberler, test, atölye                           |
| `/workshop`, `/workshop/[id]`     | Atölye (Kahve 101): tarih ("Takvime ekle", Google Takvim), konum, kontenjan, program, açılır kapanır sorular, başvuru formu; `/atolye` buraya gelir        |
| `/teyit/[anahtar]`                | Onaylı kişinin "geliyor musun?" sayfası: WhatsApp'tan gönderilen kişisel bağlantı, Geliyorum / Gelemiyorum                                                 |
| `/bilgi`, `/bilgi/[yazi]`         | Demleme rehberleri (tarif, fincan sayısına göre ölçeklenen demleme asistanı ve zamanlayıcı, adımlar) ve kısa kahve yazıları; her biri bir Markdown dosyası |
| `/ara`                            | Sitede arama: yazılar, kahveler, markalar, kafeler, üyeler; yazdıkça sonuç, `/` ya da ⌘K ile her sayfadan açılır                                           |
| `/kahve-testi`                    | Beş soruda sana uyan demleme yöntemi ve kavrum; sonuç bağlantıyla paylaşılır                                                                               |
| `/kahveler`                       | Tüm kahveler; arama, filtre, sıralama, kart görünümü (durum URL'de)                                                                                        |
| `/kahve/[marka]/[kahve]`          | Tadımlar, künye, benzer kahveler, paylaşım görseli, JSON-LD                                                                                                |
| `/marka/[slug]`                   | Markanın kahveleri ve ortalaması                                                                                                                           |
| `/istatistik`                     | Arşivin sayıları, en yüksek puanlılar, yöntemler; dağılım, marka/form/yöntem ortalamaları (n ile), saçılım                                                 |
| `/hakkinda`                       | Site ve puanlama hakkında                                                                                                                                  |
| `/akis`                           | Son tadımlar: herkes ya da takip ettiklerin; son kafe ziyaretleri                                                                                          |
| `/kafeler`                        | Kafeler; şehre ve ada göre süzme (durum URL'de)                                                                                                            |
| `/kafe/[sehir]/[kafe]`            | Kafenin ziyaretleri, ortalaması, içecek türüne göre ortalama (n ile)                                                                                       |
| `/tadim/[id]`                     | Tek bir tadım: beğeni, yorumlar (tek seviye yanıt), şikâyet                                                                                                |
| `/u/[kullanici]`                  | Üyenin defteri: sayılar, grafikler, tadımlar, listeler, denenecekler; takip                                                                                |
| `/u/[kullanici]/liste/[liste]`    | Üyenin herkese açık bir listesi: sırasıyla kahveler ve notlar                                                                                              |
| `/giris`, `/panel`                | E-posta kodu, Google ya da parolayla giriş; kayıt kapalıyken "Davet iste" formu; tadım ve kafe ziyareti ekleme                                             |
| `/panel/isletme`                  | Resmi hesabı olduğun marka ve kafelerin tanıtımı; doğrulama başvuruların                                                                                   |
| `/panel/oneriler`                 | Sana önerilen kahveler, her birinin gerekçesiyle (yalnızca sen görürsün)                                                                                   |
| `/hesap`                          | Profil düzenleme, verileri indirme (JSON), hesabı silme                                                                                                    |
| `/osman`                          | Yönetim (e-posta ve şifreyle): ziyaretler ve topluluk özeti; atölyeler, butonla yanıtlanan başvurular, kişi ekleme, katılım, Excel ve PDF; moderasyon      |
| `/kvkk`, `/gizlilik`, `/kosullar` | Yasal metinler (taslak; hukuki inceleme bekliyor)                                                                                                          |

## Rehberler

- [Supabase kurulumu, hesap oluşturma, Notion import](./docs/setup-supabase.md)
- [Giriş kurulumu: e-posta kodu, Google, Turnstile, davet](./docs/setup-auth.md)
- [Ziyaret istatistikleri: Google Analytics ve /osman](./docs/setup-analytics.md)
- [Vercel yayını ve espressoir.com DNS](./docs/deploy-vercel.md)
- [Yedek ve uyandırma iş akışları](./docs/backup.md)
- [Mobil uygulama: iPhone'a kurmak](./docs/mobile.md)
- [Yayın öncesi kontrol listesi: yalnızca senin sağlayabileceklerin](./docs/launch-checklist.md)

## Nasıl çalışır (kısaca)

- **Herkese açık sayfalar tamamen statik.** Tek bir önbellekli okuma (`getArchive()`) bütün sayfaları besler; bir tadım kaydedilince önbellek yenilenir. Vercel Hobby'de fonksiyon kullanımı sıfıra yakın kalır, arama motorları içeriğin tamamını HTML'de görür.
- **Kurallar veritabanında.** Kim neyi okur, kim neye yazar (RLS), günlük sınırlar, bildirimler ve moderasyon Postgres'te; site ve mobil uygulama aynı kuralları paylaşır. 24 tablonun hepsinde RLS açık ve her politika `pnpm check` içinde gömülü bir Postgres'te sınanır.
- **Kayıt davetle.** Ziyaretçi her şeyi okur; katılmak isteyen `/giris` sayfasından davet ister, istekler `/osman` → Moderasyon → Davetler'de tek tıkla yanıtlanır.
- **Gizli anahtar yok denecek kadar az.** Uygulama herkese açık anahtarla ve kullanıcının oturumuyla çalışır; üç gizli değerin (davet, atölye e-postası, ziyaret sayıları) her biri tek bir dosyada, tek bir iş için okunur.
- **Arayüz metinleri tek yerde** (`packages/i18n`), renk ve ölçüler tek yerde (`design/tokens.css`).

## Bugünkü durum

Yayında ve çalışıyor: arşiv ve katalog, tadım formu (fotoğraf, tat notaları), akış, yorum ve beğeni, takip, bildirimler, listeler, kafeler, öneriler, doğrulanmış işletme hesapları, moderasyon paneli, atölye başvuruları ve katılım teyidi, 33 rehber ve yazı, demleme asistanı, arama, kahve testi, açık ve koyu tema, iPhone uygulaması (kabloyla kurulur).

Kapalı ya da taslak: kayıt herkese açık değil (davetle); yasal metinler taslak ve iletişim adresi boş; prod veritabanının yedeği yok. Hepsi [yayın öncesi kontrol listesinde](./docs/launch-checklist.md).

## Sırada ne var

1. Yedekleme (`docs/backup.md`) ve yasal metinlerin incelenmesi: kayıt herkese açılmadan önce şart.
2. Content-Security-Policy: Turnstile, Google Analytics ve Supabase için izinleriyle birlikte, önce yalnızca raporlayan kipte.
3. Tek arşiv okumasını parçalara bölmek (katalog, akış, istatistik): üye sayısı artınca her kayıt bütün siteyi yeniden üretmesin.
4. Mobil uygulamayı sitenin yeni paletine ve fontlarına taşımak.
5. Büyük dosyaları bölmek: yönetim sayfası (`osman/yonetim/page.tsx`), atölye paneli (`osman/atolyeler/workshops.tsx`) ve tadım formu (`components/panel/tasting-form.tsx`).

Değişikliklerin geçmişi commit'lerde ve birleştirilmiş PR'larda; alınan kararların gerekçeleri `CLAUDE.md`'de.
