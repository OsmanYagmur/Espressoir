-- Reverts 20261013180000_flavor_tags_on_tastings.sql.
drop function if exists public.log_tasting_v2(
  uuid, text, text, public.coffee_form, public.capsule_system, smallint, text, text, text,
  smallint, date, text, public.tasting_status, public.tasting_visibility, smallint, smallint,
  smallint, smallint, smallint, boolean, numeric, text[]
);
drop function if exists public.set_tasting_tags_v1(uuid, text[]);

drop trigger if exists tastings_wishlist_drops_tags on public.tastings;
drop function if exists public.clear_tags_of_wishlist_entry();
drop trigger if exists tasting_flavor_tags_check on public.tasting_flavor_tags;
drop function if exists public.check_tasting_flavor_tag();

alter policy tasting_flavor_tags_insert_own on public.tasting_flavor_tags
  with check (
    exists (
      select 1 from public.tastings t
      where t.id = tasting_id and t.user_id = (select auth.uid())
    )
  );

-- Views cannot lose columns in place: back to the definitions of the previous migration.
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
  (t.hidden_at is not null) as is_hidden
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
    ), '[]'::jsonb)
  );
end
$$;

comment on function public.export_my_data_v2 is
  'export_my_data_v1 plus the caller''s comments, likes and reports.';
