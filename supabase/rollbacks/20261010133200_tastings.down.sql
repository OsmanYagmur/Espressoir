-- Reverts 20261010133200_tastings.sql.
drop view if exists public.tasting_feed;
drop view if exists public.coffee_overview;
drop view if exists public.coffee_stats;
drop table if exists public.tasting_flavor_tags;
drop table if exists public.tastings;
drop table if exists public.follows;
drop type if exists public.tasting_source;
drop type if exists public.tasting_visibility;
drop type if exists public.tasting_status;
