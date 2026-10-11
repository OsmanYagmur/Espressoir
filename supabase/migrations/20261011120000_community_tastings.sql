-- Tastings from many people: finding a coffee before adding a new one, marking coffees
-- nobody has checked yet, limits on how fast one account can write, and the feed of the
-- people one follows.
-- Rollback: supabase/rollbacks/20261011120000_community_tastings.down.sql

-- ── finding a coffee ────────────────────────────────────────────────────────────────────
-- "Brand + coffee" folded for matching ("Kahve Dünyası Explore Colombia" ->
-- "kahve dunyasi explore colombia"), kept on the coffee so one trigram index serves both
-- the search box and the duplicate check.
alter table public.coffees add column search_text text not null default '';

create function public.coffee_search_text(p_brand_id uuid, p_name text)
returns text
language sql
stable
set search_path = ''
as $$
  select public.fold_tr(b.name || ' ' || p_name)
  from public.brands b
  where b.id = p_brand_id
$$;

create function public.set_coffee_search_text()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search_text := coalesce(public.coffee_search_text(new.brand_id, new.name), '');
  return new;
end
$$;

-- Named to run after coffees_prepare (triggers fire in name order), which tidies the name.
create trigger coffees_search_text
  before insert or update of name, brand_id on public.coffees
  for each row execute function public.set_coffee_search_text();

-- A brand that is renamed takes its coffees' search text along.
create function public.refresh_brand_search_text()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.coffees c
  set search_text = public.fold_tr(new.name || ' ' || c.name)
  where c.brand_id = new.id;
  return null;
end
$$;

create trigger brands_refresh_search_text
  after update of name on public.brands
  for each row
  when (old.name is distinct from new.name)
  execute function public.refresh_brand_search_text();

update public.coffees c
set search_text = public.fold_tr(b.name || ' ' || c.name)
from public.brands b
where b.id = c.brand_id;

create index coffees_search_text_trgm_idx
  on public.coffees using gin (search_text extensions.gin_trgm_ops);

-- ── reviewed coffees ────────────────────────────────────────────────────────────────────
-- A coffee added by a member is public at once but unreviewed until an admin has looked at
-- it. Everything that existed before this step was entered by the owner.
alter table public.coffees
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references public.profiles (id) on delete set null;

update public.coffees set reviewed_at = created_at where reviewed_at is null;

-- Members cannot mark their own additions as reviewed: the mark is set here, from who is
-- asking. Scripts (no API user) and admins add reviewed coffees.
create function public.set_coffee_review_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or public.is_admin() then
    new.reviewed_at := coalesce(new.reviewed_at, now());
    new.reviewed_by := coalesce(new.reviewed_by, (select auth.uid()));
  else
    new.reviewed_at := null;
    new.reviewed_by := null;
  end if;
  return new;
end
$$;

revoke all on function public.set_coffee_review_state() from public, anon, authenticated;

create trigger coffees_review_state
  before insert on public.coffees
  for each row execute function public.set_coffee_review_state();

-- The list read model gains the flag (new columns can only be appended to a view).
create or replace view public.coffee_overview
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
  s.brew_method_slugs,
  (c.reviewed_at is not null) as is_reviewed
from public.coffees c
join public.brands b on b.id = c.brand_id
join public.coffee_stats s on s.coffee_id = c.id;

-- Coffees that resemble what someone typed, best match first: the search box of the
-- tasting form and the "is this already here?" check before a new coffee is added.
-- Matching ignores case, accents and Turkish letter variants, and tolerates typos.
create function public.search_coffees_v1(p_query text, p_limit integer default 8)
returns table (
  coffee_id uuid,
  coffee_slug text,
  coffee_name text,
  brand_id uuid,
  brand_slug text,
  brand_name text,
  form public.coffee_form,
  is_reviewed boolean,
  similarity real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select btrim(regexp_replace(public.fold_tr(coalesce(p_query, '')), '\s+', ' ', 'g')) as text
  ),
  scored as (
    select
      c.id, c.slug, c.name, c.form, c.reviewed_at, c.brand_id,
      greatest(
        extensions.similarity(c.search_text, q.text),
        extensions.word_similarity(q.text, c.search_text)
      ) as score,
      position(q.text in c.search_text) > 0 as contains
    from public.coffees c, q
    where char_length(q.text) >= 2
  )
  select
    s.id, s.slug, s.name, b.id, b.slug, b.name, s.form,
    s.reviewed_at is not null,
    s.score::real
  from scored s
  join public.brands b on b.id = s.brand_id
  where s.contains or s.score >= 0.35
  order by s.contains desc, s.score desc, b.name, s.name
  limit least(greatest(coalesce(p_limit, 8), 1), 25)
$$;

comment on function public.search_coffees_v1 is
  'Coffees whose brand + name resemble the query (trigram similarity), best match first.';

revoke all on function public.search_coffees_v1 from public;
grant execute on function public.search_coffees_v1 to anon, authenticated, service_role;

-- ── rate limits ─────────────────────────────────────────────────────────────────────────
-- The browser writes to these tables directly, so the only limit that holds is one the
-- database keeps. Usage: execute function enforce_rate_limit('<owner column>', '<max>',
-- '<interval>'). Counts the caller's rows created in the window; scripts and admins are
-- exempt. SECURITY DEFINER so the count does not depend on what RLS lets the caller see.
create function public.enforce_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_recent integer;
begin
  if v_user_id is null or public.is_admin() then
    return new;
  end if;

  execute format(
    'select count(*) from %I.%I where %I = $1 and created_at > now() - $2::interval',
    tg_table_schema, tg_table_name, tg_argv[0]
  )
  into v_recent
  using v_user_id, tg_argv[2];

  if v_recent >= tg_argv[1]::integer then
    raise exception 'rate_limited'
      using errcode = 'P0001', detail = tg_table_name, hint = tg_argv[1] || ' / ' || tg_argv[2];
  end if;
  return new;
end
$$;

revoke all on function public.enforce_rate_limit() from public, anon, authenticated;

create trigger tastings_rate_limit
  before insert on public.tastings
  for each row execute function public.enforce_rate_limit('user_id', '30', '1 day');
create trigger coffees_rate_limit
  before insert on public.coffees
  for each row execute function public.enforce_rate_limit('created_by', '5', '1 day');
create trigger brands_rate_limit
  before insert on public.brands
  for each row execute function public.enforce_rate_limit('created_by', '3', '1 day');
create trigger follows_rate_limit
  before insert on public.follows
  for each row execute function public.enforce_rate_limit('follower_id', '200', '1 day');

-- ── feeds ───────────────────────────────────────────────────────────────────────────────
-- "Everyone": newest entries first, public and logged only.
create index tastings_public_feed_idx
  on public.tastings (created_at desc, id desc)
  where visibility = 'public' and status = 'logged';

-- "People I follow": the same rows as tasting_feed, narrowed to authors the caller follows.
-- RLS still decides what is visible, so followers-only tastings appear here and nowhere else.
create view public.following_feed
with (security_invoker = true)
as
select f.*
from public.tasting_feed f
where f.status = 'logged'
  and exists (
    select 1 from public.follows w
    where w.follower_id = (select auth.uid()) and w.following_id = f.user_id
  );

comment on view public.following_feed is
  'Logged tastings by the people the calling user follows, as visible to that user.';

revoke all on table public.following_feed from anon, authenticated;
grant select on table public.following_feed to authenticated, service_role;
