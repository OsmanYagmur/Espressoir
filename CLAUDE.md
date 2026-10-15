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
                             /u/[username]/liste/[slug],
                             /akis, /tadim/[id], /kvkk, /gizlilik, /kosullar)
apps/web/src/app/(account)/  /giris, /panel, /panel/listeler, /panel/yonetim (admin), /hesap,
                             /hesap/kurulum, /bildirimler
                             (dynamic; session read behind <Suspense>)
apps/web/src/app/auth/       /auth/callback (route: code exchange), /auth/confirm (link → one click)
apps/web/src/app/            root layout, 404/error/loading, icon, sitemap, robots, OG image
apps/web/src/proxy.ts        session refresh + redirects, matcher = /panel/*, /hesap/*,
                             /bildirimler, /giris only
apps/web/src/components/     ui/, site/ (chrome, legal page), coffee/, stats/ (charts),
                             panel/ (forms, coffee picker), account/ (header link, Turnstile,
                             form message), social/ (follow, feed, like, comments, report)
apps/web/src/lib/            auth.ts (requireUser/requireSession), auth-config.ts (public switches),
                             session-cookie.ts (useHasSession: "is someone signed in?" for islands)
apps/web/src/lib/data/       archive.ts (the one cached read), selectors.ts (pure views)
apps/web/e2e/                archive.spec (public, sample data) · panel.spec, account.spec,
                             community.spec, moderation.spec (need Supabase + its mail catcher)
                             · helpers.ts
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
- Charts are server-rendered HTML/CSS (no chart library): one ink series, value labels, a table
  twin under each, `n` beside every mean, n < 3 faded + hollow + tagged (`SMALL_SAMPLE`).
- Client components shared with the server must not format with `Intl` (hydration); prepare
  display strings on the server (`lib/coffee-cards.ts`).
- `new Date()`/`Math.random()` in server components only inside `'use cache'` (with `cacheLife`).
- **One secret at app runtime, for one screen.** `SUPABASE_SECRET_KEY` is read only by
  `lib/supabase/admin.ts` (`server-only`), only for the invitation screen's Auth admin calls,
  only after `requireAdmin()` (owner-approved exception, 2D). Never use that client on the app's
  own tables; everything else still runs with the publishable key and the caller's session.
  Vercel holds it as a **Secret** (prod key on Production, dev key on Preview); the public
  values are **Config** variables (a `NEXT_PUBLIC_` name cannot be a Vercel Secret).
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
- **Two looks over that design, same markup** (2D; the owner found the form hard to read but
  wants it kept): `sade` (default) and `form` (the original, untouched), on `<html data-look>`.
  Style with the `sade:` / `form:` variants; what only one look shows is hidden in the other
  (`form:hidden`, `sade:hidden`). Sade's three rules: links in the content are underlined in the
  accent (opt out with `data-plain` or a `Button`), a page says what it is for (the `lead` of
  `PageHeading`, the `hint` of `SectionHeading`), the main thing outweighs its details. The choice is per browser
  (`localStorage`, applied before paint by `LOOK_SCRIPT`; `lib/look.ts`), switched from the
  header menu. **A change to the form look needs the owner's say-so**; new pages must read well
  in both.
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
- **The sign-in code's length is the Supabase project's setting** (8 digits on the cloud
  projects, 6 in the local stack): the form accepts 6–10 and no copy states a number.
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
- **An invited address has no account until the invitation is accepted**, and the auth server
  treats an unconfirmed user as a signup: while signup is closed it sends them no sign-in code.
  An invitation that ran out (one hour) is replaced by running `pnpm user:invite` again.
- `requireUser()` sends signed-out visitors to `/giris` and members without a username to
  `/hesap/kurulum`; `requireSession()` is for the onboarding page only. The test helper
  `createUser()` returns onboarded users unless told `onboarded: false`.
- **The header's account link reads the session cookie**, nothing else: public pages must not
  pull in the Supabase client.
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
  `log_admin_action()`. The panel (`/panel/yonetim`) is plain forms and Server Actions that
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

- **Panel → Yönetim → Davetler** sends, re-sends and withdraws invitations with Supabase's Auth
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
- **`Radar` (`components/stats/radar.tsx`)** is server-rendered SVG under the chart rules: every
  corner prints its value (and `n` for a mean), small samples are hollow and faded, a table twin
  sits underneath, and the SVG's label spells the numbers out. Fewer than three corners
  (`hasRadarShape`) render as a list instead.
- **Tags inside a tasting are a sentence, not a list** (`FlavorTags`): a tasting is already a
  list item, and nested items would be counted with it (tests, screen readers).
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
- **No open connection.** The header's bell (`NotificationLink`) shows only to browsers with a
  session cookie, loads the Supabase client on demand and counts unread rows on every page
  change and when the tab comes back into view. `/bildirimler` marks what it shows as read
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
- **Icons are plain PNG files** (`public/icons/`, drawn once; how is in its README), so they
  cost nothing to serve. Maskable keeps the square inside the middle 80 %.
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
        as default with the original `form` look one menu click away.
- [ ] Phase 3 — social depth. Plan approved 2026-10-13 (`~/.claude/plans/soft-hatching-comet.md`
      on the owner's machine; decisions below). Five steps, each its own branch + PR; the next
      one starts only with the owner's go:
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
- [ ] Phase 4+ Expo app.

Decisions made with the owner: repo goes private (backups as encrypted Actions artifacts);
email + password login in Phase 1; Expo for mobile (hence the monorepo); CI tests run on an
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

Still open on the owner's side (remind, don't do for them):

- **Apply each step's migration before merging its PR** (`pnpm db:push:dev`, then
  `db:push:prod`). 3F's is `20261016090000_cafes`: without it the café pages are empty and
  adding a visit fails (everything else works). After any branch switch, look for iCloud's
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

Phase 1 choices worth knowing: `comments`, `likes` and `reports` tables wait for Phase 2 (only
`follows` exists now, because the "followers" visibility needs it); catalog inserts are open to
any signed-in user and must get rate limits/duplicate checks before signup opens; the owner's
Notion export is not committed (tests and CI use `scripts/notion/fixtures/sample-export.csv`).
