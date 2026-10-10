-- Reverts 20261010133000_profiles.sql.
-- The trigger on auth.users goes with its function (CASCADE): dropping it by name would
-- require owning auth.users, which belongs to Supabase's auth service.
drop function if exists public.handle_new_user() cascade;
drop function if exists public.is_admin();
drop table if exists public.profiles;
drop function if exists public.set_updated_at();
drop type if exists public.user_role;
