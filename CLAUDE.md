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
pnpm user:invite [--env prod] <email>…        # invitation e-mail (the only way in for now)
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
                             (/, /kahveler, /kahve, /marka, /istatistik, /hakkinda, /u/[username],
                             /kvkk, /gizlilik, /kosullar)
apps/web/src/app/(account)/  /giris, /panel, /hesap, /hesap/kurulum (dynamic; session read
                             behind <Suspense>)
apps/web/src/app/auth/       /auth/callback (route: code exchange), /auth/confirm (link → one click)
apps/web/src/app/            root layout, 404/error/loading, icon, sitemap, robots, OG image
apps/web/src/proxy.ts        session refresh + redirects, matcher = /panel/*, /hesap/*, /giris only
apps/web/src/components/     ui/, site/ (chrome, legal page), coffee/, stats/ (charts),
                             panel/ (forms), account/ (header link, Turnstile, form message)
apps/web/src/lib/            auth.ts (requireUser/requireSession), auth-config.ts (public switches)
apps/web/src/lib/data/       archive.ts (the one cached read), selectors.ts (pure views)
apps/web/e2e/                archive.spec (public, sample data) · panel.spec, account.spec
                             (need Supabase + its mail catcher) · helpers.ts
packages/core                siteConfig, fold/slug, score tiers, catalog enums, stats, list filter,
                             account rules (usernames, TERMS_VERSION)
packages/db                  generated types, read models (archive, profile; Zod), input schemas
packages/i18n | config       UI copy (tr.ts, legal-tr.ts) · shared tsconfig/eslint
scripts/                     db-push, gen-types, import-notion (+ notion/), admin-bootstrap,
                             user-invite, offline-snapshot, e2e-setup, db/*.test.ts (RLS, RPC,
                             accounts, contract)
supabase/                    migrations/, rollbacks/, templates/ (auth e-mails),
                             tests/local-shim.sql
docs/                        setup-supabase, setup-auth, deploy-vercel, backup
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
- No secret/service key at app runtime; only in local scripts. Vercel gets URL + publishable key
  (as **Config** variables: a `NEXT_PUBLIC_` name cannot be a Vercel Secret).
- Turborepo runs tasks in strict env mode: an env var the build reads must be listed in
  `turbo.json` (`globalEnv`) or the build silently sees it as unset.
- `getSiteUrl()` reads `NEXT_PUBLIC_SITE_URL`, then Vercel's `VERCEL_*`, then `siteConfig.url`.
  On the live project the Vercel step never applies: "Enable access to System Environment
  Variables" is off there (seen 2026-10-11), so pages fall back to `siteConfig.url`. That is
  correct now that `espressoir.com` serves the site, but previews advertise it too. Never build
  sign-in redirects from `getSiteUrl()`: use the origin of the request.
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

Accounts (Phase 2A):

- **Sign-in runs in the browser**, straight against Supabase Auth (`giris/login-form.tsx`): the
  auth server's rate limits are per address, and a server action would make every visitor share
  Vercel's. The session lands in cookies the server reads. Three ways in: e-mail code (the same
  mail carries a link), Google, and a password for accounts that already have one.
- **`/auth/callback`** exchanges `?code=` (Google, Supabase's stock e-mail link) and hands
  `?token_hash=` links from our templates to **`/auth/confirm`**, which signs in only after a
  click: mail scanners open links, and a link that signed in on sight would be spent.
- **CAPTCHA:** when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set every auth call carries a Turnstile
  token (single use: reset after each call). It must be set exactly when Supabase's CAPTCHA
  protection is on. The local stack runs with Cloudflare's test keys, so CI goes through it too.
- **`profiles` is public; `profile_private` is not** (accepted terms, username changes,
  restrictions): own row + admins may read, only SECURITY DEFINER functions write. Put nothing
  private on `profiles`.
- **Every write policy includes `(select public.can_post())`** (onboarded and not restricted).
  A new table people write to needs it too. Restricted members can still read and delete.
- **Usernames:** placeholder `u_<16 hex>` until `complete_onboarding_v1`; reserved names live in
  `reserved_usernames()` and `RESERVED_USERNAMES` (a test compares them); a trigger allows one
  change per 30 days. Admins and scripts (no API user) are exempt.
- `requireUser()` sends signed-out visitors to `/giris` and members without a username to
  `/hesap/kurulum`; `requireSession()` is for the onboarding page only. The test helper
  `createUser()` returns onboarded users unless told `onboarded: false`.
- **The header's account link reads the session cookie**, nothing else: public pages must not
  pull in the Supabase client.
- **Legal texts** are `packages/i18n/src/legal-tr.ts`, shown with a draft banner until the owner
  has had them reviewed. Changing them means bumping `TERMS_VERSION` in `@espressoir/core`.
- Members are part of the archive read (`archive.profiles`) until 2B splits it.

## Phase status

- [x] Phase 0 — setup: monorepo, design base, Supabase infra, CI, docs.
- [x] Phase 1 — archive + multi-user infra (signup stays closed): schema/RLS/RPC, Notion import,
      login + tasting panel, public pages, stats, SEO/OG, backup + keepalive workflows, CI on a
      real Supabase. **Live since 2026-10-10 at https://espressoir.vercel.app** (prod Supabase
      migrated, owner account created, Notion archive imported, login + adding a tasting used
      on the live site).
- [ ] Phase 2 — community. Plan approved 2026-10-11. Four steps, each its own branch + PR; the
      next one starts only with the owner's go:
  - [x] 2.0 prep: dev Supabase project (`espressoir-dev`, created 2026-10-11), docs.
  - [x] 2A accounts: e-mail code and Google sign-in, onboarding (username + terms),
        `/u/[username]`, `/hesap` (edit, export, delete), KVKK draft pages, `pnpm user:invite`.
  - [ ] 2B community tastings: pg_trgm coffee search + duplicate warning, rate limits, community
        numbers, follows, `/akis`, profile stats, the single archive read split up.
  - [ ] 2C interaction + moderation: comments (one reply level), likes, `/tadim/[id]`, reports,
        admin panel (hide, delete, restrict, review, merge).
- [ ] Phase 3 social depth · Phase 4+ Expo app.

Decisions made with the owner: repo goes private (backups as encrypted Actions artifacts);
email + password login in Phase 1; Expo for mobile (hence the monorepo); CI tests run on an
ephemeral Supabase on the GitHub runner instead of the cloud dev project.

Phase 2 decisions (owner-approved; they become conventions as each step lands):

- **Try on dev first:** a dev Supabase project feeds Vercel Preview; prod sees a change after it.
- **Invite-only beta:** Supabase signup stays closed, invitations go out from a local script.
  Opening to everyone is one setting, flipped only after the KVKK texts are legally reviewed and
  backups run.
- **New coffees appear at once**, flagged unreviewed (`coffees.reviewed_at`), with daily caps and
  an admin review/merge tool; unreviewed coffees stay out of the sitemap.
- **Site-wide pages show the community** (`/`, `/kahveler`, `/istatistik`); one person's archive,
  the owner's included, is their profile `/u/[username]`.
- **Sign-in:** e-mail one-time code (6 digits, with a link in the same mail) and Google.
  Password login stays for existing accounts only; nobody signs up with a password.
- **"May this user post?" is a database rule:** `can_post()` = onboarded and not restricted, used
  by RLS. Rate limits are triggers, because the browser writes to Supabase directly.
- **Likes, comments, follows, reports and feed pages are client islands** talking to Supabase;
  Server Actions only where a cached page must be refreshed (tastings) and for sign-in callbacks.
- **The single `archive` read is split** into tagged reads (`catalog`, `coffee:<id>`,
  `user:<id>`, `feed`, `stats`) so one write no longer re-renders the whole site.
- **Rankings use a shrunken mean** (`m = 3`); what is displayed stays the raw mean with its `n`.
- **Turnstile only on sign-in requests**, through Supabase Auth's CAPTCHA setting (the secret
  lives in Supabase). The brief also asked for it on comments; the owner accepted leaving that
  out: a browser check cannot guard a table the browser writes to.
- **Account deletion and data export are RPCs**; still no secret at app runtime.

Still open on the owner's side (remind, don't do for them):

- Apply the 2A migrations (`pnpm db:push:dev`, then prod) and do the sign-in setup in
  docs/setup-auth.md: redirect URLs, Resend SMTP + DNS records, e-mail templates, Turnstile,
  optionally Google. Until then only the password login works on the cloud projects.
- Make the repo private, then add the backup secrets and keepalive variables (docs/backup.md).
  Prod has no backups yet: **nobody is invited before that.**
- Have the KVKK texts reviewed and fill in the contact address (`CONTACT` in `legal-tr.ts`);
  signup stays closed to the public until then.
- `espressoir.com` is connected (2026-10-11), but `www.espressoir.com` serves the site instead
  of redirecting to the apex: set it to redirect in Vercel → Domains.
- Vercel Preview needs the dev project's two public variables; whether they are set shows in
  the Vercel check of the next PR.

Phase 1 choices worth knowing: `comments`, `likes` and `reports` tables wait for Phase 2 (only
`follows` exists now, because the "followers" visibility needs it); catalog inserts are open to
any signed-in user and must get rate limits/duplicate checks before signup opens; the owner's
Notion export is not committed (tests and CI use `scripts/notion/fixtures/sample-export.csv`).
