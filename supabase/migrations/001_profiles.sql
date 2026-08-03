-- Supabase SQL: profiles table and role-based auth setup
-- Run in Supabase Dashboard > SQL Editor

create type public.user_role as enum ('admin', 'department_head', 'user');

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- SECURITY DEFINER prevents profiles policies from recursively evaluating
-- themselves while checking the current user's role.
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

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_select_admin"
  on public.profiles
  for select
  to authenticated
  using (public.current_user_role() = 'admin');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'user'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Example: promote a user to admin (run manually)
-- update public.profiles set role = 'admin' where email = 'admin@church.org';
