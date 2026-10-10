-- Reverts 20261010133000_profiles.sql.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.is_admin();
drop function if exists public.handle_new_user();
drop table if exists public.profiles;
drop function if exists public.set_updated_at();
drop type if exists public.user_role;
