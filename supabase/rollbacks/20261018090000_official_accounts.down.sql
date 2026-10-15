-- Reverts 20261018090000_official_accounts.sql.
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

-- Views lose their new columns: dropped and made again as they were.
drop view if exists public.cafe_overview;
create view public.cafe_overview
with (security_invoker = true)
as
select
  c.id as cafe_id,
  c.slug as cafe_slug,
  c.name as cafe_name,
  c.city_code,
  c.district,
  c.map_url,
  c.created_at,
  (c.reviewed_at is not null) as is_reviewed,
  count(v.id)::integer as visit_count,
  round(avg(v.score), 2) as avg_score,
  max(v.visited_on) as last_visited_on
from public.cafes c
left join public.cafe_visits v
  on v.cafe_id = c.id and v.visibility = 'public' and v.hidden_at is null
group by c.id;

comment on view public.cafe_overview is
  'Cafés with visit counts and average score from public, visible visits.';
revoke all on table public.cafe_overview from anon, authenticated;
grant select on table public.cafe_overview to anon, authenticated, service_role;

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
  (select count(*) from public.follows f where f.follower_id = p.id)::integer as following_count,
  p.avatar_path
from public.profiles p
left join public.tastings t
  on t.user_id = p.id and t.visibility = 'public' and t.hidden_at is null
where p.onboarded_at is not null
group by p.id;

comment on view public.profile_overview is
  'Per-member totals from public tastings, plus follower counts. Onboarded members only.';
revoke all on table public.profile_overview from anon, authenticated;
grant select on table public.profile_overview to anon, authenticated, service_role;

drop view if exists public.brand_pages;
drop function if exists public.admin_revoke_official_v1(uuid, text);
drop function if exists public.admin_resolve_verification_v1(uuid, boolean, text);

drop view if exists public.notification_feed;
delete from public.notifications where type = 'verification';
alter table public.notifications
  drop constraint notifications_shape,
  drop constraint notifications_type_known;
alter table public.notifications drop column request_id;
alter table public.notifications
  add constraint notifications_type_known check (type in ('like', 'comment', 'reply', 'follow')),
  add constraint notifications_shape check (
    (type = 'follow' and tasting_id is null and comment_id is null)
    or (type = 'like' and tasting_id is not null and comment_id is null)
    or (type in ('comment', 'reply') and tasting_id is not null and comment_id is not null)
  );
create view public.notification_feed
with (security_invoker = true)
as
select
  n.id as notification_id,
  n.type,
  n.created_at,
  n.read_at,
  a.username as actor_username,
  a.display_name as actor_display_name,
  n.tasting_id,
  b.name as brand_name,
  c.name as coffee_name,
  n.comment_id,
  left(k.body, 140) as comment_excerpt
from public.notifications n
join public.profiles a on a.id = n.actor_id
left join public.tastings t on t.id = n.tasting_id
left join public.coffees c on c.id = t.coffee_id
left join public.brands b on b.id = c.brand_id
left join public.comments k on k.id = n.comment_id
where (n.tasting_id is null or t.id is not null)
  and (
    n.comment_id is null
    or (k.id is not null and k.deleted_at is null and k.hidden_at is null)
  );

comment on view public.notification_feed is
  'The calling member''s notifications, with the names needed to print them.';

revoke all on table public.notification_feed from anon, authenticated;
grant select on table public.notification_feed to authenticated, service_role;

drop function if exists public.update_business_page_v1(uuid, uuid, text, text, text, text);
drop trigger if exists cafe_visits_official_self_score on public.cafe_visits;
drop trigger if exists tastings_official_self_score on public.tastings;
drop function if exists public.refuse_official_self_score();
drop table if exists public.verification_requests;
drop function if exists public.prepare_verification_request();
drop table if exists public.official_accounts;

alter table public.cafes
  drop constraint cafes_website_format,
  drop constraint cafes_description_length,
  drop column website,
  drop column description;
alter table public.brands
  drop constraint brands_description_length,
  drop column description;
