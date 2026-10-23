-- Workshops: coffee workshops for friends, and the applications to them. Anyone may apply
-- through the website's form, signed in or not; nobody but an admin reads an application.
-- The public sees each workshop and how many seats are left, nothing more.
-- Rollback: supabase/rollbacks/20261023120000_workshops.down.sql

-- ── workshops ───────────────────────────────────────────────────────────────────────────
create table public.workshops (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  -- Which program the page shows: apps/web/src/content/atolye/<program>.ts.
  program text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity smallint not null,
  -- As shown on the page ("450 ₺, malzeme dahil"): free text while the price may change.
  price_text text not null,
  -- What everyone may read (a district); the address goes out with the approval.
  location_text text,
  -- Taking applications. A closed workshop is not shown.
  is_open boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workshops_title_length check (char_length(title) between 1 and 120),
  constraint workshops_program_format check (program ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint workshops_ends_after_start check (ends_at > starts_at),
  constraint workshops_capacity_range check (capacity between 1 and 200),
  constraint workshops_price_text_length check (char_length(price_text) between 1 and 120),
  constraint workshops_location_text_length check (char_length(location_text) between 1 and 120)
);

create index workshops_starts_at_idx on public.workshops (starts_at);

create trigger workshops_set_updated_at
  before update on public.workshops
  for each row execute function public.set_updated_at();

-- ── applications ────────────────────────────────────────────────────────────────────────
create table public.workshop_applications (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops (id) on delete cascade,
  name text not null,
  -- A phone number or an Instagram handle, as typed.
  contact text not null,
  -- The same, reduced to what identifies it (kept by a trigger): one application each.
  contact_key text not null default '',
  -- How the applicant gets on with coffee (WORKSHOP_EXPERIENCES in @espressoir/core); a
  -- text with a check, not an enum.
  experience text not null,
  question text,
  consent boolean not null,
  -- pending → approved / rejected; waitlist when it came in after the seats ran out.
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workshop_applications_name_length check (char_length(name) between 2 and 80),
  constraint workshop_applications_contact_length check (char_length(contact) between 3 and 80),
  constraint workshop_applications_experience_known
    check (experience in ('new', 'regular', 'home_brewer')),
  constraint workshop_applications_question_length check (char_length(question) between 1 and 1000),
  constraint workshop_applications_consent_given check (consent),
  constraint workshop_applications_status_known
    check (status in ('pending', 'approved', 'rejected', 'waitlist')),
  constraint workshop_applications_one_per_contact unique (workshop_id, contact_key)
);

create index workshop_applications_workshop_idx
  on public.workshop_applications (workshop_id, created_at);

-- Seats taken: every application not turned down, the waitlist included (it is first in
-- line when a seat frees up).
create function public.workshop_seats_taken(p_workshop_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.workshop_applications a
  where a.workshop_id = p_workshop_id and a.status <> 'rejected'
$$;
comment on function public.workshop_seats_taken is
  'How many applications to a workshop were not rejected: the only thing the public learns about them.';

-- Tidies what was typed, and decides the status of a new application whoever sends it: the
-- workshop must be open and still ahead, a full one puts the applicant on the waitlist.
-- The workshop row is locked first, so two applications for the last seat take turns.
create function public.prepare_workshop_application()
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

  select * into v_workshop from public.workshops w where w.id = new.workshop_id for update;
  if not found or not v_workshop.is_open or v_workshop.starts_at <= now() then
    raise exception 'workshop_closed' using errcode = 'P0001';
  end if;

  -- The form is open to everyone, so a flood is stopped per workshop, not per person.
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

create trigger workshop_applications_prepare
  before insert on public.workshop_applications
  for each row execute function public.prepare_workshop_application();
create trigger workshop_applications_set_updated_at
  before update on public.workshop_applications
  for each row execute function public.set_updated_at();

revoke all on function public.prepare_workshop_application from public, anon, authenticated;
revoke all on function public.workshop_seats_taken from public;
grant execute on function public.workshop_seats_taken to anon, authenticated, service_role;

-- ── access ──────────────────────────────────────────────────────────────────────────────
alter table public.workshops enable row level security;
alter table public.workshop_applications enable row level security;

revoke all on table public.workshops, public.workshop_applications from anon, authenticated;
grant select on table public.workshops to anon, authenticated;
grant insert, update, delete on table public.workshops to authenticated;
-- Applicants write the form's fields and nothing else; the status is the trigger's.
grant insert (workshop_id, name, contact, experience, question, consent)
  on table public.workshop_applications to anon, authenticated;
-- An admin reads them, changes their status and deletes them (the policies below).
grant select, delete on table public.workshop_applications to authenticated;
grant update (status) on table public.workshop_applications to authenticated;
grant all on table public.workshops, public.workshop_applications to service_role;

create policy workshops_select_all on public.workshops
  for select to anon, authenticated
  using (true);
create policy workshops_insert_admin on public.workshops
  for insert to authenticated
  with check ((select public.is_admin()));
create policy workshops_update_admin on public.workshops
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy workshops_delete_admin on public.workshops
  for delete to authenticated
  using ((select public.is_admin()));

-- Anyone may apply (the trigger has checked the workshop and set the status by now). No
-- can_post(): applying is not posting, and visitors without an account apply too.
create policy workshop_applications_insert_all on public.workshop_applications
  for insert to anon, authenticated
  with check (status in ('pending', 'waitlist'));
create policy workshop_applications_select_admin on public.workshop_applications
  for select to authenticated
  using ((select public.is_admin()));
create policy workshop_applications_update_admin on public.workshop_applications
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy workshop_applications_delete_admin on public.workshop_applications
  for delete to authenticated
  using ((select public.is_admin()));

-- ── reads ───────────────────────────────────────────────────────────────────────────────
-- Every workshop with the seats left (capacity minus applications not rejected, never
-- below zero). What the page reads; it never sees an application.
create view public.workshop_overview
with (security_invoker = true)
as
select
  w.id as workshop_id,
  w.title,
  w.program,
  w.starts_at,
  w.ends_at,
  w.capacity,
  w.price_text,
  w.location_text,
  w.is_open,
  greatest(w.capacity - public.workshop_seats_taken(w.id), 0) as seats_left
from public.workshops w;

grant select on public.workshop_overview to anon, authenticated, service_role;

-- ── the first workshop ──────────────────────────────────────────────────────────────────
-- The date and the price are placeholders until they are settled; the admin panel
-- changes them.
insert into public.workshops (
  title, program, starts_at, ends_at, capacity, price_text, location_text, is_open
)
values (
  'Kahveye giriş atölyesi',
  'kahveye-giris',
  '2026-11-22 14:00:00+03',
  '2026-11-22 16:30:00+03',
  8,
  'Ücretli. Tutar kesinleşince burada yazacak.',
  'Kadıköy, İstanbul',
  true
);
