-- Reverts 20261015090000_media.sql. The pictures themselves are files in Storage: they are not touched
-- here (remove them with `pnpm media:sweep` once nothing points at them).
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
    ), '[]'::jsonb)
  );
end
$$;

comment on function public.export_my_data_v2 is
  'export_my_data_v1 plus the caller''s comments, likes, reports, flavour tags, lists and notifications.';

drop function if exists public.media_usage_v1();
drop function if exists public.admin_remove_photo_v1(public.report_target, uuid, text);
drop function if exists public.set_avatar_v1(text);
drop function if exists public.set_tasting_photo_v1(uuid, text, integer, integer, text);

-- Views cannot lose columns in place: back to the definitions of the earlier migrations.
drop view if exists public.following_feed;
drop view if exists public.tasting_feed;
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

revoke all on table public.tasting_feed from anon, authenticated;
grant select on table public.tasting_feed to anon, authenticated, service_role;

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

drop view if exists public.profile_overview;
create view public.profile_overview
with (security_invoker = true)
as
select
  p.id as user_id,
  p.username,
  p.display_name,
  p.bio,
  p.avatar_url,
  p.created_at as joined_at,
  (count(t.id) filter (where t.status = 'logged'))::integer as tasting_count,
  (count(t.score) filter (where t.status = 'logged'))::integer as rated_count,
  round(avg(t.score) filter (where t.status = 'logged'), 2) as avg_score,
  (count(distinct t.coffee_id) filter (where t.status = 'logged'))::integer as coffee_count,
  (count(t.id) filter (where t.status = 'wishlist'))::integer as wishlist_count,
  max(t.tasted_at) filter (where t.status = 'logged') as last_tasted_at,
  (select count(*) from public.follows f where f.following_id = p.id)::integer as follower_count,
  (select count(*) from public.follows f where f.follower_id = p.id)::integer as following_count
from public.profiles p
left join public.tastings t
  on t.user_id = p.id and t.visibility = 'public' and t.hidden_at is null
where p.onboarded_at is not null
group by p.id;

comment on view public.profile_overview is
  'Per-member totals from public tastings, plus follower counts. Onboarded members only.';

revoke all on table public.profile_overview from anon, authenticated;
grant select on table public.profile_overview to anon, authenticated, service_role;

grant update (avatar_url) on table public.profiles to authenticated;

alter table public.profiles
  drop constraint if exists profiles_avatar_path_format,
  drop column if exists avatar_path;

alter table public.tastings
  drop constraint if exists tastings_wishlist_has_no_photo,
  drop constraint if exists tastings_photo_alt_length,
  drop constraint if exists tastings_photo_size,
  drop constraint if exists tastings_photo_complete,
  drop constraint if exists tastings_photo_path_format,
  drop column if exists photo_alt,
  drop column if exists photo_height,
  drop column if exists photo_width,
  drop column if exists photo_path;

drop policy if exists media_delete_own on storage.objects;
drop policy if exists media_select_own on storage.objects;
drop policy if exists media_insert_own on storage.objects;

-- Storage does not let a bucket be deleted from SQL: it is closed instead. Applying the
-- migration again opens it.
update storage.buckets set public = false where id = 'media';
