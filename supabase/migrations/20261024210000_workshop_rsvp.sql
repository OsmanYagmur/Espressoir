-- Asking approved people whether they are coming (2026-10-24). Every application gets a
-- personal, unguessable token; the owner sends its link over WhatsApp from the admin panel,
-- and the person answers "Geliyorum" or "Gelemiyorum" on a page that needs no account.

-- ── the personal token ──────────────────────────────────────────────────────────────────
-- 122 random bits (a version 4 UUID), written as 22 URL-safe characters.
create or replace function public.new_rsvp_token()
returns text
language sql
volatile
set search_path = ''
as $$
  select translate(rtrim(encode(uuid_send(gen_random_uuid()), 'base64'), '='), '+/', '-_')
$$;

comment on function public.new_rsvp_token() is
  'A personal token for an application''s answer page: 22 URL-safe characters, 122 random bits.';

alter table public.workshop_applications
  add column rsvp_token text,
  add column rsvp text,
  add column rsvp_at timestamptz,
  add column rsvp_asked_at timestamptz,
  add column reminded_at timestamptz,
  add constraint workshop_applications_rsvp_known check (rsvp in ('yes', 'no'));

update public.workshop_applications
set rsvp_token = public.new_rsvp_token()
where rsvp_token is null;

alter table public.workshop_applications
  alter column rsvp_token set default public.new_rsvp_token(),
  alter column rsvp_token set not null,
  add constraint workshop_applications_rsvp_token_unique unique (rsvp_token);

comment on column public.workshop_applications.rsvp_token is
  'The key of the person''s answer page (/teyit/<token>); read by admins only.';
comment on column public.workshop_applications.rsvp is
  'yes: coming, no: not coming, null: no answer. Written only by answer_workshop_rsvp_v1.';
comment on column public.workshop_applications.rsvp_asked_at is
  'When the admin last sent the link asking for an answer.';
comment on column public.workshop_applications.reminded_at is
  'When the admin last sent the reminder shortly before the start.';

-- Admins note when they sent a message; nobody writes the token or the answer directly.
grant update (rsvp_asked_at, reminded_at) on table public.workshop_applications to authenticated;

-- ── the answer page ─────────────────────────────────────────────────────────────────────
-- What the page may show for a token: the person's first name and the workshop, nothing
-- else (no phone, no surname, no question), and whether an answer is taken now (approved,
-- not started: the database's clock, not the page's). No row for an unknown token.
create or replace function public.workshop_rsvp_v1(p_token text)
returns table (
  first_name text,
  workshop_title text,
  starts_at timestamptz,
  ends_at timestamptz,
  location_text text,
  status text,
  rsvp text,
  can_answer boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select split_part(a.name, ' ', 1), w.title, w.starts_at, w.ends_at, w.location_text,
         a.status, a.rsvp, a.status = 'approved' and now() < w.starts_at
  from public.workshop_applications a
  join public.workshops w on w.id = a.workshop_id
  where a.rsvp_token = p_token
$$;

-- The answer itself: only for an approved application, and only until the workshop starts.
-- It can be changed until then; the latest answer wins.
create or replace function public.answer_workshop_rsvp_v1(p_token text, p_answer text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_application public.workshop_applications;
  v_starts_at timestamptz;
begin
  if p_answer is null or p_answer not in ('yes', 'no') then
    raise exception 'rsvp_invalid' using errcode = 'P0001';
  end if;

  select * into v_application
  from public.workshop_applications a
  where a.rsvp_token = p_token
  for update;
  if not found then
    raise exception 'rsvp_not_found' using errcode = 'P0001';
  end if;
  if v_application.status <> 'approved' then
    raise exception 'rsvp_not_approved' using errcode = 'P0001';
  end if;

  select w.starts_at into v_starts_at from public.workshops w where w.id = v_application.workshop_id;
  if now() >= v_starts_at then
    raise exception 'rsvp_closed' using errcode = 'P0001';
  end if;

  update public.workshop_applications
  set rsvp = p_answer, rsvp_at = now()
  where id = v_application.id;
  return p_answer;
end;
$$;

revoke all on function public.workshop_rsvp_v1(text) from public;
revoke all on function public.answer_workshop_rsvp_v1(text, text) from public;
grant execute on function public.workshop_rsvp_v1(text) to anon, authenticated, service_role;
grant execute on function public.answer_workshop_rsvp_v1(text, text)
  to anon, authenticated, service_role;
