# CLAUDE.md

Espressoir: a coffee-tasting archive (owner's Notion notes) growing into a coffee social network
(web now, Expo/React Native app later). Full brief: `PROJECT_BRIEF.md` (Turkish).

@AGENTS.md

## Ground rules (from the brief)

- Work phase by phase; **never start the next phase without the owner's approval.** Each phase ends
  with green lint/typecheck/tests, clean migrations, updated README + this file, and a short summary
  with "how to try it" steps.
- **Stop and ask before:** anything that needs a paid plan or service, data-deleting or irreversible
  migrations, fundamental auth-flow changes, decisions that contradict the brief.
- Budget is 0 ₺/month: Vercel Hobby + Supabase Free (2 projects, no backups, no image transforms,
  pause after 7 idle days).
- Never commit secrets. `.env.local` (dev) and `.env.prod.local` (prod, scripts only) are ignored.
- **Code, tables and identifiers in English; all UI copy in Turkish**, only via `packages/i18n`.
- The owner is a statistics student, intermediate at web dev: justify key decisions in 2–3 sentences.
- Develop on a branch; at phase end open a PR into `main`.

## Stack & commands

Next.js 16.4 (App Router, `cacheComponents`, `partialPrefetching`, `typedRoutes`) · React 19 ·
TS 5.9 strict + `noUncheckedIndexedAccess` · Tailwind 4 (Turbopack loader, no PostCSS) ·
shadcn/ui (new-york, hand-maintained in `apps/web/src/components/ui`; registry unreachable from
sandboxes) · Supabase (supabase-js + @supabase/ssr; CLI as devDependency) · Zod · Vitest 5 ·
Playwright · pnpm 10 workspaces + Turborepo · ESLint 9 flat config (Next's plugins don't support 10).

```bash
pnpm dev | pnpm build | pnpm check            # check = turbo lint typecheck test
pnpm test:e2e                                 # needs a prior build; port 3100
pnpm format / format:check
pnpm db:new <name> | db:push:dev | db:push:prod | types:gen [--db-url <url>]
scripts/verify-migrations.sh <db-url>         # rollback + re-apply every migration
```

In sandboxes: Playwright needs `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium`; plain
Postgres + `supabase/tests/local-shim.sql` can stand in for Supabase (initdb must run as `postgres`).

## Layout

```
apps/web/src/app/(site)/   public pages — layout sets ensureStatic = 'navigation'
apps/web/src/app/          root layout, 404/error/loading, icon
apps/web/src/components/   ui/ (shadcn), site/ (chrome, SectionHeading), coffee/ (ScoreBadge)
apps/web/src/lib/          i18n (t, format), site-url, supabase/{public,server,browser}
packages/core|i18n|db|config, scripts/, supabase/{migrations,rollbacks,tests}, docs/
```

## Architecture conventions

- **Business rules live in Postgres** (RLS, constraints, triggers, RPCs) so web and the future
  mobile app share them; Next.js is just a client. Multi-step writes go through RPCs.
- **Public pages are fully static.** `(site)` uses `ensureStatic = 'navigation'`; fetch with
  `createPublicClient()` (cookie-free) inside `'use cache'` + `cacheTag`, invalidate tags after
  writes. Never call `cookies()`/`headers()`/`createServerSupabase()` under `(site)`. Signed-in
  UI in public chrome = client islands using `getBrowserSupabase()`.
- `new Date()`/`Math.random()` in server components only inside `'use cache'` (with `cacheLife`).
- No secret/service key at app runtime; only in local scripts. Vercel gets URL + publishable key.
- Workspace packages ship TS source (`transpilePackages`); keep `core`/`db`/`i18n` free of Next
  and DOM APIs so Expo can reuse them.
- `fold_tr()` (SQL) and `foldTurkish()` (TS) must stay identical; slugs use `slugify()`.
- Migrations: forward-only files + hand-written `supabase/rollbacks/<same-name>.down.sql`; never
  edit an applied migration; expand → migrate → contract (old app versions stay in the wild);
  version RPCs (`_v2`) instead of changing signatures. Regenerate types after each migration
  (CI fails on stale `database.types.ts`).
- **Design = "tasting form"** (owner picked it over two alternatives; the earlier cream/serif look
  read as AI-made): off-white paper, black ink, hard rules instead of rounded cards, one accent
  (signal red `--brand`), Archivo (wide via `.font-wide`) + IBM Plex Mono (labels/data,
  `.label-caps`), radius 0, numbered section headings (`SectionHeading`). Tokens only in
  `apps/web/src/app/globals.css` (AA-checked, light + dark). Score colour never carries meaning
  alone — the number is always shown.
- CSS `uppercase` follows `lang="tr"` (i → İ). Uppercase only Turkish UI copy; never coffee or
  brand names (render those as written), and give English brand text `lang="en"`.
- Notes/comments are plain text, rendered escaped (no HTML/markdown).

## Phase status

- [x] Phase 0 — setup (this branch): monorepo, design base, Supabase infra, CI, docs.
- [ ] Phase 1 — archive + multi-user infra (signup stays closed): schema/RLS/RPCs, Notion import,
      tasting form, public pages, stats, SEO, backups/keepalive, CI with `supabase start`.
- [ ] Phase 2 community · Phase 3 social depth · Phase 4+ Expo app.

Decisions made with the owner: repo goes private (backups as encrypted Actions artifacts);
email + password login in Phase 1; Expo for mobile (hence the monorepo); CI tests run on an
ephemeral Supabase on the GitHub runner instead of the cloud dev project.
