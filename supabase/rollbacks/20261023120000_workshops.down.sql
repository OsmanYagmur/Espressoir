-- Reverts 20261023120000_workshops.sql. Deletes every workshop and application.
drop view if exists public.workshop_overview;
drop table if exists public.workshop_applications;
drop table if exists public.workshops;
drop function if exists public.prepare_workshop_application();
drop function if exists public.workshop_seats_taken(uuid);
