# CLAUDE.md

Espressoir: a coffee-tasting archive (owner's Notion notes) growing into a coffee social network
(web, and a React Native app for iOS). Full brief: `PROJECT_BRIEF.md` (Turkish).

Tasarım kuralları: design/DESIGN.md, içerik: design/icerik.md. Yeni arayüz kodu bu kurallara ve design/tokens.css'e uymalı.

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
pnpm tokens:gen                               # design/tokens.css colours → lib/design-tokens.ts
pnpm admin:bootstrap [--env prod]             # owner account (signup is closed)
pnpm user:invite [--env prod] <email>…        # invitation e-mail (the only way in for now)
pnpm export:analytics [--env prod|--offline]  # public tastings under pseudonyms → data/analytics/
pnpm import:recommendations --file <csv> --model <name> [--dry-run|--clear] [--env prod]
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
                             /u/[username]/liste/[slug], /workshop, /workshop/[id] (+ actions.ts:
                             the application), /bilgi, /bilgi/[slug],
                             /akis, /tadim/[id], /kvkk, /gizlilik, /kosullar, /ara, /kahve-testi,
                             /workshop/[id]/takvim (route: the .ics file))
apps/web/src/app/(account)/  /giris, /panel, /panel/tadim/yeni[/<coffee id>], /panel/listeler, /panel/oneriler,
                             /panel/kafe/*, /panel/isletme/*,
                             /hesap, /hesap/kurulum, /bildirimler,
                             /osman (admin: overview), /osman/atolyeler (+ [id]/xlsx, [id]/pdf),
                             /osman/yonetim (moderation); admin-area.tsx asks for the password
                             (dynamic; session read behind <Suspense>)
apps/web/src/app/teyit/      /teyit/[token] (a workshop applicant's "are you coming?" page; per request),
                             /teyit/[token]/takvim (route: their workshop as an .ics file)
apps/web/src/app/auth/       /auth/callback (route: code exchange), /auth/confirm (link → one click)
apps/web/src/app/api/        /api/arsiv-tazele (the app asks for a cache refresh; POST, bearer token)
apps/web/src/app/            root layout (fonts), 404/error/loading, icon + apple-icon (drawn),
                             sitemap, robots, OG image
apps/web/src/proxy.ts        session refresh + redirects, matcher = /panel/*, /hesap/*,
                             /bildirimler, /giris only
apps/web/src/components/     ui/ (button, chip, card, field, dropdown), site/ (header, nav-links:
                             the Keşfet panel, member-nav: "Tadım ekle" + the phone tab bar,
                             footer, page heading, empty state, legal page), home/ (hero
                             actions, sample tasting), coffee/ (TastingCard, ScoreBadge,
                             TasteProfile), stats/ (charts), workshop/ (EventCard, ApplyForm),
                             info/ (InfoCard, FeaturedArticle, ArticleRow, GuideCard, RecipeCard,
                             BrewAssistant), panel/ (forms,
                             coffee picker), account/ (account menu, Turnstile, form message),
                             social/ (follow, feed, like, comments, report), search/ (box, header
                             button), quiz/ (the quiz, its band)
apps/web/src/content/        atolye/ (workshop programs, TS, one per kind), bilgi/ (articles,
                             one Markdown file each; README says the format), demleme.ts (the
                             brewing assistant's plans), kahve-testi.ts (the quiz)
apps/web/src/lib/            auth.ts (requireUser/requireSession), auth-config.ts (public switches),
                             session-cookie.ts (useHasSession: "is someone signed in?" for islands),
                             structured-data.ts (JSON-LD), workshop-calendar.ts (.ics, Google link)
apps/web/src/lib/data/       archive.ts (the one cached read), selectors.ts (re-exports the
                             pure views from @espressoir/db), workshops.ts (their own cached
                             read), articles.ts, today.ts (the year, cached), search-index.ts
apps/mobile/                 React Native app (no Expo): index.js, src/App.tsx (navigators),
                             src/navigation.ts (routes, router), src/screens, src/components,
                             src/lib (supabase, archive, session, theme, notifications, photo,
                             site, env), ios/ (Xcode project, scene delegate, EspressoirNative
                             pod), scripts/ (write-env, ios-device); docs/mobile.md
apps/web/e2e/                archive.spec (public, sample data) · panel.spec, account.spec,
                             community.spec, moderation.spec (need Supabase + its mail catcher)
                             · helpers.ts
packages/core                siteConfig, fold/slug, score tiers, catalog enums, stats, list filter,
                             account rules (usernames, TERMS_VERSION), brew (assistant), search,
                             calendar (.ics), quiz
packages/db                  generated types, read models (archive, profile; Zod), input schemas
packages/i18n | config       UI copy (tr.ts, legal-tr.ts) · shared tsconfig/eslint
scripts/                     db-push, gen-types, import-notion (+ notion/), admin-bootstrap,
                             user-invite, offline-snapshot, e2e-setup, media-sweep,
                             export-analytics, import-recommendations, db/*.test.ts (RLS, RPC,
                             accounts, contract)
supabase/                    migrations/, rollbacks/, templates/ (auth e-mails),
                             tests/local-shim.sql
design/                      DESIGN.md (rules), tokens.css (every value), components.css
                             (reference only), icerik.md (copy and coffee facts)
docs/                        setup-supabase, setup-auth, deploy-vercel, backup, launch-checklist
                             (what only the owner can supply before opening up)
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
  `refreshArchive()` (`lib/data/refresh-archive.ts`), never `updateTag` directly: it expires the
  tag at once and again two seconds later. A read of the archive that was already running when
  a write landed finishes afterwards and would be kept as current although it lacks the write
  (two quick saves in a row, or a save while a page is being fetched ahead); the second expiry
  clears it. For the same reason links to archive-built pages are not prefetched from the
  signed-in area (`NavLinks`, the header logo, the admin panel's links). Data changed outside
  the site (import, SQL) shows up within the hour.
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
- Charts are server-rendered HTML/CSS (no chart library): one series (`ink-2`), value labels, a
  table twin under each, `n` beside every mean, n < 3 faded and tagged "Az tadım"
  (`SMALL_SAMPLE`). A mean score is a number and one accent bar, like every score.
- Client components shared with the server must not format with `Intl` (hydration); prepare
  display strings on the server (`lib/coffee-cards.ts`).
- `new Date()`/`Math.random()` in server components only inside `'use cache'` (with `cacheLife`).
- **Three secrets at app runtime, each for one job.** `SUPABASE_SECRET_KEY` is read only by
  `lib/supabase/admin.ts` (`server-only`), only for the invitation screen's Auth admin calls,
  only after `requireAdmin()` (owner-approved exception, 2D). Never use that client on the app's
  own tables; everything else still runs with the publishable key and the caller's session.
  `RESEND_API_KEY` (with `WORKSHOP_NOTIFY_EMAIL`) is read only by `lib/workshop-mail.ts`, to
  tell the owner about a new workshop application (owner-approved 2026-10-23); without it
  nothing is sent. `GA_SERVICE_ACCOUNT_KEY` (with `GA_PROPERTY_ID` and
  `GA_SERVICE_ACCOUNT_EMAIL`) is read only by `lib/analytics/ga-report.ts`, for the visits
  on /osman's overview, after the admin check (owner-approved 2026-10-24, with Google
  Analytics); without them the overview says what is missing. Vercel holds secrets as
  **Secret** (prod key on Production, dev key on Preview); the public values are **Config**
  variables (a `NEXT_PUBLIC_` name cannot be a Vercel Secret).
- Turborepo runs tasks in strict env mode: an env var the build reads must be listed in
  `turbo.json` (`globalEnv`) or the build silently sees it as unset.
- **`lint`, `typecheck` and `test` depend on a `transit` task** (no package has that script;
  `transit` depends on `^transit`): they still run in parallel, but a change in a workspace
  package changes the hash of every package that uses it. Without it the mobile app's
  typecheck was replayed from cache after a change in `@espressoir/core` and only CI caught
  the error (2026-10-24). Never give a package a `transit` script.
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
  and DOM APIs so the React Native app can reuse them.
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
- **Design = `design/DESIGN.md`** (replaced the "tasting form" and its two looks on
  2026-10-23; palette, type and home page reworked from the owner's brief on 2026-10-28):
  Warm Cream paper (`--bg #F6F1E9`), Soft White cards (`--surface`), Espresso Brown ink and
  primary button (`--ink`, `--primary`; cream in the dark theme), Burnt Copper (`--accent`)
  for the active menu line, score bars, the logo, links (`--accent-ink`) and the focus ring
  only, and Sage (`--sage`, `--sage-ink`, `--sage-soft`; was `--leaf`) for brewing methods,
  filters, pressed choices and success. Every colour, space, radius and font family comes
  from `design/tokens.css`, imported by `app/globals.css` into a layer of its own and mapped
  onto Tailwind's theme
  (`bg-surface`, `text-ink-2`, `border-line`, `rounded-lg`, `shadow-sticky`…); Tailwind's own
  palette, radii, shadows and type sizes are switched off, so a class can only name a token.
  Spacing uses the token steps (1, 2, 3, 4, 6, 8, 12, 16, 20, 24); sections sit 48px apart,
  80px from 768px; the page is at most 1152px (`max-w-grid`). Type styles are utilities
  (`type-display`, `type-title`, `type-card-title`, `type-lead`, `type-kicker`, `type-label`,
  `type-meta`, `type-figure`). Two families (owner's brief, 2026-10-28): Fraunces (titles,
  names, the hero's italic line) and Manrope (everything else), loaded by next/font into
  `--font-display/sans`; numbers are Manrope's `tabular-nums`, there is no monospace. The
  share images draw the same two from `src/assets/fonts` (Manrope as latin + latin-ext
  files, registered as two names); the admin PDF still embeds Archivo (one file with every
  Turkish letter). No uppercase labels, no numbered headings, smallest text 14px, Lucide
  icons (1.5 stroke, 20px), no emoji.
- **One primary action per screen** (`Button` variants `primary`, `secondary`, `text`; `sm`
  only in the header and the cookie bar). Cards are framed by `--line`, never by a shadow;
  `shadow-raised` is for what floats over the page (the Keşfet panel, menus),
  `shadow-sticky` for bars fixed to the bottom. Not everything is a card: steps
  and lists are divided by lines; a list with nothing in it is an `EmptyState` (dashed, a
  sentence, the next step). A TastingCard is a single link; lists of coffees, cafés and
  suggestions are rows that are each one link. Scores never change colour; a missing score is
  words ("Puan verilmedi", "Henüz puanlanmadı"), never a dash.
- **The logo is one drawing** (`lib/logo.ts`, DESIGN.md → Logo; the owner picked it from ten
  drafts on 2026-10-24): a coffee bean woven from score bars, eight rows of rounded bars in
  an oval with a swinging gap for the crease, computed once as `LOGO_BARS`. `LogoMark` /
  `Wordmark` (`components/site/logo.tsx`) draw it in `fill-accent`; `lib/og.tsx` draws the
  same bars with the token values for the share images and the app icons (`app/icon.tsx`,
  `app/apple-icon.tsx`: the dark theme's accent on `--ink`).
- **Motion lives in tokens and utilities:** `--motion-fast/slow/ease` in `tokens.css`;
  `animate-rise`, `animate-fill` (bars, with `origin-left`), `animate-settle` (photos),
  `animate-pop` (menus), `animate-delay-<ms>` and `stagger` (a list whose items rise one after
  another) in `globals.css`. Always behind `motion-safe:` (or inside `stagger`, which uses it):
  "reduce motion" keeps every page still. Entrances play once on load, never on scroll.
  Hover lifts use the `translate` property (`hover:-translate-y-0.5`), so they never fight an
  entrance's `transform`. A delay takes the same variants as its animation
  (`motion-safe:animate-delay-150` beside `motion-safe:animate-fill`): the `animate-*`
  shorthand under a variant resets a plain `animate-delay-*`.
- **Photos are the site's own files** (`public/images/<id>-640.webp` and `-1280.webp`), listed
  with their Turkish `alt`, photographer and Unsplash page in `content/photos.ts`; drawn by
  `PhotoImage` / `PhotoFigure` / `PhotoCredit` (`components/site/photo.tsx`), plain `<img>`
  with `srcSet`. A new photo: crop it to the shape it is shown in, write both widths without
  metadata, add a line to `PHOTOS`. An article names its one picture with `image:` in its
  header (checked against `PHOTOS` when the articles are read); a workshop program with
  `photo`.
- **Light and dark** come from the same tokens: `data-theme` on `<html>` (next-themes) or the
  system preference; the switch is in the footer. Places that cannot read CSS variables (theme
  colour, manifest, share images, the global error page, the drawn icons) read
  `lib/design-tokens.ts`, generated by `pnpm tokens:gen`; a test fails while it disagrees with
  `tokens.css`.
- **Menu** (2026-10-28): Keşfet (a disclosure button, not an app menu, opening Kahveler,
  Tadım notları, Kafeler, İstatistik with a line each; current for every page under them),
  Rehberler (`/bilgi`), Atölye (`/workshop`); on the right the search button, "Tadım ekle"
  for members from 768px (`AddTastingLink`), then "Giriş" or the member's picture, whose menu
  holds Profil, Panel, Bildirimler (with the unread count), Kahveler, Kafeler, İstatistik,
  Hesap, and for admins Atölyeler (`/osman/atolyeler`) and Yönetim (the panel's shortcuts
  have the same two). On a phone members get `MemberTabBar` at the bottom (Akış, Keşfet,
  Ekle, Defterim = `/panel`), decided from the session cookie like the account menu; pages
  with a bar of their own (the tasting and visit forms, the workshop) and sign-in, setup and
  admin pages have none (`OWN_BOTTOM`). The footer lists every place in four groups
  (Espressoir, Keşfet, Öğren, Yasal metinler); no contact line until there is a real address.
- **The home page leads with the notebook** (owner's brief, 2026-10-28; it replaced the
  knowledge-first home of 2026-10-24): "Kişisel kahve defterin", "İçtiğin kahveleri kaydet.
  Her fincanı hatırla.", the one main action "İlk tadımını kaydet" (`HeroActions`: a visitor
  goes to `/giris`, which says joining is by invitation and what is open meanwhile; a member
  sees "Tadım ekle" and goes to the form) and "Kahveleri keşfet". Beside it a photo and
  `SampleTasting` side by side, neither covering the other (owner's choice, 2026-10-28: text |
  photo | card from 1280px, the pair under the text below that, stacked on a phone), the card
  drawn with the real tasting parts and labelled "Örnek kayıt" (never a real member's entry). Then "Nasıl çalışır?" (three steps, shared with the About page as
  `t.home.how`), the latest three tastings, the six best-liked coffees (`topCoffees`), three
  guides and "Bütün rehberler", the quiz, one featured article beside four rows, the next
  workshop.
- **A coffee's page has "Tadım ekle" as its primary action:** `/panel/tadim/yeni/<coffee
id>` opens the form with that coffee chosen (the id in the path, like the café form;
  `new-tasting.tsx` reads a coffee missing from the cached archive from `coffee_overview`).
- **A workshop's duration is derived** from its start and end (`workshopWhen().duration`,
  "2,5 saat"); program step minutes are content and are not summed against it.
- Coffee, brand, café and member names are written as they are (no CSS uppercasing anywhere);
  give English brand text `lang="en"`.
- Notes/comments are plain text, rendered escaped (no HTML/markdown).

Accounts (Phase 2A):

- **Sign-in runs in the browser**, straight against Supabase Auth (`giris/login-form.tsx`): the
  auth server's rate limits are per address, and a server action would make every visitor share
  Vercel's. The session lands in cookies the server reads. Three ways in: e-mail code (the same
  mail carries a link), Google, and a password for accounts that already have one.
- **`/auth/callback`** exchanges `?code=` (Google, Supabase's stock e-mail link) and hands
  `?token_hash=` links from our templates to **`/auth/confirm`**, which signs in only after a
  click: mail scanners open links, and a link that signed in on sight would be spent.
- **The sign-in code's length is the Supabase project's setting** (8 digits on the cloud
  projects, 6 in the local stack): the form accepts 6–10 and no copy states a number.
- **CAPTCHA:** when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set every auth call carries a Turnstile
  token (single use: reset after each call). It must be set whenever Supabase's CAPTCHA
  protection is on (set while protection is off is harmless: the token is ignored), so turn
  protection off in Supabase first and remove the key after, and the other way round to turn
  it on. The local stack runs with Cloudflare's test keys, so CI goes through it too.
- **`profiles` is public; `profile_private` is not** (accepted terms, username changes,
  restrictions): own row + admins may read, only SECURITY DEFINER functions write. Put nothing
  private on `profiles`.
- **Every write policy includes `(select public.can_post())`** (onboarded and not restricted).
  A new table people write to needs it too. Restricted members can still read and delete.
- **Usernames:** placeholder `u_<16 hex>` until `complete_onboarding_v1`; reserved names live in
  `reserved_usernames()` and `RESERVED_USERNAMES` (a test compares them); a trigger allows one
  change per 30 days. Admins and scripts (no API user) are exempt.
- **An invited address has no account until the invitation is accepted**, and the auth server
  treats an unconfirmed user as a signup: while signup is closed it sends them no sign-in code.
  An invitation that ran out (one hour) is replaced by running `pnpm user:invite` again.
- `requireUser()` sends signed-out visitors to `/giris` and members without a username to
  `/hesap/kurulum`; `requireSession()` is for the onboarding page only. The test helper
  `createUser()` returns onboarded users unless told `onboarded: false`.
- **The header's account menu decides from the session cookie** whether to show "Giriş" or a
  member's picture: a visitor's browser never loads the Supabase client; a member's loads it on
  demand to fill the menu (`AccountMenu`).
- **Legal texts** are `packages/i18n/src/legal-tr.ts`, shown with a draft banner until the owner
  has had them reviewed. Changing them means bumping `TERMS_VERSION` in `@espressoir/core`.
- Members are part of the archive read (`archive.profiles`).

Community (Phase 2B):

- **Database first, then code.** Pages read new views and columns while they are built, so a
  migration goes to prod before its PR is merged (a build against an older database fails and
  the previous version stays live). New read-model columns are optional in the Zod schemas
  (`is_reviewed`) so the app also survives the opposite order.
- **Finding a coffee:** `search_coffees_v1` (trigram similarity over `coffees.search_text`, the
  folded "brand + name" kept current by triggers). The tasting form uses it both as the search
  box and as the duplicate check while a new coffee is typed (`panel/coffee-picker.tsx`).
- **`coffees.reviewed_at` is set by a trigger from who is asking**: admins and scripts add
  reviewed coffees, members unreviewed ones, whatever they send. Unreviewed coffees are public,
  labelled, and left out of the sitemap. The review tool itself comes with the admin panel (2C).
- **Rate limits are triggers:** `enforce_rate_limit('<owner column>', '<max>', '<interval>')`
  on the table (tastings 30/day, coffees 5/day, brands 3/day, follows 200/day; admins and
  scripts exempt). It raises `rate_limited`. A new table people write to gets one.
- **Feeds:** the first page of `/akis` is rendered on the server from the archive and passed to
  the client component as a node; later pages and the "people I follow" tab (`following_feed`)
  are read in the browser, keyset-paged on `(created_at, id)` because imported rows share a
  timestamp. Page size: `FEED_PAGE_SIZE`.
- **Islands on public pages load the Supabase client on demand** (`await import`) and only for
  browsers that hold a session (`useHasSession()`); a visitor never downloads it.
- **Rankings** (`topCoffees`) sort by `shrunkenMean` (prior weight 3); the number shown is the
  plain average with its `n`.
  Interaction and moderation (Phase 2C):

- **A tasting has its own page** (`/tadim/[id]`, static, `noindex`): likes and comments happen
  there. Lists only show the counts, from the cached archive, as a link to it.
- **Comments:** one level of replies (a trigger checks the parent). Members insert
  `tasting_id, user_id, parent_id, body` and update `body`, nothing else (column grants), and
  have no DELETE: removal is `delete_comment_v1`, which deletes an unanswered comment and blanks
  an answered one (words and author gone, placeholder kept for the replies). An account that is
  deleted takes its comments the same way (`profiles_scrub_comments`).
- **Likes:** other people's logged tastings only, as yourself.
- **Hidden content** (`hidden_at` on tastings and comments) is invisible to everyone but its
  author and admins, and left out of every number, whoever asks.
- **Reports** point at a tasting, comment, profile or coffee (a trigger checks it exists); one
  per person per thing; read by the reporter and admins.
- **Admin acts go through `admin_*_v1` functions** (hide, delete, restrict, resolve, review,
  merge coffees/brands): each checks `is_admin()` and writes `moderation_log` via
  `log_admin_action()`. The panel (`/osman/yonetim`) is plain forms and Server Actions that
  call them as the signed-in admin: no service key, and the page works without JavaScript.
- **Rate-limited rows are stamped with `now()`** for members (`enforce_rate_limit`), so a
  back-dated `created_at` cannot dodge a limit. Comments 10 / 5 min and 100 / day, likes
  500 / day, reports 20 / day.
- **New enums** (`report_target`, `report_reason`, `report_status`) are mirrored in
  `@espressoir/core` and compared by the contract test.
- **Never name a form control after a property of its form** (`id`, `hidden`, `action`,
  `method`, `target`, `name`…): the control replaces that property (`form.id` becomes the
  input). The admin forms use `targetId`, `hide`, `reportId`.
- In Playwright, a page left through a link stays in the document, hidden: use role queries
  or `.filter({ visible: true })`, not bare `getByText`, after a client-side navigation.

Invitations (Phase 2D):

- **`/osman` → Moderasyon → Davetler** sends, re-sends and withdraws invitations with Supabase's Auth
  admin API (`inviteMember`, `cancelInvitation`). The link leads to the origin of the request,
  so a preview invites to itself. "Pending" = `invited_at` set and `email_confirmed_at` empty;
  `cancelInvitation` re-reads the account and deletes it only in that state, so the screen can
  never delete a member. Without the key the section explains what is missing and
  `pnpm user:invite` still works.
- An e2e test keeps every public page from scrolling sideways on a phone; absolutely positioned
  extras (chart labels) count even while invisible.
- **A screen that changes a public page must not prefetch that page** (`prefetch={false}` on
  the admin panel's links to coffees, tastings and profiles). A render that starts before
  `updateTag` and ends after it is stored as fresh, so the page keeps its old state until the
  cache runs out; a link scrolled into view by the click on the button next to it does exactly
  that (CI caught it once the invitation section pushed the catalog below the fold).

Taste (Phase 3A):

- **Flavour tags are a fixed list** (`flavor_tags`, admin-written; 20 tags in 7 `flavor_group`s,
  mirrored as `FLAVOR_GROUPS`). Members pick from it, at most `FLAVOR_TAGS_MAX` (5) per tasting;
  a trigger enforces the cap and keeps tags off wishlist entries. Tag names come from the
  database (like brew method names), not from `packages/i18n`.
- **Writing:** new tastings go through `log_tasting_v2` (v1 plus `p_flavor_tag_slugs`; v1 stays);
  an edit updates the row, then calls `set_tasting_tags_v1`, which replaces the whole set.
- **Reading:** `tasting_feed` ends with `flavor_tag_slugs` and `flavor_tag_names` (same order);
  the read model turns them into `tasting.tags`. The tag list itself is `archive.flavorTags`.
- **Taste numbers are derived, not stored:** `tasteMeans` and `countTags` (`@espressoir/core`)
  over the archive's tastings, via `lib/data/taste-summary.ts`. Each taste dimension has its own
  `n`, because people only fill in what they noticed.
- **`TasteProfile` (`components/coffee/taste-profile.tsx`)** replaced the radar (2026-10-23):
  each dimension five dots and a word (Hafif/Orta/Yoğun…), read aloud as "Gövde: 2/5, hafif";
  a mean also prints its value and `n`, small samples faded. Dimensions without a value are
  left out. Bitiş is shown too, after DESIGN.md's four.
- **Tags inside a tasting are a sentence, not a list** (`FlavorTags`, note chips in small
  letters): a tasting is already a list item, and nested items would be counted with it.
- **Sample data** gets taste profiles and tags from `scripts/lib/sample-taste.ts`, applied only
  when the imported file is the fixture; a Notion export has no such columns.
- **The archive read is measured:** `getArchive()` warns past `ARCHIVE_SPLIT_BYTES` (1 MB), and
  a database test caps what one tasting or coffee row may weigh. That warning is the cue to
  split the read.

Lists (Phase 3B):

- **`lists` and `list_items`**: a member's named, ordered collections of coffees, public or
  private (`is_public`), each entry with an optional note. Limits are triggers:
  `LISTS_PER_MEMBER_MAX` (50), `LIST_ITEMS_MAX` (100), 10 new lists a day. The slug is made
  from the title once, unique per member, and survives a rename (`/u/[username]/liste/[slug]`).
- **Members write title, description, visibility and notes** (column grants); the slug, the
  order and the admin columns are not theirs. The order changes through `reorder_list_v1`,
  which takes every entry exactly once.
- **"Want to try" is still the `wishlist` tasting status**, now one click on a coffee's page.
  Wishlist entries are counted on that page ("3 kişi denemek istiyor"), not listed among the
  tastings.
- **List writes are Server Actions** (`panel/listeler/actions.ts`), unlike likes and comments:
  a list is part of the cached archive (`archive.lists`, from the `list_feed` view), so a
  change must refresh it. The buttons on a coffee's page (`CoffeeActions`) read the member's
  own state in the browser and call those actions; visitors get links to the login.
- **A read of something newer than the database is optional:** `readAll(…, { optional: true })`
  returns nothing when the relation does not exist yet, instead of failing the whole archive.
  Use it for the first read of every new view.
- **Lists can be reported and hidden** like tastings: `report_target` has `list`, and
  `admin_set_hidden_v1` / `admin_delete_v1` handle it. Adding an enum value cannot be undone in
  place: the rollback rebuilds the type (see the migration's `.down.sql`) — avoid new enum
  values where a boolean or a text check will do.
- Merging two coffees moves list entries to the survivor; an account that is deleted takes its
  lists with it; the data export includes them.

Notifications (Phase 3C):

- **Made by triggers, never by the app:** `likes`, `comments` and `follows` are written by the
  browser straight to Supabase, so the database is the one place that sees them all. A like
  tells the tasting's author; a comment tells the author; a reply tells the author of the
  comment it answers and, if that is someone else, the tasting's author too; a follow tells
  the followed. Never oneself, never about a hidden tasting.
- **`notifications` has no write grants at all.** The recipient reads (RLS), and
  `mark_notifications_read_v1(p_before)` marks as read "up to" a moment, so one arriving while
  the list is on screen stays unread. Reads go through `notification_feed`, which also drops
  rows whose tasting or comment the member can no longer see.
- **One per like and per follow** (partial unique indexes). Taken back unseen, it is deleted;
  once read it stays, so like → unlike → like does not notify twice. A comment that is removed
  or hidden, and a tasting that is hidden, take their notifications along. The newest
  `NOTIFICATIONS_KEPT` (200) per member are kept.
- **`type` is text with a check** (`NOTIFICATION_TYPES`; a test compares the two), not an enum:
  see the note on enum values under Lists.
- **No open connection.** The header's account menu (`AccountMenu`) shows only to browsers with
  a session cookie, loads the Supabase client on demand and counts unread rows on every page
  change and when the tab comes back into view (a dot on the picture, the number in the menu). `/bildirimler` marks what it shows as read
  from a client effect (`MarkRead`), never during rendering: a page fetched ahead must not
  swallow notifications.

Photos (Phase 3D):

- **Files in Storage, paths in Postgres.** Bucket `media` (public read, 600 KB, WebP/JPEG
  only); paths are `<kind>/<member id>/<file id>.<ext>` (`MEDIA_PATH_PATTERN`), kinds
  `tastings` and `avatars`. A tasting's picture has a small twin beside it (`…-s.<ext>`, 480 px
  edge) for lists; the full one is 1600 px, an avatar a 400 px square.
- **Prepared in the browser** (`lib/image-resize.ts`): decoded, drawn on a canvas, re-encoded
  (WebP, JPEG where WebP cannot be written) until it fits. Re-encoding drops all EXIF — location,
  camera, time; an e2e test uploads a fixture with a GPS position and checks the stored bytes.
  Uploads go straight from the browser to Storage (`components/social/media-data.ts`).
- **Storage rules are RLS on `storage.objects`:** members insert into their own folders (with
  `can_post()`), see and delete their own rows; admins see and delete all. No secret key.
- **Attaching is a database call:** `set_tasting_photo_v1` / `set_avatar_v1` check the row is
  the caller's, the file is in their folder and exists, and return the previous path; the
  caller then removes that file (`lib/media-server.ts`). Members cannot write the columns.
  `admin_remove_photo_v1` takes one down (logged). `profiles.avatar_url` is no longer writable.
- **A deleted row does not delete its file.** The actions remove files after replacing,
  deleting a tasting, or before deleting an account; whatever is left is found by
  `pnpm media:sweep` (files older than a day that no row points at; `--apply` removes them).
- **Public files, even for private tastings:** the URL is unguessable but not secret. The
  privacy draft says so.
- Plain `<img>` with width/height, never `next/image` (the host's optimisation quota). The
  test database has a stand-in for Storage's tables (`supabase/tests/local-shim.sql`); policy
  tests that write to `storage.objects` as a member run only there.
- Pictures are not in the `pg_dump` backup (docs/backup.md).

Home screen and the quick form (Phase 3E):

- **A web app manifest, no service worker** (`app/manifest.ts`): standalone, portrait, two
  shortcuts ("Tadım ekle", "Akış"). The site needs the network; an offline copy of pages that
  change with every tasting and sign-in would only be out of date. iPhone: `appleWebApp` in the
  root layout and `app/apple-icon.png`.
- **Icons are drawn at build time** with next/og from the logo mark (`app/icon.tsx`:
  `/icon/32`, `/192`, `/512`, `/maskable`; `app/apple-icon.tsx`). Maskable keeps the mark
  inside the middle 80 %.
- **`viewportFit: "cover"`**: the body keeps the safe-area insets as padding, and so does the
  form's save bar.
- **The new-tasting form starts from the member's last tastings:** up to six recent coffees as
  one-tap buttons, brew method and device from the latest one; on a phone the save button
  stays at the bottom of the screen. A tasting of a known coffee is four steps.

Cafés (Phase 3F):

- **A section of their own:** `cafes` (name, `city_code` = plate number 1–81, optional
  district, optional `map_url`) and `cafe_visits` (drink kind, optional menu name, score 1–10,
  note, day, price, visibility). Nothing about cafés enters coffee numbers, `/` or
  `/istatistik`. The provinces are `TR_CITIES` in `@espressoir/core`; a café's address is
  `/kafe/<city slug>/<café slug>`, the slug made once, unique per city (`cafePath`).
- **Members add cafés like coffees:** at once, unreviewed (`set_cafe_review_state`), 5 a day,
  30 visits a day; the form warns about look-alikes in the same city (`search_cafes_v1`,
  trigram over the folded name + district). Admins review, merge (`admin_merge_cafes_v1`
  moves visits and reports) and delete an empty café (`admin_delete_v1('cafe', …)` refuses
  one with visits). Unreviewed cafés stay out of the sitemap.
- **A map link is only ever pasted, never fetched:** https on a known map service
  (`MAP_URL_PATTERN`, the same expression as the `cafes_map_url_format` check; a test
  compares them), shown as `rel="nofollow ugc noopener noreferrer"`. No map service, no key.
- **Drink kinds are text with a check** (`CAFE_DRINKS`, compared by a test), not an enum;
  `report_target` did get `cafe` and `cafe_visit` (its rollback rebuilds the type).
- **Visits are read like tastings:** public for all, followers for followers, private for the
  author, hidden for nobody else (same policies). The archive carries every café
  (`cafe_overview`, numbers from public visits only) and the public visits
  (`cafe_visit_feed`, no price), both read with `{ optional: true }`; pages derive the rest
  in `lib/data/cafes.ts`. `log_cafe_visit_v1` finds or creates the café (same folded name in
  the same city) and adds the visit in one transaction; edits and deletes are table calls.
- **Visits have no page, likes or comments** (each one carries its own report button), and
  the feed's "Kafeler" tab is one server-rendered page of the latest visits.
- **Panel forms submit through `submitWithoutReset`** (`lib/form-submit.ts`). React resets a
  form after its action runs, back to the values the controls had when they mounted: a
  controlled radio or select then shows one choice and sends another ("Yeni kafe" on screen,
  "Kayıtlı kafe" in the request). A new form with controlled choices does the same.
- **A choice handed to a signed-in page goes in the path, not the query**
  (`/panel/kafe/yeni/<café id>`). With partial prefetching the router may answer a
  navigation with a copy of the same path it fetched ahead, and `?kafe=` was lost (CI).

Recommendations (Phase 4A):

- **The site's own model is a pure function,** `recommendCoffees` in `@espressoir/core`
  (`recommend.ts`), so the app can use it too. Signals: taste profile closeness to what the
  member liked (scored ≥ their own mean), flavour-tag overlap (cosine), and "people who liked
  X also liked Y"; weights `RECOMMEND_WEIGHTS`, signals from few tastings count less, the
  community's shrunken mean nudges the order. Each suggestion carries its strongest signal as
  its reason. Fewer than `RECOMMEND_MIN_SCORED` (3) scored tastings: the page shows the
  community's favourites and says why.
- **`/panel/oneriler`** (signed-in, under `/panel` so the proxy refreshes the session) feeds
  it the member's own tastings, private ones included, and everyone else's public ones from
  the archive. Only the member sees the page.
- **A model trained elsewhere** goes into `recommendations` (member, coffee, model, score,
  reason): no write grants, the member reads their own rows. Its latest import wins for the
  members it covers; `--clear --model <name>` falls back to the site's model. An import with
  any problem (unknown member or coffee, a duplicate, a bad score) is refused as a whole.
- **The analysis export holds what the site already shows, minus who wrote it:** public,
  logged, visible tastings; members as `analytics_member_key(id)`, 16 hex characters derived
  from a per-database secret (`analytics_salt`, no grants), the same on every export and
  meaningless without the database. No usernames, notes, exact dates, prices or tasting ids
  (a tasting's page names its author). The export runs in a read-only transaction.

Verified business accounts (Phase 4B):

- **`official_accounts`**: one per brand or café (unique), a member may speak for several.
  Public to read, written only by `admin_resolve_verification_v1` (approve or reject an
  application; logged; tells the applicant with a `verification` notification) and
  `admin_revoke_official_v1`.
- **Applications** (`verification_requests`): a member applies from the brand's or café's
  page (`/panel/isletme/basvuru/marka|kafe/<id>`; the choice in the path, not the query),
  one open per business, 3 a day, `can_post()`; read by the applicant and admins, withdrawn
  while open. A business that already has an official account takes no applications.
- **Editing a business's page is `update_business_page_v1`**, not column grants: grants are
  per role, so they would open the name and the city to official accounts too. Official
  account or admin; description and website, for a café also district and map link; the
  whole set is replaced (empty clears).
- **An official account does not score its own** (trigger `refuse_official_self_score`):
  a tasting of its brand's coffee without a score is fine, a café visit at its café is not
  (visits always score). Scores given before the approval stay.
- **Reads:** `brand_pages` (description, website, official account; `archive.brandPages`,
  optional read), `profile_overview.official_for`, `cafe_overview` ends with description,
  website and `official_username`. On a tasting's page, comments by the brand's official
  account carry "Resmi yanıt" (`CommentThread`'s `officialIds`). Visits have no comments,
  so cafés get the badge and the page, not replies.

The mobile app (Phase 4C; plain React Native since 2026-10-17):

- **`apps/mobile` is plain React Native 0.86 with React Navigation** — no Expo. The owner
  dropped Expo on 2026-10-17 after Expo Go 57 demanded an Expo account on a physical iPhone
  and Expo's prebuild template lagged iOS 27. The iOS project lives in git (`ios/`); what
  Xcode and CocoaPods produce from it does not (`ios/Pods`, `ios/build`, xcuserdata,
  `.xcode.env.local`).
- **Navigation:** `src/navigation.ts` types every screen (`RootStackParamList`,
  `TabParamList`) and exports `router` (push/replace/back through a container ref, usable
  from any component), `useParams` and `useScreenTitle`; `src/App.tsx` declares the native
  stack (modals for sign-in and the two forms) and the tabs. Links are `RowLink` /
  `TextLink` with a typed `to`. A route is `{ screen, params }`, never a path string.
- **The tab bar is iOS's own** (`createNativeBottomTabNavigator` from
  `@react-navigation/bottom-tabs/unstable`, on react-native-screens): the rounded,
  translucent Liquid Glass bar on iOS 26+, SF Symbol icons (filled when selected), the
  unread badge on Hesap, minimised while scrolling down. The owner asked for Apple's look
  there (2026-10-17); the rest of the app keeps the tasting-form design.
- **iOS 27 needs the scene life cycle:** an app built with the iOS 27 SDK that still makes
  its window in the app delegate is killed at launch (`NoSceneLifecycleAdoption`; the iOS 26
  simulator does not show it). `ios/Espressoir/AppDelegate.swift` creates the React Native
  factory only; `SceneDelegate` creates the window and starts React Native in it;
  Info.plist declares the scene manifest. React Native's own 0.86 template does not do this
  either: keep it when upgrading.
- **It shares, never copies, the rules:** the pure archive views live in `@espressoir/db`
  (`selectors.ts`; the web's `lib/data/selectors.ts` re-exports them), the suggestions
  logic is `suggestCoffees` (`@espressoir/db`, `suggestions.ts`; each app only words the
  reasons), copy is `t.mobile` and the rest of `@espressoir/i18n`. Keep `core`/`db`/`i18n`
  free of Next and DOM APIs.
- **Settings are `apps/mobile/.env`** (git-ignored; `.env.example`): `APP_SUPABASE_URL`,
  `APP_SUPABASE_PUBLISHABLE_KEY`, `APP_SITE_URL`. Public values only.
  `scripts/write-env.mjs` writes them into `src/lib/env.generated.ts` (git-ignored; from
  `.env.example` when there is no `.env`, as in CI) before start, ios, bundle and
  typecheck, so they are baked into the build. `APP_SITE_URL` is never localhost (on a
  phone that is the phone): the CAPTCHA page failed to load once because of it.
- **Monorepo plumbing:** `metro.config.js` watches the workspace root and resolves from the
  app's and the root's node_modules; `babel.config.js` maps `@/` to `src/`
  (module-resolver, same as tsconfig `paths`). Workspace packages ship TS source.
- **Native modules** are autolinked from package.json (image picker, webview, date picker,
  async storage, screens, safe area, get-random-values). Our own native code is the
  `EspressoirNative` pod (`ios/EspressoirNative`, linked in the Podfile): `ImageShrinker`,
  which resizes and re-encodes a picture as JPEG. The Podfile raises every pod to iOS 17
  (Xcode 27 refuses targets below 15; some resource bundles ask for 9.0).
- **Sign-in CAPTCHA comes from the site, and only when Supabase asks:** a sign-in request
  goes out without a token; when Supabase refuses it with `captcha_failed` (protection on; a
  refused request sends no mail), the app opens `/uygulama/dogrulama` in a WebView
  (`AppCaptcha`, full-screen over the site's chrome, `noindex`, disallowed in robots), takes
  the Turnstile token it posts (`window.ReactNativeWebView`) and sends the request again.
  With protection off the sheet never shows. Its WebView lets frames load any address
  (Turnstile's own; the default list turns away everything but http, https and
  about:blank, in every frame) and keeps the page itself on the site. One Turnstile widget
  serves both projects (hostnames `espressoir.com`, `vercel.app`, `localhost`).
- **Design:** the website's tokens converted to hex (`src/lib/theme.ts`, light and dark);
  Archivo and IBM Plex Mono as files in `assets/fonts` (linked with `react-native-asset`,
  listed in Info.plist `UIAppFonts`, used by PostScript name). Names stay as written (no
  uppercasing of brands, places, usernames).
- **Installing:** `pnpm --filter @espressoir/mobile ios:device` (`scripts/ios-device.mjs`)
  finds the cabled iPhone with `devicectl`, runs `pod install` when the Podfile changed,
  builds Release with `xcodebuild` (DerivedData outside the iCloud Desktop), installs and
  launches. Signed with the owner's free Apple ID (team `X7AATGWM6G`): re-install every 7
  days. The shared scheme's Run is Release, so ▶ in Xcode gives the same standalone app.
  Development: `start` (Metro) + `ios` (Debug on the simulator). CocoaPods on this Mac
  lives in a conda env (`cocoapods`) behind `/opt/anaconda3/bin/pod`.
- **CI bundles the app** (`pnpm --filter @espressoir/mobile bundle` = `react-native bundle`
  for iOS; no Xcode) besides lint and typecheck.

Writing from the app (Phase 4D):

- **The app writes like the website, through the same RPCs and schemas:** `log_tasting_v2`
  after `tastingInputSchema`, `log_cafe_visit_v1` after `cafeVisitInputSchema`,
  `set_tasting_photo_v1` for the picture; error codes are worded in `src/lib/errors.ts`, the
  same mapping as the panel. Forms are modals (`tadim/yeni`, `ziyaret/yeni`), reached from the
  "Ekle" tab and from a coffee's or café's page (`NewTasting { kahve }` / `NewVisit { kafe }`
  prefill). `MemberGate` asks signed-out visitors to
  sign in and members without a username to finish on the site: the database would refuse
  them anyway (`can_post()`).
- **Duplicate check while typing something new** (`LookAlikes` in `components/pickers.tsx`):
  the same trigram search as the website, a café only within its city.
- **Photos are prepared on the phone** (`src/lib/photo.ts`): picked with
  react-native-image-picker (`includeExtra: false`, HEIC handed over as JPEG), resized by
  `ImageShrinker` (1600 px, twin 480 px), re-encoded as JPEG until under `PHOTO_MAX_BYTES`
  (the Expo-era build wrote WebP; the iOS encoder here writes JPEG, which the site takes). Re-encoding drops the
  metadata, and `hasCameraMetadata` (`@espressoir/core`; JPEG APP1 Exif/XMP, WebP EXIF/XMP
  chunks) checks the bytes anyway: a picture that still carries any is refused, not uploaded.
  Checked on the simulator: a 4288×2848 source with EXIF came out 1600 px, 105 KB, clean.
- **`POST /api/arsiv-tazele`** (`app/api/arsiv-tazele/route.ts`) is how the app makes the
  site show its writes at once: the member's access token as `Authorization: Bearer`, checked
  with the auth server (`auth.getUser`), at most 20 calls a minute per member (in memory, per
  instance), then `expireArchive()`. No secret, no data changed; anything else is a 401. The
  app calls it best effort (`src/lib/site.ts`): a failure only means the site catches up
  within the hour. `expireArchive()` is the Route Handler twin of `refreshArchive()`
  (`revalidateTag(…, { expire: 0 })` now and again two seconds later; `updateTag` works only
  in Server Actions). The app's `APP_SITE_URL` must be the site of the same Supabase
  project, or the token is not recognised there.
- **Dates are the archive's day** (`src/lib/today.ts`, `siteConfig.timeZone`), so "today" on
  the phone is the same day the website would say.
- The `dist/` of `bundle` and `src/lib/env.generated.ts` are git- and Prettier-ignored.

Social in the app (Phase 4E):

- **One set of social queries for both apps:** `@espressoir/db`'s `social.ts` holds what the
  website's islands used to do inline — comments, likes, follows, reports, feed pages
  (keyset), one tasting as the viewer may see it, the member's own tastings and lists,
  notifications (count, list, mark read), the coffee shelf ("want to try", list entries,
  new list), deleting a tasting with its picture files. Each takes a client; the website
  binds them to the browser's (`components/social/*-data.ts`, Server Actions for lists),
  the app to its own. Refusals come back as `SocialFailure` with a kind
  (`socialErrorKind`); each app words them (`lib/errors.ts` in the app).
- **Tabs:** Akış (index: everyone / following / cafés), Kahveler, Kafeler, Ekle, Hesap.
  Öneriler moved out of the tabs (a stack screen opened from Hesap).
- **A tasting's page** (`screens/tasting.tsx`) reads the row with the viewer's session
  (`loadTasting`), so followers-only and own private tastings open for those allowed.
  Likes, comments (one reply level, edit, delete via `delete_comment_v1`), reports and the
  "official reply" badge (members whose `officialFor` includes the tasting's brand) work
  as on the website; the owner deletes it there or edits it on the site.
- **The unread count** (`lib/notifications.tsx`) is read when a tab gains focus
  (`screenListeners`) and when the app returns to the foreground; no connection stays
  open, as on the website. The notifications screen marks read "up to" when it was shown.
- **Own profile:** the profile screen reads the member's own tastings and lists with their
  session (all visibilities, wishlist included) and re-reads them whenever the archive
  is refreshed; everyone else sees the public archive.
- **Writes that show on the website** (lists, want-to-try, deleting a tasting) call
  `refreshSite()` afterwards; likes, comments and follows do not, as on the website.

Workshops and articles (2026-10-23):

- **The workshop lives at `/workshop`** (English address, Turkish copy; moved from `/atolye` on
  2026-10-24, permanent redirects in `next.config.ts`, GA counts both prefixes). The
  introductory program is "Kahve 101" (key still `kahveye-giris`: rows name it);
  `20261024180000_kahve_101` renames the seeded row only while it has its old default title.
- **`workshops` and `workshop_applications`** (migration `20261023120000_workshops`). A workshop
  row is a date with its capacity, price text, public location text and `is_open`; `program`
  names the text the page shows (`content/atolye/<key>.ts`, registered in its `index.ts`). The
  admin panel (`/osman/atolyeler`) adds and edits workshops and answers applications: plain
  table writes as the signed-in admin, allowed by `is_admin()` policies (not moderation, so
  not logged).
- **Anyone applies, nobody reads:** anon and members insert the form's columns only (column
  grants); there is no select policy but the admin's. `prepare_workshop_application` (SECURITY
  DEFINER trigger) tidies the input, refuses a closed or started workshop
  (`workshop_closed`), stamps `created_at`, stops floods (20 per workshop per 10 minutes,
  `rate_limited`), locks the workshop row and sets `status`: `pending`, or `waitlist` once the
  seats are taken. One application per phone number / handle (`contact_key`). No `can_post()`:
  applying is not posting and visitors apply too.
- **The page reads only the seats left:** `workshop_overview` (capacity − applications not
  rejected, the waitlist included, never below zero) through `workshop_seats_taken()`. Its own
  cached read (`getOpenWorkshops`, tag `workshops`), refreshed by `refreshWorkshops()` after an
  application or an admin change, so the archive is not re-rendered for it.
- **The application is a Server Action** (`app/(site)/workshop/actions.ts`): honeypot field
  (`website`), Zod (`workshopApplicationInputSchema`), insert with the public key, then the
  owner's notification mail in `after()`. A full workshop keeps its form (waitlist). Workshop
  form fields avoid form properties: `workshopTitle`, not `title`.
- **The form asks for name and surname and a phone number** (`isWorkshopPhone`: a Turkish
  number written any usual way, or a foreign one with its "+" code; error `phoneInvalid`). The
  admin's "Kişi ekle" still takes a handle too (`adminApplicationInputSchema` overrides
  `contact` with `isWorkshopContact`), and so does the database. Consent is one short line
  linking to `/kvkk#atolye-basvurulari`. The questions are `<details>`, closed at first.
- **Articles are files:** `apps/web/src/content/bilgi/<slug>.md`, a `key: value` header and
  plain paragraphs, parsed by `parseArticle` (`@espressoir/core`, no package) and shipped with
  the server functions (`outputFileTracingIncludes`). A broken file stops the build with a
  sentence. Coffee facts come from `design/icerik.md` only (it lists its sources at the end).
- **Two kinds, four topics** (2026-10-24; `tadim` added 2026-10-25): every file names its
  `topic` (`ARTICLE_TOPICS`: `demleme`, `cekirdek`, `tadim`, `temel`; `/bilgi` shows one
  section each, in that order; `order` runs 10–29, 30s, 40s, 50s). A plain article may sit
  under `demleme` too (the capsule machine: no recipe numbers worth stating). A file with `method:` is a
  brewing guide: its recipe in the header (`dose`, `water`, optional `temperature`, `time`,
  `grind`), `## ` subheadings and numbered steps in the text, at most `GUIDE_WORDS_MAX` (600)
  words; an article stays plain paragraphs, at most 300. The body is `blocks`
  (`ArticleBlock`). A guide's `icon:` names one of `content/icons.ts` (Lucide), checked like
  `image:` against `content/photos.ts`; `isGuide()` (`lib/data/articles.ts`) tells them apart.

The admin area and visit statistics (2026-10-24):

- **`/osman` is the admin area** (the old `/panel/yonetim` redirects there, `next.config.ts`):
  Özet (`page.tsx`), Atölyeler (`atolyeler/`), Moderasyon (`yonetim/`). Every page renders
  inside `AdminArea` (`osman/admin-area.tsx`), which shows the tabs to an admin and, to
  anyone else, `LoginForm variant="admin"` (e-mail + password, the same browser sign-in,
  then a refresh in place) or "admins only". The address is no secret and the form is no
  lock: the database checks `is_admin()` on every row. The proxy refreshes the session for
  /osman but never redirects there; robots and every page's metadata keep it out of search.
- **People added from the panel** (migration `20261024120000_workshop_admin`): an admin
  inserts with the status chosen (`toAdminApplicationInsert`), into a closed, full or started
  workshop, without the flood limit; the trigger sets `source = 'admin'` (`'form'` for
  everyone else, whatever they send) and keeps one row per contact. `attended` (true / false /
  null) is written by admins only (column grant + the update policy), asked of approved
  people. Old databases read as form rows, unmarked (`readWorkshopAdmin` falls back to the
  first column list; the Zod defaults fill in).
- **Numbers:** a workshop's are derived in TS (`summarizeApplications` in `@espressoir/core`:
  by status, experience and source, fill against the capacity, show rate, per day in the
  site's time zone); the community's come from `admin_community_stats_v1` (admin only; order
  = `COMMUNITY_METRICS`, a test compares). Charts are `BarTable` and `DayColumns`
  (`components/stats`), under the chart rules.
- **Downloads: Excel and PDF, no CSV** (owner's request, 2026-10-24).
  `GET /osman/atolyeler/[id]/xlsx` and `/pdf` (admins, else 404) share `[id]/export.ts`
  (the admin check, approved people first, the columns). The workbook comes from
  `xlsxWorkbook` (`@espressoir/core`, no package: a stored zip of a few XML parts, every
  cell inline text so nothing runs as a formula, the header bold and frozen). The PDF is
  `lib/applications-pdf.ts` on `pdf-lib` + `@pdf-lib/fontkit` (the one place with a package:
  Turkish letters need the site's Archivo embedded, read from `src/assets/fonts`): A4
  landscape, the header row on every page, a box to tick for approved people, page numbers.
- **Applications are answered with buttons** (`setApplicationStatus`, `setAttendance`): one
  submit button per answer (Onayla, Beklet, Yedeğe al, Reddet; the current one is left out),
  each named for the person; "Geldi / Gelmedi" only for approved people, pressed again to
  take the mark back. Works without JavaScript.
- **"Are you coming?" over WhatsApp, answered on a personal page** (migration
  `20261024210000_workshop_rsvp`; owner's choice 2026-10-24: free, sent by hand, no SMS
  provider). Every application has `rsvp_token` (22 URL-safe characters from a UUID's 122
  random bits, `new_rsvp_token()`), `rsvp` ('yes' / 'no' / null, `WORKSHOP_RSVP_ANSWERS`),
  `rsvp_at`, `rsvp_asked_at`, `reminded_at`. For approved people the panel shows the answer
  and two `wa.me` links (`whatsappNumber` in `@espressoir/core`) with the message written
  out: "Teyit sor" (a day before, with the link) and "Hatırlat" (shortly before); opening one
  notes the time (`noteMessageSent`). "Linki kopyala" is for contacts without a phone.
  `/teyit/[token]` (outside `(site)`: per request, `noindex`, disallowed in robots) reads
  `workshop_rsvp_v1` (first name, workshop, status, answer, `can_answer` by the database's
  clock; nothing private) and writes `answer_workshop_rsvp_v1` (approved only, until the
  start, the latest answer wins); both SECURITY DEFINER for anon. Nobody writes the token or
  the answer directly; admins update only the two "sent" times. A "Gelemiyorum" mails the
  owner (`notifyRsvpNo`). The answer is in both downloads (the PDF shows it instead of the
  application time). Read through `readApplications` (`osman/atolyeler/data.ts`), which
  falls back through `WORKSHOP_APPLICATION_SELECTS` on an older database.
- **The application mail** (`lib/workshop-mail.ts`): its subject names the person, its link
  leads to the workshop in the panel. `/osman/atolyeler` says whether it is on (`mailSetup()`)
  and has a "Deneme e-postası gönder" button (`testApplicationMail`, `?tamam=posta`), the way
  to check the Vercel variables once they are set.
- **Google Analytics only after a yes** (`lib/consent.ts`): `ConsentBar` (one line at the
  bottom, "Reddet" and "Kabul et" equal) and `Analytics` (gtag via `next/script`) render only
  when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set; the answer lives in `localStorage`; the
  footer's "Çerez tercihleri" (`ConsentReset`) asks again, and a "no" deletes `_ga` cookies.
  Page changes are counted by GA's history tracking. The overview reads the Data API as a
  service account: a JWT signed with `node:crypto` (no package), five reports in one batch
  plus the workshop pages. Setup: `docs/setup-analytics.md`.
- **Legal sections are linkable by title** (`/gizlilik#cerezler`, slugified).

Brewing assistant, search, quiz and sharing (2026-10-25; owner's choices from a review of
the site, branch `site-yenilikleri`):

- **The brewing assistant** (`BrewAssistant`, under a guide's recipe) scales the recipe to
  the cups the method makes at once and runs a clock through the guide's steps: what to do
  now, where the scale should stand, what comes next. It keeps the screen on while it runs
  (Wake Lock), a phone buzzes at each stage, and an espresso plan is a shot timer that says
  how the shot ran (`shot`: too fast under 20 s, the target 25–30 s, too slow over 35 s). A
  cold brew gets the hours it is ready between instead of a clock. The plans are content
  (`content/demleme.ts`, one per guide slug, its words from the guide); the arithmetic is
  `@espressoir/core` (`brew.ts`). A plan whose dose or water disagrees with the guide's
  recipe, or that names no guide, stops the build (`lib/data/articles.ts`).
- **Search is a page, not a modal** (`/ara`; DESIGN.md has no pop-ups): static, the index
  (articles, coffees, brands, cafés, members) built from the archive and the articles
  (`lib/data/search-index.ts`) and matched in the browser (`search` in `@espressoir/core`:
  folded, every word must match, a word's start counts more, groups ordered by their best
  match). The words stay in the address (`?q=`, `replaceState`), arrow keys walk the
  results. The header's search button (`SearchLink`) and the keys `/` and ⌘K / Ctrl+K open
  it; the button reads no URL (the header is in every static shell: a `usePathname` there
  stopped the build). `noindex`; the home page's `WebSite` data names it as the SearchAction.
  When the archive is split, the index moves with it.
- **The coffee quiz** (`/kahve-testi`): five questions, each answer giving points to methods
  and roasts (`content/kahve-testi.ts`); the winner by `tally` (`@espressoir/core`, ties to
  the earlier in a fixed order). Every method is a guide (a missing one stops the build); what
  it says about roasts and origins comes from `design/icerik.md`. Complete answers live in the
  address (`?c=00014`), so a result can be shared. Options are buttons (a press answers and
  moves on), not radios: arrow keys on a radio group would answer on their own.
- **Sharing:** `ShareButton` opens the phone's share sheet (`navigator.share`) or copies the
  address and says so. Articles have their own share image
  (`bilgi/[slug]/opengraph-image.tsx`: the question, a guide's numbers), the quiz too.
- **Calendars:** `/workshop/<id>/takvim` and `/teyit/<token>/takvim` answer an .ics file
  (`icsCalendar`, UTC times, RFC 5545 folding and escaping, a uid made of the start and the
  title so both files update one entry); `CalendarLinks` shows it beside a Google Calendar
  link (Android's calendar opens no .ics files). The answer page shows them after a "yes".
- **Structured data** (`lib/structured-data.ts`, written by `<JsonLd>`): guides are
  `Recipe` (steps, ingredients, `totalTime` from the plan), articles `Article`, a workshop an
  `Event` with its seats, every such page a `BreadcrumbList`, a coffee still a `Product`.
- **Page transitions** are React's `<ViewTransition>` in `PageTransition` (inside
  `PageShell`): leaving a page, its column fades out while the browser cross-fades to the
  next. Only once hydrated: rendered on the server it would let React's streaming runtime
  start a transition while the first HTML is still arriving, which Chrome refuses with an
  uncaught `InvalidStateError` on every load. Shared-element morphs were tried and dropped:
  the destination's content arrives through `<Suspense>` (params), so no pair ever formed.
  "Reduce motion" turns transitions off (`globals.css`). An automated browser in a hidden
  window holds a transition until it can paint: check transitions with Playwright, not a
  background tab.

- **Not done in 2B, on purpose:** the single `archive` read is still one read. Splitting it
  (see the decisions below) pays off with many writers, not during an invite-only beta, and is
  safer as a change of its own: do it before signup opens to everyone.

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
  - [x] 2B community tastings: pg_trgm coffee search + duplicate warning, rate limits, community
        numbers, follows, `/akis`, profile stats, the single archive read split up.
  - [x] 2C interaction + moderation: comments (one reply level), likes, `/tadim/[id]`, reports,
        admin panel (hide, delete, restrict, review, merge).
  - [x] 2D (owner's addition): invitation screen in the admin panel; the plainer `sade` look
        as default with the original `form` look one menu click away (both replaced by the
        2026-10-23 redesign).
- [x] Phase 3 — social depth. Plan approved 2026-10-13; decisions below. Six steps, each its
      own branch + PR:
  - [x] 3A taste: tag picker in the form, radar chart on a tasting, community profile and most
        used tags on a coffee, a member's palate on their profile.
  - [x] 3B lists: public or private lists of coffees with notes and an order, "Listeye ekle"
        and one-click "Denemek istiyorum" on a coffee's page, list reports in the admin panel.
  - [x] 3C notifications: likes, comments, replies and new followers; the unread count in the
        header; `/bildirimler`.
  - [x] 3D photos: one per tasting (with a small twin for lists) and a profile picture,
        prepared in the browser without EXIF; admins can take them down; `pnpm media:sweep`.
  - [x] 3E home screen and quick form: manifest, icons, shortcuts; recent coffees one tap away,
        last method and device filled in, a save bar within the thumb's reach.
  - [x] 3F cafés (owner's addition, 2026-10-13; decided 2026-10-14): members add cafés (city,
        district, pasted map link) and rate what they drank there; `/kafeler`, a café's page
        with an average per drink, visits on profiles and in the feed; review and merge.
- [x] Phase 4 — recommendations, verified accounts, the mobile app. Plan approved 2026-10-15
      (`~/.claude/plans/soft-hatching-comet.md` on the owner's machine; decisions below). Five
      steps, each its own branch + PR; the next one starts only with the owner's go:
  - [x] 4A recommendations: the site's own model on `/panel/oneriler`, `pnpm export:analytics`
        (pseudonymous CSVs for the owner's Python work), `pnpm import:recommendations`.
  - [x] 4B verified roaster/café accounts: a member applies from the brand's or café's page,
        an admin approves; badge, editing the business page, a badge on their replies;
        an official account cannot score its own coffee or café.
  - [x] 4C app foundation: `apps/mobile` (Expo at first, plain React Native since 2026-10-17), e-mail code sign-in through a
        Turnstile page on the site, browsing coffees, cafés, profiles and suggestions.
  - [x] 4D writing from the app: quick tasting form, café visits, photos resized on the phone,
        `POST /api/arsiv-tazele` so the site shows them at once.
  - [x] 4E social in the app: feed, likes, comments, notifications, own profile, lists.
- [ ] Redesign, workshop and articles (owner's request, 2026-10-23; branch
      `redesign-workshop-info`): the design of `design/DESIGN.md` everywhere on the website
      (the mobile app keeps its own theme for now), `/atolye` with the application form and an
      admin section, `/bilgi` with four articles. Decided with the owner: one date per
      workshop, capacity and price editable in the admin panel, e-mail notification through
      Resend, a KVKK paragraph without a retention period, integer scores (no 0.5 steps).
      Added on the owner's request (2026-10-24): the logo mark, motion, Unsplash photos on
      the home page, the workshop cover and the articles; then (branch `osman-admin`) the
      admin area at `/osman` behind e-mail + password, people added to workshops from the
      panel, attendance, downloads, workshop and community numbers, and Google Analytics behind a
      consent bar, with its numbers on the overview. Then (branch `bilgi-rehberleri`,
      2026-10-24): the home page leads with coffee knowledge, seven brewing guides and three
      articles with photos, topics on `/bilgi`, the menu Bilgi · Tadım notları · Atölye,
      `/workshop` and Kahve 101, a phone-only form, questions that open and close, and the
      admin's Atölyeler shortcut. Then (branch `site-yenilikleri`, 2026-10-25, after a review
      of the site with the owner): the brewing assistant on every guide, search (`/ara`), the
      coffee quiz, share images and a share button, workshop calendar files, structured data,
      page transitions, and unused code removed. Then (branch `bilgi-icerik`, 2026-10-25,
      the owner's picks from twenty ideas): eighteen more pieces with photos — five guides
      with assistant plans (filter machine, Chemex, Kalita Wave, Japanese iced coffee,
      siphon), the capsule machine, espresso drinks, the coffee bag, processing, origins,
      single origin and blends, decaf, tasting, flavour notes, extraction, caffeine, first
      equipment, coffee cultures — and the `tadim` topic. Then (branch `defter-tasarimi`,
      2026-10-28, from the owner's UI/UX brief): the Warm Cream / Espresso / Burnt Copper /
      Sage palette and a warmer dark theme, Fraunces + Manrope (no monospace), the notebook-
      first home page with a sample entry, the Keşfet menu, the members' phone tab bar and
      "Tadım ekle" in the header, a grouped footer, the catalog's search-first filters with
      removable chips, "Tadım ekle" on a coffee's page, `/bilgi` as a hub (search, topics, a
      featured guide), a scannable recipe box with the ratio, the timeline's months-with-
      tastings view, empty states and retries, the About page in five parts, clearer legal
      pages, and `docs/launch-checklist.md` for what the owner still has to supply.

Decisions made with the owner: repo goes private (backups as encrypted Actions artifacts);
email + password login in Phase 1; React Native for mobile (hence the monorepo; Expo until 2026-10-17); CI tests run on an
ephemeral Supabase on the GitHub runner instead of the cloud dev project.

Phase 2 decisions (owner-approved; they become conventions as each step lands):

- **Try on dev first:** a dev Supabase project feeds Vercel Preview; prod sees a change after it.
- **Invite-only beta:** Supabase signup stays closed, invitations go out from the admin panel
  (or the local script).
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
- **Account deletion and data export are RPCs**, so they need no secret key.

Phase 3 decisions (owner-approved 2026-10-13):

- **Order:** 3A → 3E as listed, then 3F. **Cafés:** a separate section (not the coffee
  catalog), city + district + optional map link (no map service), every member adds them under
  the coffee rules, shown on `/kafeler`, café pages, profiles and the feed only.
- **Photos:** one per tasting plus an avatar, resized and
  re-encoded in the browser (which drops EXIF), storage rules as RLS, no secret key.
  **PWA:** home screen + quick form, no service worker, no offline. **No Notion sync.**
- **"Want to try" stays the `wishlist` tasting status**; lists are a separate feature.
- **Notifications are made by database triggers**, read on page change; no realtime, no e-mail.
- **The single archive read is still not split** in Phase 3; see the size warning above.

Phase 4 decisions (owner-approved 2026-10-15):

- **Order:** the brief's Phase 4 first (recommendations + export, verified accounts), then the
  mobile app. **No English UI** in this phase.
- **Recommendations:** an explainable model on the site, a pseudonymous export, and an import
  for the owner's own model. **Verified accounts:** badge and link, editing the business page,
  a badge on replies, members apply and the owner approves.
- **The app is built locally with Xcode and installed by cable** (free; no store, no push, no Google sign-in; Expo Go until 2026-10-17). First
  version: adding tastings and café visits, browsing, feed/likes/comments/notifications,
  profile and lists.

Still open on the owner's side (remind, don't do for them):

- **`docs/launch-checklist.md`** lists what the code cannot supply (contact address, legal
  review, the workshop's real date, price and the 2 h program vs. 2,5 h slot, backups,
  CAPTCHA). Keep it current; never fill those gaps with invented values.

- **Apply each step's migration before merging its PR** (`pnpm db:push:dev`, then
  `db:push:prod`). 4C has none. The workshop migrations (`20261023120000_workshops`,
  `20261024120000_workshop_admin`, `20261024180000_kahve_101`, `20261024210000_workshop_rsvp`)
  are on dev and prod (2026-10-24).
- Google Analytics: the property, the service account and four Vercel variables
  (`docs/setup-analytics.md`); until then no consent bar and no visits on /osman.
- Workshop: set the real date, price and place in `/osman` → Atölyeler (the first row holds
  placeholders); for the e-mail, `RESEND_API_KEY` (Secret) and `WORKSHOP_NOTIFY_EMAIL` on
  Vercel (docs/deploy-vercel.md). After any branch switch, look for iCloud's
  ` 2` copies first (`git status`). The owner has merged before migrating three times, and
  once with a red check: say both plainly in every PR.

- Done, for the record (2026-10-13): every migration is on dev and prod; sign-in setup on both
  projects (redirect URLs, Resend SMTP, templates, Turnstile); `SUPABASE_SECRET_KEY` is on
  Vercel **Production** and the invitation screen is in use on the live site; Preview builds
  have the dev project's public variables.
- Optional: the dev secret key on Vercel **Preview** (until then previews say the invitation
  key is missing, which is harmless); Google sign-in.
- Make the repo private, then add the backup secrets (docs/backup.md). The scheduled backup
  runs and fails without `PROD_DB_URL` and `BACKUP_PASSPHRASE`; the keepalive workflow works.
  Prod has no backups yet: **nobody outside the owner's own addresses is invited before that.**
- Have the KVKK texts reviewed and fill in the contact address (`CONTACT` in `legal-tr.ts`);
  signup stays closed to the public until then.
- `www.espressoir.com` serves the site instead of redirecting to the apex: set it to redirect
  in Vercel → Domains.
- **CAPTCHA:** the owner asked (2026-10-17) to drop the robot check from the app, where it
  hung. Protection is per Supabase project, so dropping it is the owner's switch on prod
  (docs/setup-auth.md §5) and covers the website too. Acceptable while signup is closed (no
  code goes to an address without an account; Supabase limits sign-ins per IP). **Turn it on
  again before signup opens**, and try the app's sheet on a phone then.

Phase 1 choices worth knowing: `comments`, `likes` and `reports` tables wait for Phase 2 (only
`follows` exists now, because the "followers" visibility needs it); catalog inserts are open to
any signed-in user and must get rate limits/duplicate checks before signup opens; the owner's
Notion export is not committed (tests and CI use `scripts/notion/fixtures/sample-export.csv`).
