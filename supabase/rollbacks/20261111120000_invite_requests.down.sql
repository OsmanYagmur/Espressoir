-- Reverts 20261111120000_invite_requests.sql. Forgets every invitation request; accounts
-- and invitations already sent are not touched.
drop table if exists public.invite_requests;
drop function if exists public.prepare_invite_request();
