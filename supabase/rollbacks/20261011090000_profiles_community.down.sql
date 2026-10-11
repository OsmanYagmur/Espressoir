-- Reverts 20261011090000_profiles_community.sql.
drop view if exists public.profile_overview;

drop trigger if exists profiles_guard_username on public.profiles;
drop function if exists public.guard_username_change();

-- Back to the Phase 1 version: no reserved-name check.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted text := lower(btrim(new.raw_user_meta_data ->> 'username'));
  chosen text;
begin
  if wanted ~ '^[a-z0-9_]{3,24}$'
     and not exists (select 1 from public.profiles where username = wanted) then
    chosen := wanted;
  else
    chosen := 'u_' || substr(replace(new.id::text, '-', ''), 1, 16);
  end if;

  insert into public.profiles (id, username) values (new.id, chosen);
  return new;
end
$$;

drop function if exists public.is_reserved_username(text);
drop function if exists public.reserved_usernames();

alter policy tastings_update_own on public.tastings
  with check (user_id = (select auth.uid()));
alter policy tastings_insert_own on public.tastings
  with check (user_id = (select auth.uid()) and source = 'web');
alter policy follows_insert_own on public.follows
  with check (follower_id = (select auth.uid()));
alter policy coffees_insert_own on public.coffees
  with check (created_by = (select auth.uid()));
alter policy brands_insert_own on public.brands
  with check (created_by = (select auth.uid()));
alter policy profiles_update_own on public.profiles
  with check (id = (select auth.uid()));

drop function if exists public.can_post();
drop table if exists public.profile_private;
alter table public.profiles drop column if exists onboarded_at;
