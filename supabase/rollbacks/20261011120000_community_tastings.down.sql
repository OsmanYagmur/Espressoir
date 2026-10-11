-- Reverts 20261011120000_community_tastings.sql.
drop view if exists public.following_feed;
drop index if exists public.tastings_public_feed_idx;

drop trigger if exists follows_rate_limit on public.follows;
drop trigger if exists brands_rate_limit on public.brands;
drop trigger if exists coffees_rate_limit on public.coffees;
drop trigger if exists tastings_rate_limit on public.tastings;
drop function if exists public.enforce_rate_limit();

drop function if exists public.search_coffees_v1(text, integer);

-- A view cannot lose a column in place: back to the definition from 20261010133200.
drop view if exists public.coffee_overview;
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

revoke all on table public.coffee_overview from anon, authenticated;
grant select on table public.coffee_overview to anon, authenticated, service_role;

drop trigger if exists coffees_review_state on public.coffees;
drop function if exists public.set_coffee_review_state();
alter table public.coffees
  drop column if exists reviewed_by,
  drop column if exists reviewed_at;

drop index if exists public.coffees_search_text_trgm_idx;
drop trigger if exists brands_refresh_search_text on public.brands;
drop function if exists public.refresh_brand_search_text();
drop trigger if exists coffees_search_text on public.coffees;
drop function if exists public.set_coffee_search_text();
drop function if exists public.coffee_search_text(uuid, text);
alter table public.coffees drop column if exists search_text;
