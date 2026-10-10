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
sandboxes) · Supabase (supabase-js + @supabase/ssr; CLI as devDependency) · Zod 4 · Vitest 5 ·
PGlite (in-process Postgres for tests, types and offline preview) · Playwright ·
pnpm 10 workspaces + Turborepo · ESLint 9 flat config (Next's plugins don't support 10).

```bash
pnpm dev | pnpm build | pnpm check            # check = turbo lint typecheck test
pnpm dev:offline                              # site from a local snapshot; no Supabase needed
pnpm test:e2e:offline                         # sample data → build → Playwright (public specs)
pnpm test:e2e                                 # needs a prior build; port 3100
pnpm format / format:check
pnpm db:new <name> | db:push:dev | db:push:prod
pnpm types:gen [--db-url <url>]               # default: from supabase/migrations via PGlite
pnpm admin:bootstrap [--env prod]             # owner account (signup is closed)
pnpm import:notion [--offline|--dry-run|--env prod]   # report: data/import-report.md
pnpm seed:dev                                 # sample archive into dev; refuses prod
scripts/verify-migrations.sh <db-url>         # rollback + re-apply every migration (CI)
```

No pnpm on PATH? `corepack pnpm …` works. Playwright can use the system Chrome via
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` (sandboxes: `/opt/pw-browsers/chromium`). Docker is never needed
locally: `pnpm check` runs migrations, rollbacks, every RLS policy and the import on PGlite
(`scripts/lib/test-db.ts`); CI repeats them on a real Supabase (`TEST_DB_URL`) and runs the full
Playwright suite, signed-in flows included, against `supabase start` on the runner.

## Layout

```
apps/web/src/app/(site)/     public pages — layout sets ensureStatic = 'navigation'
apps/web/src/app/(account)/  /giris, /panel (dynamic; session read behind <Suspense>)
apps/web/src/app/            root layout, 404/error/loading, icon, sitemap, robots, OG image
apps/web/src/proxy.ts        session refresh + redirects, matcher = /panel/*, /giris only
apps/web/src/components/     ui/, site/ (chrome), coffee/, stats/ (charts), panel/ (forms)
apps/web/src/lib/data/       archive.ts (the one cached read), selectors.ts (pure views)
apps/web/e2e/                archive.spec (public, sample data) · panel.spec (needs Supabase)
packages/core                siteConfig, fold/slug, score tiers, catalog enums, stats, list filter
packages/db                  generated types, archive read models (Zod), tasting input schema
packages/i18n | config       UI copy (tr) · shared tsconfig/eslint
scripts/                     db-push, gen-types, import-notion (+ notion/), admin-bootstrap,
                             offline-snapshot, e2e-setup, db/*.test.ts (RLS, RPC, contract)
supabase/                    migrations/, rollbacks/, tests/local-shim.sql
docs/                        setup-supabase, deploy-vercel, backup
data/                        owner's Notion export + reports (git-ignored)
```

## Architecture conventions

- **Business rules live in Postgres** (RLS, constraints, triggers, RPCs) so web and the future
  mobile app share them; Next.js is just a client. Multi-step writes go through RPCs.
- **Public pages are fully static.** `(site)` uses `ensureStatic = 'navigation'`; fetch with
  `createPublicClient()` (cookie-free) inside `'use cache'` + `cacheTag`, invalidate tags after
  writes. Never call `cookies()`/`headers()`/`createServerSupabase()` under `(site)`. Signed-in
  UI in public chrome = client islands using `getBrowserSupabase()`.
- **One read feeds every public page:** `getArchive()` (`'use cache'`, tag `archive`, `cacheLife
('hours')`) loads `coffee_overview`, public `tasting_feed` rows and `brew_methods`; pages derive
  what they need with the pure functions in `lib/data/selectors.ts`. Writes call
  `updateTag(ARCHIVE_TAG)`. Data changed outside the site (import, SQL) shows up within the hour.
- **Reads go through flat views** (`coffee_overview`, `tasting_feed`, `coffee_stats`; all
  `security_invoker`) and are validated by the Zod schemas in `packages/db/src/archive.ts`; a
  database test fails if views, enums and schemas drift apart. Community numbers count only
  public, logged tastings, whoever is asking.
- **Writes:** `log_tasting_v1` RPC for new tastings (find-or-create brand + coffee, one
  transaction); edits/deletes are plain table calls guarded by RLS and column grants.
  Slugs are made in Postgres (`slugify()` + trigger) and never rewritten on rename.
- Dynamic segments read `params` inside `<Suspense>` (page shell stays instant) and export
  `generateStaticParams` (required by `ensureStatic`; return a placeholder when the archive is
  empty). Client components that read the URL (`usePathname`, `useSearchParams`) also need a
  Suspense boundary. The coffee list filters in the browser; its state lives in the URL.
- Charts are server-rendered HTML/CSS (no chart library): one ink series, value labels, a table
  twin under each, `n` beside every mean, n < 3 faded + hollow + tagged (`SMALL_SAMPLE`).
- Client components shared with the server must not format with `Intl` (hydration); prepare
  display strings on the server (`lib/coffee-cards.ts`).
- `new Date()`/`Math.random()` in server components only inside `'use cache'` (with `cacheLife`).
- No secret/service key at app runtime; only in local scripts. Vercel gets URL + publishable key.
- Files read at runtime must be real files inside `apps/web`, read by literal path (the share-image
  fonts: `src/assets/fonts`, also listed in `outputFileTracingIncludes`). Never read through
  `node_modules`: under pnpm that is a symlink a Vercel function does not contain. Next loads
  `opengraph-image` modules for every page's metadata, so a throw at their module scope breaks
  all on-demand pages, not just the image: keep such loads guarded (`lib/og.tsx`).
- Workspace packages ship TS source (`transpilePackages`); keep `core`/`db`/`i18n` free of Next
  and DOM APIs so Expo can reuse them.
- `fold_tr()` (SQL) and `foldTurkish()` (TS) must stay identical; slugs use `slugify()`.
- Notion import (`scripts/notion/`): pure plan (`plan.ts`) → transactional apply (`apply.ts`);
  insert-only and idempotent via `tastings.source_ref`; everything it "knows" lives in
  `rules.ts`; unreadable values stay null and are reported. Never invent values. Notes are
  imported as written except for the owner-approved word list `NOTE_FIXES` (reported
  before → after); add to it only with the owner's say-so.
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

- [x] Phase 0 — setup: monorepo, design base, Supabase infra, CI, docs.
- [x] Phase 1 — archive + multi-user infra (signup stays closed): schema/RLS/RPC, Notion import,
      login + tasting panel, public pages, stats, SEO/OG, backup + keepalive workflows, CI on a
      real Supabase. Built without access to the cloud projects: applying migrations, the
      owner account and the import on dev/prod are the owner's steps (docs/setup-supabase.md).
- [ ] Phase 2 community · Phase 3 social depth · Phase 4+ Expo app.

Decisions made with the owner: repo goes private (backups as encrypted Actions artifacts);
email + password login in Phase 1; Expo for mobile (hence the monorepo); CI tests run on an
ephemeral Supabase on the GitHub runner instead of the cloud dev project.

Phase 1 choices worth knowing: `comments`, `likes` and `reports` tables wait for Phase 2 (only
`follows` exists now, because the "followers" visibility needs it); catalog inserts are open to
any signed-in user and must get rate limits/duplicate checks before signup opens; the owner's
Notion export is not committed (tests and CI use `scripts/notion/fixtures/sample-export.csv`).
