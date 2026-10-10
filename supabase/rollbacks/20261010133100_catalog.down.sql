-- Reverts 20261010133100_catalog.sql.
drop table if exists public.flavor_tags;
drop table if exists public.brew_methods;
drop table if exists public.coffees;
drop function if exists public.find_brand_id(text);
drop table if exists public.brands;
drop type if exists public.flavor_group;
drop type if exists public.brew_category;
drop type if exists public.roast_level;
drop type if exists public.coffee_process;
drop type if exists public.capsule_system;
drop type if exists public.coffee_form;
drop function if exists public.prepare_named_row();
drop function if exists public.slugify(text);
