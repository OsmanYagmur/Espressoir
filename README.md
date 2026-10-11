# ☕ Espressoir

**Her fincanın bir hatırası var.** Bir kahve tadım defteri ve arşivi: filtre, V60, kapsül, French press, Türk kahvesi… tüm demleme yöntemleri için. Önce kişisel bir arşiv; zamanla herkesin kendi tadımını girdiği bir topluluk ve bir mobil uygulama.

Kapsam ve yol haritası: [`PROJECT_BRIEF.md`](./PROJECT_BRIEF.md)

## Yığın

Next.js 16 (App Router, Cache Components) · TypeScript (strict) · Tailwind CSS 4 + shadcn/ui · Supabase (Postgres, Auth, RLS) · Zod · Vitest (+ gömülü Postgres: PGlite) · Playwright · pnpm + Turborepo · Vercel (Hobby, `fra1`)

## Klasör yapısı

```
apps/web/          Next.js uygulaması (Vercel'in Root Directory'si)
packages/core/     siteConfig, Türkçe katlama/slug, puan kademeleri, istatistik, liste filtresi
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

| Komut                               | Ne yapar                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| `pnpm dev`                          | Web uygulamasını dev Supabase'e karşı başlatır                                |
| `pnpm dev:offline`                  | Aynısı, veriyi yerel bir anlık görüntüden okuyarak (Supabase gerekmez)        |
| `pnpm build`                        | Tüm paketleri derler (web: production build)                                  |
| `pnpm check`                        | lint + typecheck + testler (RLS ve import testleri dahil, gömülü Postgres'te) |
| `pnpm test:e2e:offline`             | Örnek veriyle derler ve Playwright testlerini çalıştırır                      |
| `pnpm test:e2e`                     | Playwright testleri, hazır bir derlemeye karşı (CI'da gerçek Supabase ile)    |
| `pnpm format`                       | Prettier ile biçimlendirir                                                    |
| `pnpm db:new <ad>`                  | Yeni migration dosyası (geri alma dosyasını da yaz: `supabase/rollbacks/`)    |
| `pnpm db:push:dev` / `db:push:prod` | Migration'ları dev/prod'a uygular (prod onay ister)                           |
| `pnpm types:gen`                    | `packages/db` tiplerini migration'lardan yeniden üretir                       |
| `pnpm admin:bootstrap`              | Hesabını oluşturur ve admin yapar (`--env prod` ile canlıda)                  |
| `pnpm import:notion`                | Notion CSV'sini içe aktarır (`--offline`, `--dry-run`, `--env prod`)          |
| `pnpm seed:dev`                     | Dev'e örnek arşivi yükler (prod'u reddeder)                                   |

Playwright tarayıcısı kurulu değilse: `pnpm --filter @espressoir/web exec playwright install chromium`, ya da kurulu Chrome'u göster: `PLAYWRIGHT_CHROMIUM_EXECUTABLE="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`.

## Sayfalar

| Adres                    | İçerik                                                                  |
| ------------------------ | ----------------------------------------------------------------------- |
| `/`                      | Sayılar, son tadımlar, en yüksek puanlılar, demleme yöntemleri          |
| `/kahveler`              | Tüm kahveler; arama, filtre, sıralama, kart görünümü (durum URL'de)     |
| `/kahve/[marka]/[kahve]` | Tadımlar, künye, benzer kahveler, paylaşım görseli, JSON-LD             |
| `/marka/[slug]`          | Markanın kahveleri ve ortalaması                                        |
| `/istatistik`            | Dağılım, marka/form/yöntem ortalamaları (n ile), saçılım, zaman çizgisi |
| `/hakkinda`              | Site ve puanlama hakkında                                               |
| `/giris`, `/panel`       | Giriş; tadım ekleme, düzenleme, silme                                   |

## Rehberler

- [Supabase kurulumu, hesap oluşturma, Notion import](./docs/setup-supabase.md)
- [Vercel yayını ve espressoir.com DNS](./docs/deploy-vercel.md)
- [Yedek ve uyandırma iş akışları](./docs/backup.md)

## Durum

- [x] **Faz 0: Kurulum.** Monorepo, tasarım temeli, Supabase altyapısı, CI.
- [x] **Faz 1: Arşiv + çok kullanıcılı altyapı.** Şema, RLS, Notion import, tadım formu, public sayfalar, istatistik, SEO, yedek. Yayında: <https://espressoir.vercel.app>
- [ ] **Faz 2: Topluluk.** Plan onaylandı; dört adımda ilerliyor: hazırlık (dev projesi + önizlemeler) → hesaplar ve profil → topluluk tadımları ve akış → yorum, beğeni, moderasyon. Önce davetli beta.
- [ ] Faz 3: Sosyal derinlik · Faz 4+: Mobil (Expo)
