-- Flavour tags on tastings (Phase 3A). The tag list and the link table exist since the
-- first schema; this adds what members need to use them: the posting rule, a cap, and
-- functions that write a tasting together with its tags. Reads get the tags on tasting_feed.
-- Rollback: supabase/rollbacks/20261013180000_flavor_tags_on_tastings.down.sql

-- ── who may tag, and how much ───────────────────────────────────────────────────────────
-- Like every other write: only an onboarded member who is not restricted.
alter policy tasting_flavor_tags_insert_own on public.tasting_flavor_tags
  with check (
    (select public.can_post())
    and exists (
      select 1 from public.tastings t
      where t.id = tasting_id and t.user_id = (select auth.uid())
    )
  );

-- At most five tags per tasting (FLAVOR_TAGS_MAX in @espressoir/core): a profile, not a
-- word cloud. A wishlist entry has not been tasted, so it carries none.
create function public.check_tasting_flavor_tag()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status public.tasting_status;
begin
  select t.status into v_status from public.tastings t where t.id = new.tasting_id;
  if v_status = 'wishlist' then
    raise exception 'wishlist_has_no_tags' using errcode = '23514';
  end if;
  if (
    select count(*) from public.tasting_flavor_tags x where x.tasting_id = new.tasting_id
  ) >= 5 then
    raise exception 'too_many_flavor_tags' using errcode = '23514';
  end if;
  return new;
end
$$;

create trigger tasting_flavor_tags_check
  before insert on public.tasting_flavor_tags
  for each row execute function public.check_tasting_flavor_tag();

-- A tasting turned back into a wishlist entry loses its tags, whoever makes the change.
create function public.clear_tags_of_wishlist_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.tasting_flavor_tags x where x.tasting_id = new.id;
  return null;
end
$$;

create trigger tastings_wishlist_drops_tags
  after update of status on public.tastings
  for each row
  when (new.status = 'wishlist' and old.status is distinct from new.status)
  execute function public.clear_tags_of_wishlist_entry();

revoke all on function public.check_tasting_flavor_tag, public.clear_tags_of_wishlist_entry
  from public, anon, authenticated;

-- ── writing the tags of a tasting ───────────────────────────────────────────────────────
-- Replaces the whole set in one transaction: what is not in the list goes, what is new is
-- added. Runs with the caller's rights, so RLS still decides (own tasting, may post).
create function public.set_tasting_tags_v1(p_tasting_id uuid, p_slugs text[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_slugs text[];
  v_ids uuid[];
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select coalesce(array_agg(distinct lower(btrim(raw))), '{}'::text[]) into v_slugs
  from unnest(coalesce(p_slugs, '{}'::text[])) as raw
  where btrim(raw) <> '';

  if cardinality(v_slugs) > 5 then
    raise exception 'too_many_flavor_tags' using errcode = '23514';
  end if;

  select coalesce(array_agg(f.id), '{}'::uuid[]) into v_ids
  from public.flavor_tags f
  where f.slug = any (v_slugs);
  if cardinality(v_ids) <> cardinality(v_slugs) then
    raise exception 'flavor_tag_not_found' using errcode = 'P0002';
  end if;

  -- RLS would turn someone else's tasting into a silent no-op: say so instead.
  if not exists (
    select 1 from public.tastings t where t.id = p_tasting_id and t.user_id = v_user_id
  ) then
    raise exception 'tasting_not_found' using errcode = 'P0002';
  end if;

  delete from public.tasting_flavor_tags x
  where x.tasting_id = p_tasting_id and not (x.flavor_tag_id = any (v_ids));

  -- Only what is missing: the cap counts rows before each insert.
  insert into public.tasting_flavor_tags (tasting_id, flavor_tag_id)
  select p_tasting_id, wanted.id
  from unnest(v_ids) as wanted(id)
  where not exists (
    select 1 from public.tasting_flavor_tags x
    where x.tasting_id = p_tasting_id and x.flavor_tag_id = wanted.id
  );
end
$$;

comment on function public.set_tasting_tags_v1 is
  'Sets the flavour tags of one of the caller''s tastings to exactly the given slugs.';

revoke all on function public.set_tasting_tags_v1 from public, anon;
grant execute on function public.set_tasting_tags_v1 to authenticated, service_role;

-- ── log_tasting_v2: v1 plus the tags ────────────────────────────────────────────────────
-- Same parameters and result as v1 (which stays for clients that still call it), one more
-- argument. Both steps run in the caller's transaction: a refused tag undoes the tasting.
create function public.log_tasting_v2(
  -- Either an existing coffee…
  p_coffee_id uuid default null,
  -- …or a brand and coffee name. Both are matched against the catalog first (ignoring
  -- case, accents and apostrophes, and the brand's aliases) and created only when new.
  p_brand_name text default null,
  p_coffee_name text default null,
  -- Used only when the coffee is created here; an existing coffee is never modified.
  p_form public.coffee_form default null,
  p_capsule_system public.capsule_system default null,
  p_brand_intensity smallint default null,
  p_origin_country text default null,
  -- The tasting itself.
  p_brew_method_slug text default null,
  p_device text default null,
  p_score smallint default null,
  p_tasted_at date default null,
  p_notes text default null,
  p_status public.tasting_status default 'logged',
  p_visibility public.tasting_visibility default 'public',
  p_body smallint default null,
  p_acidity smallint default null,
  p_bitterness smallint default null,
  p_sweetness smallint default null,
  p_aftertaste smallint default null,
  p_would_buy_again boolean default null,
  p_price_paid numeric default null,
  -- Slugs from flavor_tags; at most five.
  p_flavor_tag_slugs text[] default null
)
returns table (tasting_id uuid, coffee_id uuid, brand_slug text, coffee_slug text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_logged record;
begin
  select l.tasting_id, l.coffee_id, l.brand_slug, l.coffee_slug into v_logged
  from public.log_tasting_v1(
    p_coffee_id => p_coffee_id,
    p_brand_name => p_brand_name,
    p_coffee_name => p_coffee_name,
    p_form => p_form,
    p_capsule_system => p_capsule_system,
    p_brand_intensity => p_brand_intensity,
    p_origin_country => p_origin_country,
    p_brew_method_slug => p_brew_method_slug,
    p_device => p_device,
    p_score => p_score,
    p_tasted_at => p_tasted_at,
    p_notes => p_notes,
    p_status => p_status,
    p_visibility => p_visibility,
    p_body => p_body,
    p_acidity => p_acidity,
    p_bitterness => p_bitterness,
    p_sweetness => p_sweetness,
    p_aftertaste => p_aftertaste,
    p_would_buy_again => p_would_buy_again,
    p_price_paid => p_price_paid
  ) l;

  if cardinality(coalesce(p_flavor_tag_slugs, '{}'::text[])) > 0 then
    perform public.set_tasting_tags_v1(v_logged.tasting_id, p_flavor_tag_slugs);
  end if;

  return query
    select v_logged.tasting_id, v_logged.coffee_id, v_logged.brand_slug, v_logged.coffee_slug;
end
$$;

comment on function public.log_tasting_v2 is
  'log_tasting_v1 plus the tasting''s flavour tags, in one transaction.';

revoke all on function public.log_tasting_v2 from public, anon;
grant execute on function public.log_tasting_v2 to authenticated, service_role;

-- ── reads ───────────────────────────────────────────────────────────────────────────────
-- Two new columns at the end; everything before them is unchanged.
create or replace view public.tasting_feed
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
  m.category as brew_category,
  (select count(*) from public.likes l where l.tasting_id = t.id)::integer as like_count,
  (
    select count(*) from public.comments k
    where k.tasting_id = t.id and k.deleted_at is null and k.hidden_at is null
  )::integer as comment_count,
  (t.hidden_at is not null) as is_hidden,
  -- Flavour tags in the order of the reference list, as two arrays of the same length:
  -- the slugs to work with and the names to print. Empty for a tasting without any.
  coalesce(
    (
      select array_agg(f.slug order by f.sort_order, f.slug)
      from public.tasting_flavor_tags x
      join public.flavor_tags f on f.id = x.flavor_tag_id
      where x.tasting_id = t.id
    ),
    '{}'::text[]
  ) as flavor_tag_slugs,
  coalesce(
    (
      select array_agg(f.name order by f.sort_order, f.slug)
      from public.tasting_flavor_tags x
      join public.flavor_tags f on f.id = x.flavor_tag_id
      where x.tasting_id = t.id
    ),
    '{}'::text[]
  ) as flavor_tag_names
from public.tastings t
join public.profiles p on p.id = t.user_id
join public.coffees c on c.id = t.coffee_id
join public.brands b on b.id = c.brand_id
left join public.brew_methods m on m.id = t.brew_method_id;

-- "select f.*" was expanded when the view was made: say it again to pick up the new columns.
create or replace view public.following_feed
with (security_invoker = true)
as
select f.*
from public.tasting_feed f
where f.status = 'logged'
  and exists (
    select 1 from public.follows w
    where w.follower_id = (select auth.uid()) and w.following_id = f.user_id
  );

-- ── data export: the tags a member chose are theirs too ─────────────────────────────────
-- A key more in the document; the function's name and arguments are unchanged.
create or replace function public.export_my_data_v2()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  -- v1 refuses anonymous callers.
  return public.export_my_data_v1() || jsonb_build_object(
    'comments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'tasting_id', c.tasting_id, 'reply_to', c.parent_id, 'body', c.body,
        'created_at', c.created_at, 'edited_at', c.edited_at, 'hidden', c.hidden_at is not null
      ) order by c.created_at)
      from public.comments c
      where c.user_id = v_user_id
    ), '[]'::jsonb),
    'likes', coalesce((
      select jsonb_agg(jsonb_build_object('tasting_id', l.tasting_id, 'created_at', l.created_at)
                       order by l.created_at)
      from public.likes l
      where l.user_id = v_user_id
    ), '[]'::jsonb),
    'reports', coalesce((
      select jsonb_agg(jsonb_build_object(
        'target_type', r.target_type, 'target_id', r.target_id, 'reason', r.reason,
        'details', r.details, 'status', r.status, 'created_at', r.created_at
      ) order by r.created_at)
      from public.reports r
      where r.reporter_id = v_user_id
    ), '[]'::jsonb),
    'tasting_flavor_tags', coalesce((
      select jsonb_agg(jsonb_build_object('tasting_id', x.tasting_id, 'tags', x.tags)
                       order by x.tasting_id)
      from (
        select g.tasting_id, jsonb_agg(f.name order by f.sort_order, f.slug) as tags
        from public.tasting_flavor_tags g
        join public.tastings t on t.id = g.tasting_id
        join public.flavor_tags f on f.id = g.flavor_tag_id
        where t.user_id = v_user_id
        group by g.tasting_id
      ) x
    ), '[]'::jsonb)
  );
end
$$;

comment on function public.export_my_data_v2 is
  'export_my_data_v1 plus the caller''s comments, likes, reports and flavour tags.';
