-- Reverts 20261011090100_account_rpcs.sql.
drop function if exists public.delete_my_account_v1();
drop function if exists public.export_my_data_v1();
drop function if exists public.complete_onboarding_v1(text, text, text);
