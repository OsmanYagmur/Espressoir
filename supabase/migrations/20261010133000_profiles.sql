-- Profiles: one public row per auth user, plus helpers that later tables rely on.
-- Rollback: supabase/rollbacks/20261010133000_profiles.down.sql

create type public.user_role as enum ('user', 'admin');

-- Keeps updated_at honest without trusting clients to send it.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text,
  avatar_url text,
  bio text,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_key unique (username),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,24}$'),
  constraint profiles_display_name_length check (char_length(display_name) between 1 and 60),
  constraint profiles_avatar_url_format check (avatar_url ~ '^https://'),
  constraint profiles_bio_length check (char_length(bio) <= 500)
);

comment on table public.profiles is
  'Public identity of an auth user. Never holds e-mail or other private data.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Every auth user gets a profile. The requested username (signup metadata) is used when it
-- is valid and free; otherwise a placeholder derived from the user id, to be changed later.
-- Only the username is read from the metadata: it is user-controlled, so never the role.
create function public.handle_new_user()
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

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Used by RLS policies. SECURITY DEFINER so the check itself is not subject to RLS.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
  )
$$;

comment on function public.is_admin() is 'True when the calling user is an admin.';

alter table public.profiles enable row level security;

-- Explicit grants: the role column is never writable through the API. Admins are made by
-- `pnpm admin:bootstrap` (service role) only.
revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to anon, authenticated;
grant update (username, display_name, avatar_url, bio) on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

create policy profiles_select_all on public.profiles
  for select to anon, authenticated
  using (true);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
