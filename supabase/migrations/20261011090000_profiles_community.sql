-- Accounts for a community: onboarding, private account data, the "may this user post?"
-- rule that every write policy shares, and the public profile read model.
-- Rollback: supabase/rollbacks/20261011090000_profiles_community.down.sql

-- ── onboarding ──────────────────────────────────────────────────────────────────────────
-- Set once the person has chosen a username and accepted the terms. Public on purpose:
-- it is what makes a profile page exist.
alter table public.profiles add column onboarded_at timestamptz;

comment on column public.profiles.onboarded_at is
  'When the user chose a username and accepted the terms; null until then.';

-- Accounts from before this step (the owner's) were set up by hand.
update public.profiles set onboarded_at = created_at where onboarded_at is null;

-- ── private account data ────────────────────────────────────────────────────────────────
-- `profiles` is readable by everyone, so whatever is nobody else's business lives here:
-- at most one row per profile, readable by its owner and by admins, written only by the
-- functions of this schema (there are no write grants).
create table public.profile_private (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  terms_accepted_at timestamptz,
  -- Which text was accepted, e.g. '2026-10-taslak'.
  terms_version text,
  username_changed_at timestamptz,
  -- Moderation: until this moment the user can read but not post.
  restricted_until timestamptz,
  restricted_reason text,
  updated_at timestamptz not null default now(),
  constraint profile_private_terms_version_length
    check (char_length(terms_version) between 1 and 40),
  constraint profile_private_restricted_reason_length
    check (char_length(restricted_reason) between 1 and 500)
);

comment on table public.profile_private is
  'Account data only its owner and admins may see: accepted terms, username changes, restrictions.';

create trigger profile_private_set_updated_at
  before update on public.profile_private
  for each row execute function public.set_updated_at();

alter table public.profile_private enable row level security;

revoke all on table public.profile_private from anon, authenticated;
grant select on table public.profile_private to authenticated;
grant all on table public.profile_private to service_role;

create policy profile_private_select_own on public.profile_private
  for select to authenticated
  using (profile_id = (select auth.uid()));
create policy profile_private_select_admin on public.profile_private
  for select to authenticated
  using ((select public.is_admin()));

-- ── who may post ────────────────────────────────────────────────────────────────────────
-- One rule for every write policy, so web and mobile cannot disagree: the caller has
-- finished onboarding and is not under a restriction. SECURITY DEFINER because it reads
-- rows the caller's own policies are in the middle of being checked against.
create function public.can_post()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.onboarded_at is not null
  )
  and not exists (
    select 1 from public.profile_private s
    where s.profile_id = (select auth.uid()) and s.restricted_until > now()
  )
$$;

comment on function public.can_post() is
  'True when the calling user has finished onboarding and is not restricted.';

revoke all on function public.can_post() from public, anon;
grant execute on function public.can_post() to authenticated, service_role;

alter policy profiles_update_own on public.profiles
  with check (id = (select auth.uid()) and (select public.can_post()));
alter policy brands_insert_own on public.brands
  with check (created_by = (select auth.uid()) and (select public.can_post()));
alter policy coffees_insert_own on public.coffees
  with check (created_by = (select auth.uid()) and (select public.can_post()));
alter policy follows_insert_own on public.follows
  with check (follower_id = (select auth.uid()) and (select public.can_post()));
alter policy tastings_insert_own on public.tastings
  with check (user_id = (select auth.uid()) and source = 'web' and (select public.can_post()));
-- A restricted user keeps their tastings and may delete them, but not rewrite them.
alter policy tastings_update_own on public.tastings
  with check (user_id = (select auth.uid()) and (select public.can_post()));

-- ── usernames ───────────────────────────────────────────────────────────────────────────
-- Names that would pass for a page of the site or for the site itself. Must stay in sync
-- with RESERVED_USERNAMES in @espressoir/core (a database test compares the two).
create function public.reserved_usernames()
returns text[]
language sql
immutable
parallel safe
set search_path = ''
as $$
  select array[
    'admin', 'administrator', 'akis', 'anonim', 'anonymous', 'api', 'auth', 'ayarlar',
    'cikis', 'destek', 'espressoir', 'giris', 'gizlilik', 'hakkinda', 'hesap', 'istatistik',
    'kahve', 'kahveler', 'kayit', 'kosullar', 'kullanici', 'kvkk', 'login', 'marka',
    'markalar', 'mod', 'moderator', 'null', 'official', 'panel', 'resmi', 'root', 'settings',
    'signup', 'support', 'system', 'tadim', 'undefined', 'yardim', 'yonetim'
  ]
$$;

create function public.is_reserved_username(p_username text)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select coalesce(lower(p_username) = any (public.reserved_usernames()), false)
$$;

-- A reserved name asked for at signup is treated like a taken one: the account gets a
-- placeholder and picks a real name during onboarding.
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
     and not public.is_reserved_username(wanted)
     and not exists (select 1 from public.profiles where username = wanted) then
    chosen := wanted;
  else
    chosen := 'u_' || substr(replace(new.id::text, '-', ''), 1, 16);
  end if;

  insert into public.profiles (id, username) values (new.id, chosen);
  return new;
end
$$;

-- A username is an address (/u/<name>), so it cannot change every day: 30 days between
-- changes, and never to a reserved name. Scripts (no API user) and admins are trusted.
-- SECURITY DEFINER because it records the change in profile_private.
create function public.guard_username_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := (select auth.uid());
  v_last timestamptz;
begin
  if new.username is not distinct from old.username then
    return new;
  end if;
  if v_caller is null or public.is_admin() then
    return new;
  end if;

  if public.is_reserved_username(new.username) then
    raise exception 'username_reserved' using errcode = 'P0001';
  end if;

  -- Before onboarding the name is a placeholder: picking the first real one is free.
  if old.onboarded_at is not null then
    select s.username_changed_at into v_last
    from public.profile_private s
    where s.profile_id = old.id;

    if v_last > now() - interval '30 days' then
      raise exception 'username_change_too_soon'
        using errcode = 'P0001', detail = to_char(v_last + interval '30 days', 'YYYY-MM-DD');
    end if;

    insert into public.profile_private (profile_id, username_changed_at)
    values (old.id, now())
    on conflict (profile_id) do update set username_changed_at = excluded.username_changed_at;
  end if;

  return new;
end
$$;

revoke all on function public.guard_username_change() from public, anon, authenticated;

create trigger profiles_guard_username
  before update of username on public.profiles
  for each row execute function public.guard_username_change();

-- ── read model ──────────────────────────────────────────────────────────────────────────
-- One flat row per member with the numbers a profile page shows. Like every community
-- number, they count public tastings only, whoever is asking. People who have not finished
-- onboarding have no public profile.
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
left join public.tastings t on t.user_id = p.id and t.visibility = 'public'
where p.onboarded_at is not null
group by p.id;

comment on view public.profile_overview is
  'Per-member totals from public tastings, plus follower counts. Onboarded members only.';

revoke all on table public.profile_overview from anon, authenticated;
grant select on table public.profile_overview to anon, authenticated, service_role;
