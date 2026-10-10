-- Tastings: one person's experience with one coffee, plus the follow graph that the
-- "followers" visibility level depends on, and the read models the apps query.
-- Rollback: supabase/rollbacks/20261010133200_tastings.down.sql

create type public.tasting_status as enum ('logged', 'wishlist');
create type public.tasting_visibility as enum ('public', 'followers', 'private');
create type public.tasting_source as enum ('web', 'notion_import');

-- ── follows ─────────────────────────────────────────────────────────────────────────────
create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_not_self check (follower_id <> following_id)
);

create index follows_following_id_idx on public.follows (following_id);

-- ── tastings ────────────────────────────────────────────────────────────────────────────
create table public.tastings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  coffee_id uuid not null references public.coffees (id) on delete restrict,
  brew_method_id uuid references public.brew_methods (id) on delete restrict,
  -- Free text: "Nespresso C30", "Wacaco NS2".
  device text,
  score smallint,
  tasted_at date,
  -- Plain text. Always rendered escaped, never as HTML or markdown.
  notes text,
  status public.tasting_status not null default 'logged',
  visibility public.tasting_visibility not null default 'public',
  -- Optional taste profile, each 1 (low) to 5 (high).
  body smallint,
  acidity smallint,
  bitterness smallint,
  sweetness smallint,
  aftertaste smallint,
  would_buy_again boolean,
  -- Turkish lira; a currency column joins it when another currency is needed.
  price_paid numeric(10, 2),
  source public.tasting_source not null default 'web',
  -- Identifies the original row for imports, so re-running an import never duplicates.
  source_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tastings_score_range check (score between 1 and 10),
  constraint tastings_device_length check (char_length(device) between 1 and 60),
  constraint tastings_notes_length check (char_length(notes) between 1 and 4000),
  constraint tastings_body_range check (body between 1 and 5),
  constraint tastings_acidity_range check (acidity between 1 and 5),
  constraint tastings_bitterness_range check (bitterness between 1 and 5),
  constraint tastings_sweetness_range check (sweetness between 1 and 5),
  constraint tastings_aftertaste_range check (aftertaste between 1 and 5),
  constraint tastings_price_paid_range check (price_paid >= 0),
  -- A wishlist entry is a coffee not tasted yet: it cannot carry a score or a date.
  constraint tastings_wishlist_is_blank
    check (status = 'logged' or (score is null and tasted_at is null)),
  constraint tastings_source_ref_matches_source
    check ((source = 'web') = (source_ref is null))
);

create index tastings_coffee_id_idx on public.tastings (coffee_id);
create index tastings_user_recent_idx on public.tastings (user_id, tasted_at desc nulls last);
create index tastings_brew_method_id_idx on public.tastings (brew_method_id);
create index tastings_public_recent_idx
  on public.tastings (tasted_at desc nulls last, created_at desc)
  where visibility = 'public' and status = 'logged';
create unique index tastings_source_ref_key
  on public.tastings (user_id, source, source_ref)
  where source_ref is not null;
create unique index tastings_one_wishlist_per_coffee_key
  on public.tastings (user_id, coffee_id)
  where status = 'wishlist';

create trigger tastings_set_updated_at
  before update on public.tastings
  for each row execute function public.set_updated_at();

-- ── tasting ↔ flavor tags ───────────────────────────────────────────────────────────────
create table public.tasting_flavor_tags (
  tasting_id uuid not null references public.tastings (id) on delete cascade,
  flavor_tag_id uuid not null references public.flavor_tags (id) on delete cascade,
  primary key (tasting_id, flavor_tag_id)
);

create index tasting_flavor_tags_flavor_tag_id_idx on public.tasting_flavor_tags (flavor_tag_id);

-- ── access ──────────────────────────────────────────────────────────────────────────────
alter table public.follows enable row level security;
alter table public.tastings enable row level security;
alter table public.tasting_flavor_tags enable row level security;

revoke all on table public.follows, public.tastings, public.tasting_flavor_tags
  from anon, authenticated;
grant select on table public.follows, public.tastings, public.tasting_flavor_tags
  to anon, authenticated;
grant insert, delete on table public.follows, public.tastings, public.tasting_flavor_tags
  to authenticated;
-- Owner, provenance and timestamps of a tasting can never be rewritten through the API.
grant update (
  coffee_id, brew_method_id, device, score, tasted_at, notes, status, visibility,
  body, acidity, bitterness, sweetness, aftertaste, would_buy_again, price_paid
) on table public.tastings to authenticated;
grant all on table public.follows, public.tastings, public.tasting_flavor_tags to service_role;

-- Who follows whom is public, like on Letterboxd. You can only follow or unfollow as yourself.
create policy follows_select_all on public.follows
  for select to anon, authenticated using (true);
create policy follows_insert_own on public.follows
  for insert to authenticated with check (follower_id = (select auth.uid()));
create policy follows_delete_own on public.follows
  for delete to authenticated using (follower_id = (select auth.uid()));

-- Reading a tasting: public ones for everyone, your own always, "followers" ones when you
-- follow the author, and everything for admins (moderation).
create policy tastings_select_public on public.tastings
  for select to anon, authenticated
  using (visibility = 'public');
create policy tastings_select_own on public.tastings
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy tastings_select_followers on public.tastings
  for select to authenticated
  using (
    visibility = 'followers'
    and exists (
      select 1 from public.follows f
      where f.follower_id = (select auth.uid()) and f.following_id = tastings.user_id
    )
  );
create policy tastings_select_admin on public.tastings
  for select to authenticated
  using ((select public.is_admin()));

-- Writing: only your own rows, and only as web entries (imports run with the service role).
create policy tastings_insert_own on public.tastings
  for insert to authenticated
  with check (user_id = (select auth.uid()) and source = 'web');
create policy tastings_update_own on public.tastings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy tastings_delete_own on public.tastings
  for delete to authenticated
  using (user_id = (select auth.uid()));
create policy tastings_update_admin on public.tastings
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy tastings_delete_admin on public.tastings
  for delete to authenticated
  using ((select public.is_admin()));

-- Tags follow their tasting: visible when the tasting is (the subquery is itself filtered
-- by the tastings policies), editable by the tasting's author.
create policy tasting_flavor_tags_select_visible on public.tasting_flavor_tags
  for select to anon, authenticated
  using (exists (select 1 from public.tastings t where t.id = tasting_id));
create policy tasting_flavor_tags_insert_own on public.tasting_flavor_tags
  for insert to authenticated
  with check (
    exists (
      select 1 from public.tastings t
      where t.id = tasting_id and t.user_id = (select auth.uid())
    )
  );
create policy tasting_flavor_tags_delete_own on public.tasting_flavor_tags
  for delete to authenticated
  using (
    exists (
      select 1 from public.tastings t
      where t.id = tasting_id and t.user_id = (select auth.uid())
    )
  );

-- ── read models ─────────────────────────────────────────────────────────────────────────
-- All views run with the caller's rights (security_invoker), so RLS still applies.

-- Community numbers per coffee. Only public, logged tastings count, whoever is asking:
-- a coffee's score must not change depending on who looks at it.
create view public.coffee_stats
with (security_invoker = true)
as
select
  c.id as coffee_id,
  count(t.id)::integer as tasting_count,
  count(t.score)::integer as rated_count,
  round(avg(t.score), 2) as avg_score,
  array[
    count(*) filter (where t.score = 1),
    count(*) filter (where t.score = 2),
    count(*) filter (where t.score = 3),
    count(*) filter (where t.score = 4),
    count(*) filter (where t.score = 5),
    count(*) filter (where t.score = 6),
    count(*) filter (where t.score = 7),
    count(*) filter (where t.score = 8),
    count(*) filter (where t.score = 9),
    count(*) filter (where t.score = 10)
  ]::integer[] as score_distribution,
  min(t.tasted_at) as first_tasted_at,
  max(t.tasted_at) as last_tasted_at,
  coalesce(array_agg(distinct m.slug) filter (where m.slug is not null), '{}') as brew_method_slugs
from public.coffees c
left join public.tastings t
  on t.coffee_id = c.id and t.visibility = 'public' and t.status = 'logged'
left join public.brew_methods m on m.id = t.brew_method_id
group by c.id;

comment on view public.coffee_stats is
  'Per-coffee totals from public, logged tastings: counts, average and score distribution (index 1 = score 1).';

-- One flat row per coffee with its brand and numbers: what lists and cards need.
create view public.coffee_overview
with (security_invoker = true)
as
select
  c.id as coffee_id,
  c.slug as coffee_slug,
  c.name as coffee_name,
  c.form,
  c.capsule_system,
  c.brand_intensity,
  c.origin_country,
  c.region,
  c.process,
  c.roast_level,
  c.is_blend,
  c.description,
  c.image_url,
  c.created_at,
  b.id as brand_id,
  b.slug as brand_slug,
  b.name as brand_name,
  s.tasting_count,
  s.rated_count,
  s.avg_score,
  s.score_distribution,
  s.first_tasted_at,
  s.last_tasted_at,
  s.brew_method_slugs
from public.coffees c
join public.brands b on b.id = c.brand_id
join public.coffee_stats s on s.coffee_id = c.id;

-- One flat row per tasting with everything needed to show it in a list or a feed.
create view public.tasting_feed
with (security_invoker = true)
as
select
  t.id as tasting_id,
  t.status,
  t.visibility,
  t.score,
  t.tasted_at,
  t.notes,
  t.device,
  t.body,
  t.acidity,
  t.bitterness,
  t.sweetness,
  t.aftertaste,
  t.would_buy_again,
  t.created_at,
  p.id as user_id,
  p.username,
  p.display_name,
  c.id as coffee_id,
  c.slug as coffee_slug,
  c.name as coffee_name,
  c.form,
  c.brand_intensity,
  c.origin_country,
  b.id as brand_id,
  b.slug as brand_slug,
  b.name as brand_name,
  m.slug as brew_method_slug,
  m.name as brew_method_name,
  m.category as brew_category
from public.tastings t
join public.profiles p on p.id = t.user_id
join public.coffees c on c.id = t.coffee_id
join public.brands b on b.id = c.brand_id
left join public.brew_methods m on m.id = t.brew_method_id;

revoke all on table public.coffee_stats, public.coffee_overview, public.tasting_feed
  from anon, authenticated;
grant select on table public.coffee_stats, public.coffee_overview, public.tasting_feed
  to anon, authenticated, service_role;
