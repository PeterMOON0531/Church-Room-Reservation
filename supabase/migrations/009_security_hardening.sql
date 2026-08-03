-- Commercial security hardening

-- 1) Prevent privilege escalation on profiles
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

-- 2) Force safe reservation insert/update status transitions
create or replace function public.enforce_reservation_status_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  role text := coalesce(public.current_user_role(), 'user');
  is_elevated boolean := role in ('admin', 'department_head');
begin
  if tg_op = 'INSERT' then
    -- App users always start as pending. SQL Editor (auth.uid() is null) may seed approved rows.
    if auth.uid() is not null then
      new.status := 'pending';
      new.approved_by := null;
      new.approved_at := null;
      new.rejection_reason := null;
      new.reminder_sent_at := null;
    else
      if new.status is null then
        new.status := 'pending';
      end if;
      if new.status = 'approved' and new.approved_at is null then
        new.approved_at := now();
      end if;
    end if;
    return new;
  end if;

  if auth.uid() is null then
    return new;
  end if;

  if not is_elevated then
    -- Owners may cancel only; cannot approve/reject themselves
    if new.status is distinct from old.status then
      if not (
        new.status = 'cancelled'
        and old.status in ('pending', 'approved')
      ) then
        raise exception '예약 상태는 관리자만 변경할 수 있습니다.';
      end if;
    end if;

    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;
    if new.status <> 'cancelled' then
      new.rejection_reason := old.rejection_reason;
    end if;
  end if;

  -- Department heads may only manage their department
  if role = 'department_head' then
    if new.department_id is distinct from (
      select p.department_id from public.profiles p where p.id = auth.uid()
    ) and old.department_id is distinct from (
      select p.department_id from public.profiles p where p.id = auth.uid()
    ) then
      raise exception '다른 부서 예약은 처리할 수 없습니다.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists reservations_enforce_status on public.reservations;
create trigger reservations_enforce_status
  before insert or update on public.reservations
  for each row
  execute function public.enforce_reservation_status_rules();

-- 3) Block bookings on holidays
create or replace function public.prevent_holiday_reservations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_date date := (new.start_at at time zone 'Pacific/Auckland')::date;
begin
  if exists (
    select 1 from public.holidays h where h.holiday_date = booking_date
  ) then
    raise exception '휴일에는 예약할 수 없습니다.';
  end if;
  return new;
end;
$$;

drop trigger if exists reservations_block_holidays on public.reservations;
create trigger reservations_block_holidays
  before insert or update of start_at, end_at on public.reservations
  for each row
  execute function public.prevent_holiday_reservations();

-- 4) Scope department_head reservation visibility
drop policy if exists reservations_select_own_or_elevated on public.reservations;
create policy reservations_select_own_or_elevated
  on public.reservations
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.current_user_role() = 'admin'
    or (
      public.current_user_role() = 'department_head'
      and department_id = (
        select p.department_id from public.profiles p where p.id = auth.uid()
      )
    )
  );

drop policy if exists reservations_update_own_or_approver on public.reservations;
create policy reservations_update_own_or_approver
  on public.reservations
  for update
  to authenticated
  using (
    user_id = auth.uid()
    or public.current_user_role() = 'admin'
    or (
      public.current_user_role() = 'department_head'
      and department_id = (
        select p.department_id from public.profiles p where p.id = auth.uid()
      )
    )
  )
  with check (
    user_id = auth.uid()
    or public.current_user_role() = 'admin'
    or (
      public.current_user_role() = 'department_head'
      and department_id = (
        select p.department_id from public.profiles p where p.id = auth.uid()
      )
    )
  );

drop policy if exists reservations_insert_authenticated on public.reservations;
create policy reservations_insert_authenticated
  on public.reservations
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
  );

-- 5) Conflict RPC: require auth, hide contact PII
create or replace function public.find_reservation_conflicts(
  p_room_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_exclude_id uuid default null
)
returns table (
  id uuid,
  contact_name text,
  start_at timestamptz,
  end_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  return query
  select
    r.id,
    '예약됨'::text as contact_name,
    r.start_at,
    r.end_at
  from public.reservations r
  where r.room_id = p_room_id
    and r.status not in ('cancelled', 'rejected')
    and (p_exclude_id is null or r.id <> p_exclude_id)
    and r.start_at < p_end_at
    and r.end_at > p_start_at
    and ((r.start_at at time zone 'Pacific/Auckland')::date)
      = ((p_start_at at time zone 'Pacific/Auckland')::date)
  order by r.start_at asc;
end;
$$;

revoke all on function public.find_reservation_conflicts(uuid, timestamptz, timestamptz, uuid) from public;
grant execute on function public.find_reservation_conflicts(uuid, timestamptz, timestamptz, uuid) to authenticated;

-- 6) Reminder query index
create index if not exists reservations_reminder_due_idx
  on public.reservations (start_at)
  where status = 'approved' and reminder_sent_at is null;

-- 7) Text length guards
alter table public.reservations
  drop constraint if exists reservations_title_length;
alter table public.reservations
  add constraint reservations_title_length check (char_length(title) <= 120);

alter table public.reservations
  drop constraint if exists reservations_purpose_length;
alter table public.reservations
  add constraint reservations_purpose_length check (
    purpose is null or char_length(purpose) <= 500
  );

alter table public.reservations
  drop constraint if exists reservations_notes_length;
alter table public.reservations
  add constraint reservations_notes_length check (
    notes is null or char_length(notes) <= 1000
  );

alter table public.reservations
  drop constraint if exists reservations_contact_name_length;
alter table public.reservations
  add constraint reservations_contact_name_length check (
    contact_name is null or char_length(contact_name) <= 80
  );

alter table public.reservations
  drop constraint if exists reservations_contact_phone_length;
alter table public.reservations
  add constraint reservations_contact_phone_length check (
    contact_phone is null or char_length(contact_phone) <= 40
  );

-- 8) Restrict audit log inserts to service role / definer paths only
drop policy if exists audit_logs_insert_authenticated on public.audit_logs;
