-- The admin's side of the workshops (2026-10-24): people added from the admin panel, who
-- came, and the community's numbers for the overview on /osman.

-- ── people added from the panel, and attendance ────────────────────────────────────────
alter table public.workshop_applications
  add column source text not null default 'form',
  add column attended boolean,
  add constraint workshop_applications_source_known check (source in ('form', 'admin'));

comment on column public.workshop_applications.source is
  'form: sent from the workshop page; admin: added from the admin panel (the person agreed in person).';
comment on column public.workshop_applications.attended is
  'Marked by an admin after the workshop: true came, false did not, null not marked yet.';

-- Tidies what was typed and decides the status of a new application. An admin adds a
-- person with the status they choose, at any time (a workshop closed to the form or
-- already started) and without the flood limit; the row is marked as added from the
-- panel. Everyone else gets the form's rules, whatever they send: an open workshop still
-- ahead, the flood limit, pending or (once the seats are taken) the waitlist. The workshop
-- row is locked first, so two applications for the last seat take turns.
create or replace function public.prepare_workshop_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workshop public.workshops;
  v_recent integer;
begin
  new.name := btrim(regexp_replace(coalesce(new.name, ''), '\s+', ' ', 'g'));
  new.contact := btrim(regexp_replace(coalesce(new.contact, ''), '\s+', ' ', 'g'));
  new.question := nullif(btrim(new.question), '');
  -- A handle: small letters, no "@". A phone number: its last ten digits, so "+90 555 …"
  -- and "0555 …" are the same person.
  new.contact_key := case
    when new.contact ~ '[[:alpha:]]' then lower(regexp_replace(new.contact, '[@\s]', '', 'g'))
    else right(regexp_replace(new.contact, '\D', '', 'g'), 10)
  end;
  new.created_at := now();
  new.attended := null;

  select * into v_workshop from public.workshops w where w.id = new.workshop_id for update;
  if not found then
    raise exception 'workshop_closed' using errcode = 'P0001';
  end if;

  if public.is_admin() then
    new.source := 'admin';
    return new;
  end if;

  new.source := 'form';
  if not v_workshop.is_open or v_workshop.starts_at <= now() then
    raise exception 'workshop_closed' using errcode = 'P0001';
  end if;

  -- The form is open to everyone, so a flood is stopped per workshop, not per person.
  select count(*) into v_recent
  from public.workshop_applications a
  where a.workshop_id = new.workshop_id and a.created_at > now() - interval '10 minutes';
  if v_recent >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001', detail = 'workshop_applications';
  end if;

  new.status := case
    when public.workshop_seats_taken(new.workshop_id) >= v_workshop.capacity then 'waitlist'
    else 'pending'
  end;
  return new;
end
$$;

revoke all on function public.prepare_workshop_application from public, anon, authenticated;

-- A signed-in caller may send a status; the trigger keeps it only for an admin.
grant insert (status) on table public.workshop_applications to authenticated;
-- An admin marks who came (the update policy admits admins only).
grant update (attended) on table public.workshop_applications to authenticated;

create policy workshop_applications_insert_admin on public.workshop_applications
  for insert to authenticated
  with check ((select public.is_admin()));

-- ── the community's numbers ─────────────────────────────────────────────────────────────
-- What the admin overview shows: each count in total and over the last seven days. Hidden
-- and removed rows are left out; private tastings are counted (they are tastings too).
create function public.admin_community_stats_v1()
returns table (metric text, total bigint, last_week bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_since timestamptz := now() - interval '7 days';
begin
  if not public.is_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
    select 'members', count(*), count(*) filter (where p.onboarded_at > v_since)
    from public.profiles p where p.onboarded_at is not null
    union all
    select 'tastings', count(*), count(*) filter (where t.created_at > v_since)
    from public.tastings t where t.status = 'logged' and t.hidden_at is null
    union all
    select 'coffees', count(*), count(*) filter (where c.created_at > v_since)
    from public.coffees c
    union all
    select 'comments', count(*), count(*) filter (where m.created_at > v_since)
    from public.comments m where m.deleted_at is null and m.hidden_at is null
    union all
    select 'likes', count(*), count(*) filter (where l.created_at > v_since)
    from public.likes l
    union all
    select 'follows', count(*), count(*) filter (where f.created_at > v_since)
    from public.follows f
    union all
    select 'lists', count(*), count(*) filter (where s.created_at > v_since)
    from public.lists s where s.hidden_at is null
    union all
    select 'cafe_visits', count(*), count(*) filter (where v.created_at > v_since)
    from public.cafe_visits v where v.hidden_at is null;
end
$$;

comment on function public.admin_community_stats_v1 is
  'Admin: the community''s counts (members, tastings, coffees, comments, likes, follows, lists, café visits), in total and over the last seven days.';

revoke all on function public.admin_community_stats_v1 from public, anon;
grant execute on function public.admin_community_stats_v1 to authenticated, service_role;
