-- Reverts 20261017090000_recommendations.sql.
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
  'export_my_data_v1 plus the caller''s comments, likes, reports, flavour tags, lists, notifications, photos and cafés.';

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
  delete from public.coffees where id = p_from;
end
$$;

drop table if exists public.recommendations;
drop function if exists public.analytics_member_key(uuid);
drop table if exists public.analytics_salt;
