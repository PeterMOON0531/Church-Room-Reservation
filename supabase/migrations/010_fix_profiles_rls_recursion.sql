-- Fix: "infinite recursion detected in policy for relation profiles"
--
-- A policy on profiles must not query profiles directly. Use SECURITY DEFINER
-- helpers so the lookup bypasses profiles RLS and cannot recurse.

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = pg_catalog, public
set row_security = off
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated;

-- Remove the recursive policy created by 001_profiles.sql.
drop policy if exists "profiles_select_admin" on public.profiles;

create policy "profiles_select_admin"
  on public.profiles
  for select
  to authenticated
  using (public.current_user_role() = 'admin');
