-- What a member does to their own account: finish onboarding, take their data with them,
-- leave. Functions, so web and mobile share the rules and no secret key is needed at runtime.
-- Rollback: supabase/rollbacks/20261011090100_account_rpcs.down.sql

-- ── onboarding ──────────────────────────────────────────────────────────────────────────
-- Picks the username, records which terms were accepted and opens the account for posting.
-- SECURITY DEFINER because `onboarded_at` and profile_private are not writable through
-- the API; everything it touches is keyed to the caller.
create function public.complete_onboarding_v1(
  p_username text,
  p_display_name text default null,
  p_terms_version text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_username text := lower(btrim(coalesce(p_username, '')));
  v_display_name text :=
    nullif(btrim(regexp_replace(coalesce(p_display_name, ''), '\s+', ' ', 'g')), '');
  v_terms_version text := nullif(btrim(coalesce(p_terms_version, '')), '');
  v_onboarded_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if v_terms_version is null then
    raise exception 'terms_required' using errcode = '22023';
  end if;
  if v_username !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'username_invalid' using errcode = '22023';
  end if;
  if public.is_reserved_username(v_username) and not public.is_admin() then
    raise exception 'username_reserved' using errcode = 'P0001';
  end if;
  if char_length(v_display_name) > 60 then
    raise exception 'display_name_too_long' using errcode = '22023';
  end if;

  select p.onboarded_at into v_onboarded_at
  from public.profiles p
  where p.id = v_user_id
  for update;
  if not found then
    raise exception 'profile_missing' using errcode = 'P0002';
  end if;
  if v_onboarded_at is not null then
    raise exception 'already_onboarded' using errcode = 'P0001';
  end if;

  begin
    update public.profiles p
    set username = v_username, display_name = v_display_name, onboarded_at = now()
    where p.id = v_user_id;
  exception when unique_violation then
    raise exception 'username_taken' using errcode = '23505';
  end;

  insert into public.profile_private (profile_id, terms_accepted_at, terms_version)
  values (v_user_id, now(), v_terms_version)
  on conflict (profile_id) do update
    set terms_accepted_at = excluded.terms_accepted_at, terms_version = excluded.terms_version;

  return v_username;
end
$$;

comment on function public.complete_onboarding_v1 is
  'Sets the caller''s username, records the accepted terms and opens the account for posting.';

revoke all on function public.complete_onboarding_v1 from public, anon;
grant execute on function public.complete_onboarding_v1 to authenticated;

-- ── data export ─────────────────────────────────────────────────────────────────────────
-- Everything the site holds about the caller, as one JSON document. Runs with the caller's
-- rights: it can only ever return what they are allowed to read anyway.
create function public.export_my_data_v1()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  return jsonb_build_object(
    'exported_at', now(),
    'account', jsonb_build_object(
      'id', v_user_id,
      'email', (select auth.jwt()) ->> 'email'
    ),
    'profile', (
      select jsonb_build_object(
        'username', p.username,
        'display_name', p.display_name,
        'bio', p.bio,
        'avatar_url', p.avatar_url,
        'role', p.role,
        'created_at', p.created_at,
        'onboarded_at', p.onboarded_at
      )
      from public.profiles p
      where p.id = v_user_id
    ),
    'account_state', (
      select jsonb_build_object(
        'terms_accepted_at', s.terms_accepted_at,
        'terms_version', s.terms_version,
        'username_changed_at', s.username_changed_at,
        'restricted_until', s.restricted_until,
        'restricted_reason', s.restricted_reason
      )
      from public.profile_private s
      where s.profile_id = v_user_id
    ),
    'tastings', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at, x.id)
      from (
        select
          t.id, b.name as brand, c.name as coffee, m.name as brew_method, t.device,
          t.status, t.visibility, t.score, t.tasted_at, t.notes,
          t.body, t.acidity, t.bitterness, t.sweetness, t.aftertaste,
          t.would_buy_again, t.price_paid, t.source, t.created_at, t.updated_at
        from public.tastings t
        join public.coffees c on c.id = t.coffee_id
        join public.brands b on b.id = c.brand_id
        left join public.brew_methods m on m.id = t.brew_method_id
        where t.user_id = v_user_id
      ) x
    ), '[]'::jsonb),
    'following', coalesce((
      select jsonb_agg(jsonb_build_object('username', p.username, 'since', f.created_at)
                       order by f.created_at)
      from public.follows f
      join public.profiles p on p.id = f.following_id
      where f.follower_id = v_user_id
    ), '[]'::jsonb),
    'followers', coalesce((
      select jsonb_agg(jsonb_build_object('username', p.username, 'since', f.created_at)
                       order by f.created_at)
      from public.follows f
      join public.profiles p on p.id = f.follower_id
      where f.following_id = v_user_id
    ), '[]'::jsonb),
    'brands_added', coalesce((
      select jsonb_agg(jsonb_build_object('name', b.name, 'created_at', b.created_at)
                       order by b.created_at)
      from public.brands b
      where b.created_by = v_user_id
    ), '[]'::jsonb),
    'coffees_added', coalesce((
      select jsonb_agg(jsonb_build_object('brand', b.name, 'name', c.name,
                                          'created_at', c.created_at)
                       order by c.created_at)
      from public.coffees c
      join public.brands b on b.id = c.brand_id
      where c.created_by = v_user_id
    ), '[]'::jsonb)
  );
end
$$;

comment on function public.export_my_data_v1 is
  'Everything stored about the calling user, as one JSON document (data portability).';

revoke all on function public.export_my_data_v1 from public, anon;
grant execute on function public.export_my_data_v1 to authenticated;

-- ── leaving ─────────────────────────────────────────────────────────────────────────────
-- Deletes the caller's account. Their profile, tastings and follows go with it (cascades);
-- brands and coffees they added stay in the shared catalog without a name attached.
-- SECURITY DEFINER because only the database owner may delete from auth.users.
-- An admin cannot delete themselves this way: the site would be left without one, and the
-- owner's archive would go with a single click.
create function public.delete_my_account_v1()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if public.is_admin() then
    raise exception 'admin_cannot_delete_self' using errcode = 'P0001';
  end if;

  delete from auth.users where id = v_user_id;
end
$$;

comment on function public.delete_my_account_v1 is
  'Deletes the calling user''s account and everything that belongs to it. Not for admins.';

revoke all on function public.delete_my_account_v1 from public, anon;
grant execute on function public.delete_my_account_v1 to authenticated;
