-- Reverts 20261024120000_workshop_admin.sql. Forgets which applications were added from
-- the panel and who came; the applications themselves stay.
drop function if exists public.admin_community_stats_v1();

drop policy if exists workshop_applications_insert_admin on public.workshop_applications;
revoke update (attended) on table public.workshop_applications from authenticated;
revoke insert (status) on table public.workshop_applications from authenticated;

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
  new.contact_key := case
    when new.contact ~ '[[:alpha:]]' then lower(regexp_replace(new.contact, '[@\s]', '', 'g'))
    else right(regexp_replace(new.contact, '\D', '', 'g'), 10)
  end;

  select * into v_workshop from public.workshops w where w.id = new.workshop_id for update;
  if not found or not v_workshop.is_open or v_workshop.starts_at <= now() then
    raise exception 'workshop_closed' using errcode = 'P0001';
  end if;

  new.created_at := now();
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

alter table public.workshop_applications
  drop column if exists attended,
  drop column if exists source;
