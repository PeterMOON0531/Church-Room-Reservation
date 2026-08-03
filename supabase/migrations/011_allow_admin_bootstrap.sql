-- Allow trusted SQL Editor/service-role maintenance while continuing to block
-- authenticated users from promoting themselves through the public API.
create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.role is distinct from old.role
       and auth.uid() is not null
       and coalesce(public.current_user_role(), 'user') <> 'admin' then
      raise exception '역할은 관리자만 변경할 수 있습니다.';
    end if;

    if new.is_active is distinct from old.is_active
       and auth.uid() is not null
       and coalesce(public.current_user_role(), 'user') <> 'admin' then
      raise exception '계정 활성 상태는 관리자만 변경할 수 있습니다.';
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
