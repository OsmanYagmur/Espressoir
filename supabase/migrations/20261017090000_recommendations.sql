-- Recommendations (Phase 4A). The site's own suggestions are computed in the app from the
-- archive (@espressoir/core, recommend.ts); this adds what lives in the database: results of
-- a model the owner trains elsewhere (Python), loaded by `pnpm import:recommendations`, and
-- the stable pseudonym that `pnpm export:analytics` gives each member instead of their id.
-- Rollback: supabase/rollbacks/20261017090000_recommendations.down.sql

-- ── pseudonyms for the analysis export ──────────────────────────────────────────────────
-- One secret per database. A member's key is derived from it and their id: the same on
-- every export (so a model's output can be loaded back), meaningless without the secret,
-- and the export never has to write anything to make one.
create table public.analytics_salt (
  id boolean primary key default true,
  salt text not null default (gen_random_uuid()::text || gen_random_uuid()::text),
  created_at timestamptz not null default now(),
  constraint analytics_salt_single_row check (id)
);
insert into public.analytics_salt default values;

alter table public.analytics_salt enable row level security;
revoke all on table public.analytics_salt from public, anon, authenticated;

create function public.analytics_member_key(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select left(encode(sha256(convert_to(s.salt || ':' || p_user_id::text, 'UTF8')), 'hex'), 16)
  from public.analytics_salt s
$$;

comment on function public.analytics_member_key is
  'A member''s pseudonym in analysis exports: stable, and not reversible without the database.';

-- Scripts only: they connect as the database owner.
revoke all on function public.analytics_member_key from public, anon, authenticated;

-- ── a model's suggestions ───────────────────────────────────────────────────────────────
create table public.recommendations (
  user_id uuid not null references public.profiles (id) on delete cascade,
  coffee_id uuid not null references public.coffees (id) on delete cascade,
  -- Which model made it ("notebook-v1"): a member sees the suggestions of one model at a time.
  model text not null,
  score real not null,
  -- Why, in a few words, shown beside the coffee. Plain text.
  reason text,
  created_at timestamptz not null default now(),
  primary key (user_id, coffee_id, model),
  constraint recommendations_model_format check (
    char_length(model) <= 40 and model ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint recommendations_reason_length check (char_length(reason) between 1 and 140),
  constraint recommendations_score_finite check (
    score = score and score <> 'Infinity'::real and score <> '-Infinity'::real
  )
);

create index recommendations_coffee_idx on public.recommendations (coffee_id);

alter table public.recommendations enable row level security;
-- Members read their own; only the import (as the database owner) writes.
revoke all on table public.recommendations from anon, authenticated;
grant select on table public.recommendations to authenticated;
grant all on table public.recommendations to service_role;

create policy recommendations_select_own on public.recommendations
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ── merging coffees and the data export know about them ─────────────────────────────────
create or replace function public.merge_coffee_into(p_from uuid, p_into uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.tastings t
  where t.coffee_id = p_from
    and t.status = 'wishlist'
    and exists (
      select 1 from public.tastings x
      where x.coffee_id = p_into and x.user_id = t.user_id and x.status = 'wishlist'
    );
  update public.tastings set coffee_id = p_into where coffee_id = p_from;
  update public.reports set target_id = p_into
  where target_type = 'coffee' and target_id = p_from
    and not exists (
      select 1 from public.reports r
      where r.target_type = 'coffee' and r.target_id = p_into
        and r.reporter_id is not distinct from reports.reporter_id
    );
  delete from public.reports where target_type = 'coffee' and target_id = p_from;
  -- Lists: an entry moves to the surviving coffee, unless that list already holds it (what
  -- is left would be a duplicate, and goes with the coffee below).
  update public.list_items i set coffee_id = p_into
  where i.coffee_id = p_from
    and not exists (
      select 1 from public.list_items x where x.list_id = i.list_id and x.coffee_id = p_into
    );
  -- Recommendations: likewise, unless the member already has one for the survivor.
  update public.recommendations r set coffee_id = p_into
  where r.coffee_id = p_from
    and not exists (
      select 1 from public.recommendations x
      where x.user_id = r.user_id and x.model = r.model and x.coffee_id = p_into
    );
  delete from public.coffees where id = p_from;
end
$$;

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
    ), '[]'::jsonb),
    'lists', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', l.title, 'description', l.description, 'public', l.is_public,
        'created_at', l.created_at, 'updated_at', l.updated_at,
        'coffees', coalesce((
          select jsonb_agg(jsonb_build_object('brand', b.name, 'coffee', c.name, 'note', i.note)
                           order by i.position)
          from public.list_items i
          join public.coffees c on c.id = i.coffee_id
          join public.brands b on b.id = c.brand_id
          where i.list_id = l.id
        ), '[]'::jsonb)
      ) order by l.created_at)
      from public.lists l
      where l.user_id = v_user_id
    ), '[]'::jsonb),
    'notifications', coalesce((
      select jsonb_agg(jsonb_build_object(
        'type', n.type, 'from', a.username, 'tasting_id', n.tasting_id,
        'created_at', n.created_at, 'read_at', n.read_at
      ) order by n.created_at)
      from public.notifications n
      join public.profiles a on a.id = n.actor_id
      where n.user_id = v_user_id
    ), '[]'::jsonb),
    'cafes_added', coalesce((
      select jsonb_agg(jsonb_build_object('name', c.name, 'city_code', c.city_code,
                                          'district', c.district, 'created_at', c.created_at)
                       order by c.created_at)
      from public.cafes c
      where c.created_by = v_user_id
    ), '[]'::jsonb),
    'cafe_visits', coalesce((
      select jsonb_agg(jsonb_build_object(
        'cafe', c.name, 'city_code', c.city_code, 'drink', v.drink, 'drink_name', v.drink_name,
        'score', v.score, 'notes', v.notes, 'visited_on', v.visited_on,
        'price_paid', v.price_paid, 'visibility', v.visibility, 'created_at', v.created_at
      ) order by v.created_at)
      from public.cafe_visits v
      join public.cafes c on c.id = v.cafe_id
      where v.user_id = v_user_id
    ), '[]'::jsonb),
    'recommendations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'brand', b.name, 'coffee', c.name, 'model', r.model, 'score', r.score,
        'reason', r.reason, 'created_at', r.created_at
      ) order by r.model, r.score desc)
      from public.recommendations r
      join public.coffees c on c.id = r.coffee_id
      join public.brands b on b.id = c.brand_id
      where r.user_id = v_user_id
    ), '[]'::jsonb),
    -- Where the member's pictures are kept (bucket "media"); the files can be fetched there.
    'photos', jsonb_build_object(
      'avatar', (select p.avatar_path from public.profiles p where p.id = v_user_id),
      'tastings', coalesce((
        select jsonb_agg(jsonb_build_object(
          'tasting_id', t.id, 'path', t.photo_path, 'description', t.photo_alt
        ) order by t.created_at)
        from public.tastings t
        where t.user_id = v_user_id and t.photo_path is not null
      ), '[]'::jsonb)
    )
  );
end
$$;

comment on function public.export_my_data_v2 is
  'export_my_data_v1 plus the caller''s comments, likes, reports, flavour tags, lists, notifications, photos, cafés and recommendations.';
