-- Reverts 20261024210000_workshop_rsvp.sql. Forgets the personal links, the answers and
-- when they were asked; the applications themselves stay.
drop function if exists public.answer_workshop_rsvp_v1(text, text);
drop function if exists public.workshop_rsvp_v1(text);

revoke update (rsvp_asked_at, reminded_at) on table public.workshop_applications from authenticated;

alter table public.workshop_applications
  drop constraint if exists workshop_applications_rsvp_token_unique,
  drop constraint if exists workshop_applications_rsvp_known,
  drop column if exists reminded_at,
  drop column if exists rsvp_asked_at,
  drop column if exists rsvp_at,
  drop column if exists rsvp,
  drop column if exists rsvp_token;

drop function if exists public.new_rsvp_token();
