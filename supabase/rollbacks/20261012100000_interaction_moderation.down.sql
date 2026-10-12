-- Reverts 20261012100000_interaction_moderation.sql.
drop function if exists public.export_my_data_v2();

drop function if exists public.admin_merge_brands_v1(uuid, uuid);
drop function if exists public.admin_merge_coffees_v1(uuid, uuid);
drop function if exists public.merge_coffee_into(uuid, uuid);
drop function if exists public.admin_review_coffee_v1(uuid, boolean);
drop function if exists public.admin_resolve_report_v1(uuid, public.report_status, text);
drop function if exists public.admin_restrict_user_v1(uuid, integer, text);
drop function if exists public.admin_delete_v1(public.report_target, uuid, text);
drop function if exists public.admin_set_hidden_v1(public.report_target, uuid, boolean, text);
drop function if exists public.log_admin_action(text, text, uuid, text);
drop table if exists public.moderation_log;

drop table if exists public.reports;
drop function if exists public.check_report_target();
drop type if exists public.report_status;
drop type if exists public.report_reason;
drop type if exists public.report_target;

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
  m.category as brew_category
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

create or replace view public.profile_overview
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
left join public.tastings t on t.user_id = p.id and t.visibility = 'public'
where p.onboarded_at is not null
group by p.id;

create or replace view public.coffee_stats
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

drop table if exists public.likes;

drop trigger if exists profiles_scrub_comments on public.profiles;
drop function if exists public.scrub_member_comments();
drop function if exists public.delete_comment_v1(uuid);
drop table if exists public.comments;
drop function if exists public.prepare_comment();

alter policy tastings_select_followers on public.tastings
  using (
    visibility = 'followers'
    and exists (
      select 1 from public.follows f
      where f.follower_id = (select auth.uid()) and f.following_id = tastings.user_id
    )
  );
alter policy tastings_select_public on public.tastings
  using (visibility = 'public');
alter table public.tastings
  drop constraint if exists tastings_hidden_reason_length,
  drop column if exists hidden_reason,
  drop column if exists hidden_by,
  drop column if exists hidden_at;

-- Back to the version that trusted created_at as sent.
create or replace function public.enforce_rate_limit()
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
