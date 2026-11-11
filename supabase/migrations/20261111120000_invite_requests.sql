-- Invitation requests: while signup is closed, a visitor who wants to join leaves an e-mail
-- address and, if they like, a sentence. Anyone may ask, signed in or not; nobody but an
-- admin reads a request. The admin panel lists them and sends the invitation from there.
-- Rollback: supabase/rollbacks/20261111120000_invite_requests.down.sql

create table public.invite_requests (
  id uuid primary key default gen_random_uuid(),
  -- Kept trimmed and in small letters by the trigger: one request per address.
  email text not null,
  note text,
  consent boolean not null,
  -- pending → invited (an invitation went out) / dismissed. Text with a check, not an enum
  -- (INVITE_REQUEST_STATUSES in @espressoir/core; a test compares the two).
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invite_requests_email_format
    check (char_length(email) between 6 and 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint invite_requests_note_length check (char_length(note) between 1 and 500),
  constraint invite_requests_consent_given check (consent),
  constraint invite_requests_status_known check (status in ('pending', 'invited', 'dismissed')),
  constraint invite_requests_one_per_email unique (email)
);

create index invite_requests_status_idx on public.invite_requests (status, created_at);

-- Tidies what was typed, stamps the time and stops a flood. The form is open to everyone,
-- so the limit is on the table as a whole, not per person.
create function public.prepare_invite_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recent integer;
begin
  new.email := lower(btrim(coalesce(new.email, '')));
  new.note := nullif(btrim(regexp_replace(coalesce(new.note, ''), '\s+', ' ', 'g')), '');
  new.status := 'pending';
  new.created_at := now();

  select count(*) into v_recent
  from public.invite_requests r
  where r.created_at > now() - interval '10 minutes';
  if v_recent >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001', detail = 'invite_requests';
  end if;
  return new;
end
$$;

create trigger invite_requests_prepare
  before insert on public.invite_requests
  for each row execute function public.prepare_invite_request();
create trigger invite_requests_set_updated_at
  before update on public.invite_requests
  for each row execute function public.set_updated_at();

revoke all on function public.prepare_invite_request from public, anon, authenticated;

-- ── access ──────────────────────────────────────────────────────────────────────────────
alter table public.invite_requests enable row level security;

revoke all on table public.invite_requests from anon, authenticated;
-- A visitor writes the form's fields and nothing else; the status is the trigger's.
grant insert (email, note, consent) on table public.invite_requests to anon, authenticated;
-- An admin reads them, changes their status and deletes them (the policies below).
grant select, delete on table public.invite_requests to authenticated;
grant update (status) on table public.invite_requests to authenticated;
grant all on table public.invite_requests to service_role;

-- No can_post(): asking for an invitation is not posting, and the asker has no account.
create policy invite_requests_insert_all on public.invite_requests
  for insert to anon, authenticated
  with check (status = 'pending');
create policy invite_requests_select_admin on public.invite_requests
  for select to authenticated
  using ((select public.is_admin()));
create policy invite_requests_update_admin on public.invite_requests
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy invite_requests_delete_admin on public.invite_requests
  for delete to authenticated
  using ((select public.is_admin()));
