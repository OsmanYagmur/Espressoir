-- log_tasting_v1: the one multi-step write of the archive. Finds or creates the brand and
-- the coffee, then records the tasting, all in a single transaction, so web and mobile
-- share the same rules. Change behaviour by adding log_tasting_v2, never by editing this.
-- Rollback: supabase/rollbacks/20261010133300_log_tasting_rpc.down.sql

create function public.log_tasting_v1(
  -- Either an existing coffee…
  p_coffee_id uuid default null,
  -- …or a brand and coffee name. Both are matched against the catalog first (ignoring
  -- case, accents and apostrophes, and the brand's aliases) and created only when new.
  p_brand_name text default null,
  p_coffee_name text default null,
  -- Used only when the coffee is created here; an existing coffee is never modified.
  p_form public.coffee_form default null,
  p_capsule_system public.capsule_system default null,
  p_brand_intensity smallint default null,
  p_origin_country text default null,
  -- The tasting itself.
  p_brew_method_slug text default null,
  p_device text default null,
  p_score smallint default null,
  p_tasted_at date default null,
  p_notes text default null,
  p_status public.tasting_status default 'logged',
  p_visibility public.tasting_visibility default 'public',
  p_body smallint default null,
  p_acidity smallint default null,
  p_bitterness smallint default null,
  p_sweetness smallint default null,
  p_aftertaste smallint default null,
  p_would_buy_again boolean default null,
  p_price_paid numeric default null
)
returns table (tasting_id uuid, coffee_id uuid, brand_slug text, coffee_slug text)
language plpgsql
-- Runs with the caller's rights: every statement below is still checked by RLS.
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_brand_id uuid;
  v_coffee_id uuid := p_coffee_id;
  v_brew_method_id uuid;
  v_tasting_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if v_coffee_id is null then
    if nullif(btrim(p_brand_name), '') is null or nullif(btrim(p_coffee_name), '') is null then
      raise exception 'coffee_required'
        using errcode = '22023', detail = 'Pass p_coffee_id, or both p_brand_name and p_coffee_name.';
    end if;

    v_brand_id := public.find_brand_id(p_brand_name);
    if v_brand_id is null then
      insert into public.brands (name, created_by)
      values (p_brand_name, v_user_id)
      returning id into v_brand_id;
    end if;

    select c.id into v_coffee_id
    from public.coffees c
    where c.brand_id = v_brand_id and c.slug = public.slugify(p_coffee_name);

    if v_coffee_id is null then
      insert into public.coffees (
        brand_id, name, form, capsule_system, brand_intensity, origin_country, created_by
      )
      values (
        v_brand_id, p_coffee_name, p_form, p_capsule_system, p_brand_intensity,
        p_origin_country, v_user_id
      )
      returning id into v_coffee_id;
    end if;
  elsif not exists (select 1 from public.coffees c where c.id = v_coffee_id) then
    raise exception 'coffee_not_found' using errcode = 'P0002';
  end if;

  if p_brew_method_slug is not null then
    select m.id into v_brew_method_id
    from public.brew_methods m
    where m.slug = p_brew_method_slug;

    if v_brew_method_id is null then
      raise exception 'brew_method_not_found' using errcode = 'P0002';
    end if;
  end if;

  insert into public.tastings (
    user_id, coffee_id, brew_method_id, device, score, tasted_at, notes, status, visibility,
    body, acidity, bitterness, sweetness, aftertaste, would_buy_again, price_paid
  )
  values (
    v_user_id, v_coffee_id, v_brew_method_id, nullif(btrim(p_device), ''), p_score, p_tasted_at,
    nullif(btrim(p_notes), ''), p_status, p_visibility,
    p_body, p_acidity, p_bitterness, p_sweetness, p_aftertaste, p_would_buy_again, p_price_paid
  )
  returning id into v_tasting_id;

  return query
    select v_tasting_id, c.id, b.slug, c.slug
    from public.coffees c
    join public.brands b on b.id = c.brand_id
    where c.id = v_coffee_id;
end
$$;

comment on function public.log_tasting_v1 is
  'Records a tasting for the calling user, creating the brand and coffee when they are new.';

revoke all on function public.log_tasting_v1 from public, anon;
grant execute on function public.log_tasting_v1 to authenticated, service_role;
