# ☕ Espressoir

**Her fincanın bir hatırası var.** Bir kahve tadım defteri ve arşivi: filtre, V60, kapsül, French press, Türk kahvesi… tüm demleme yöntemleri için. Önce kişisel bir arşiv; zamanla herkesin kendi tadımını girdiği bir topluluk ve bir mobil uygulama.

Kapsam ve yol haritası: [`PROJECT_BRIEF.md`](./PROJECT_BRIEF.md)

## Yığın

Next.js 16 (App Router, Cache Components) · TypeScript (strict) · Tailwind CSS 4 + shadcn/ui · Supabase (Postgres, Auth, RLS) · Zod · Vitest · Playwright · pnpm + Turborepo · Vercel (Hobby, `fra1`)

## Klasör yapısı

```
apps/web/          Next.js uygulaması (Vercel'in Root Directory'si)
packages/core/     siteConfig, Türkçe katlama/slug, puan kademeleri. Web ve mobil ortak kullanır.
packages/i18n/     Tüm arayüz metinleri (Türkçe sözlük)
packages/db/       Şemadan üretilen DB tipleri + sorgu yardımcıları
packages/config/   Ortak tsconfig ve ESLint ayarları
supabase/          config.toml, migrations/, rollbacks/
scripts/           DB push, tip üretimi, (Faz 1) Notion import
docs/              Kurulum ve yayın rehberleri
```

## Başlangıç

Gerekenler: **Node 22** (`.nvmrc`) ve **pnpm 10** (`corepack enable` yeterli). Docker gerekmez.

```bash
pnpm install
cp .env.example .env.local     # dev Supabase değerlerini gir (docs/setup-supabase.md)
pnpm db:push:dev               # migration'ları dev projesine uygula
pnpm dev                       # http://localhost:3000
```

## Komutlar

| Komut                               | Ne yapar                                                                   |
| ----------------------------------- | -------------------------------------------------------------------------- |
| `pnpm dev`                          | Web uygulamasını geliştirme modunda başlatır                               |
| `pnpm build`                        | Tüm paketleri derler (web: production build)                               |
| `pnpm check`                        | lint + typecheck + unit testler (tüm paketler)                             |
| `pnpm test:e2e`                     | Playwright testleri (önce `pnpm build`)                                    |
| `pnpm format`                       | Prettier ile biçimlendirir                                                 |
| `pnpm db:new <ad>`                  | Yeni migration dosyası (geri alma dosyasını da yaz: `supabase/rollbacks/`) |
| `pnpm db:push:dev` / `db:push:prod` | Migration'ları dev/prod'a uygular (prod onay ister)                        |
| `pnpm types:gen`                    | `packages/db` tiplerini dev şemasından yeniden üretir                      |

## Rehberler

- [Supabase kurulumu (dev + prod)](./docs/setup-supabase.md)
- [Vercel yayını ve espressoir.com DNS](./docs/deploy-vercel.md)

## Durum

- [x] **Faz 0: Kurulum.** Monorepo, tasarım temeli, Supabase altyapısı, CI.
- [ ] **Faz 1: Arşiv + çok kullanıcılı altyapı.** Şema, RLS, Notion import, tadım formu, public sayfalar, SEO.
- [ ] Faz 2: Topluluk · Faz 3: Sosyal derinlik · Faz 4+: Mobil (Expo)
