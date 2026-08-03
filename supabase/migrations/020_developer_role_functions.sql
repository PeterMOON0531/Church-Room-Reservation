-- STEP 2/2 — run AFTER 019_add_developer_enum.sql has succeeded.
-- Developer can designate church admins from the app.
-- Bootstrap yourself once:
--   update public.profiles set role = 'developer' where email = 'you@example.com';

comment on column public.profiles.role is 'developer | admin | department_head | user';

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text := coalesce(public.current_user_role()::text, 'user');
begin
  if tg_op = 'UPDATE' then
    if new.role is distinct from old.role
       and auth.uid() is not null
       and caller_role not in ('admin', 'developer') then
      raise exception '역할은 개발자 또는 관리자만 변경할 수 있습니다.';
    end if;

    if new.is_active is distinct from old.is_active
       and auth.uid() is not null
       and caller_role not in ('admin', 'developer') then
      raise exception '계정 활성 상태는 개발자 또는 관리자만 변경할 수 있습니다.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_privileges on public.profiles;
create trigger profiles_guard_privileges
  before update on public.profiles
  for each row
  execute function public.prevent_profile_privilege_escalation();

drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists profiles_select_elevated on public.profiles;
create policy profiles_select_elevated
  on public.profiles
  for select
  to authenticated
  using (public.current_user_role() in ('admin', 'developer'));

create or replace function public.set_user_role(
  p_user_id uuid,
  p_role public.user_role
)
returns public.profiles
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  caller_role public.user_role;
  target public.profiles;
  developer_count integer;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  caller_role := public.current_user_role();
  if caller_role is null or caller_role not in ('developer', 'admin') then
    raise exception '역할 변경 권한이 없습니다.';
  end if;

  select * into target from public.profiles where id = p_user_id for update;
  if target.id is null then
    raise exception '사용자를 찾을 수 없습니다.';
  end if;

  if (p_role = 'developer' or target.role = 'developer')
     and caller_role <> 'developer' then
    raise exception '개발자 역할은 개발자만 변경할 수 있습니다.';
  end if;

  if caller_role = 'admin' then
    if target.role = 'admin' or p_role = 'admin' then
      raise exception '관리자 지정·해제는 개발자만 할 수 있습니다.';
    end if;
    if p_role not in ('department_head', 'user') then
      raise exception '허용되지 않은 역할입니다.';
    end if;
  end if;

  if target.role = 'developer' and p_role <> 'developer' then
    select count(*) into developer_count
    from public.profiles
    where role = 'developer';
    if developer_count <= 1 then
      raise exception '마지막 개발자 역할은 해제할 수 없습니다.';
    end if;
  end if;

  update public.profiles
  set role = p_role, updated_at = now()
  where id = p_user_id
  returning * into target;

  return target;
end;
$$;

revoke all on function public.set_user_role(uuid, public.user_role) from public;
grant execute on function public.set_user_role(uuid, public.user_role) to authenticated;

create or replace function public.set_user_active(
  p_user_id uuid,
  p_is_active boolean
)
returns public.profiles
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  caller_role public.user_role;
  target public.profiles;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  caller_role := public.current_user_role();
  if caller_role is null or caller_role not in ('developer', 'admin') then
    raise exception '계정 활성 상태를 변경할 권한이 없습니다.';
  end if;

  select * into target from public.profiles where id = p_user_id for update;
  if target.id is null then
    raise exception '사용자를 찾을 수 없습니다.';
  end if;

  if target.role = 'developer' and caller_role <> 'developer' then
    raise exception '개발자 계정은 개발자만 변경할 수 있습니다.';
  end if;

  if p_user_id = auth.uid() and p_is_active = false then
    raise exception '본인 계정은 비활성화할 수 없습니다.';
  end if;

  update public.profiles
  set is_active = p_is_active, updated_at = now()
  where id = p_user_id
  returning * into target;

  return target;
end;
$$;

revoke all on function public.set_user_active(uuid, boolean) from public;
grant execute on function public.set_user_active(uuid, boolean) to authenticated;
