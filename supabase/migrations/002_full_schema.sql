-- =============================================================================
-- 교회 방 예약 시스템 — Supabase 전체 스키마
-- 실행 순서: 001_profiles.sql 이후 본 파일 실행
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) 공통 enum
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'reservation_status') then
    create type public.reservation_status as enum (
      'pending',
      'approved',
      'rejected',
      'cancelled',
      'completed'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type public.notification_type as enum (
      'info',
      'reservation',
      'approval',
      'system'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'permission_action') then
    create type public.permission_action as enum (
      'create',
      'read',
      'update',
      'delete',
      'approve',
      'manage'
    );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2) 부서 (departments)
-- ---------------------------------------------------------------------------
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  head_user_id uuid references public.profiles (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists departments_head_user_id_idx
  on public.departments (head_user_id);

comment on table public.departments is '교회 부서';
comment on column public.departments.head_user_id is '부서장 (profiles.id)';

-- ---------------------------------------------------------------------------
-- 3) 사용자 (profiles) — 부서 연결 추가
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists phone text,
  add column if not exists department_id uuid references public.departments (id) on delete set null,
  add column if not exists is_active boolean not null default true;

create index if not exists profiles_department_id_idx
  on public.profiles (department_id);

create index if not exists profiles_role_idx
  on public.profiles (role);

comment on table public.profiles is '사용자 프로필 (auth.users 1:1)';
comment on column public.profiles.role is 'admin | department_head | user';

-- ---------------------------------------------------------------------------
-- 4) 권한 (permissions) — 역할별 리소스 권한 매트릭스
-- ---------------------------------------------------------------------------
create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  role public.user_role not null,
  resource text not null,
  action public.permission_action not null,
  allowed boolean not null default true,
  description text,
  created_at timestamptz not null default now(),
  unique (role, resource, action)
);

create index if not exists permissions_role_idx
  on public.permissions (role);

comment on table public.permissions is '역할(관리자/부서장/일반사용자)별 권한 정의';
comment on column public.permissions.resource is '예: rooms, reservations, users, departments';

-- ---------------------------------------------------------------------------
-- 5) 방 (rooms)
-- ---------------------------------------------------------------------------
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  location text,
  capacity integer not null default 1 check (capacity > 0),
  department_id uuid references public.departments (id) on delete set null,
  description text,
  amenities jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rooms_department_id_idx
  on public.rooms (department_id);

create index if not exists rooms_is_active_idx
  on public.rooms (is_active);

comment on table public.rooms is '예약 가능한 교회 방/공간';

-- ---------------------------------------------------------------------------
-- 6) 예약 (reservations)
-- ---------------------------------------------------------------------------
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete restrict,
  department_id uuid references public.departments (id) on delete set null,
  title text not null,
  purpose text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status public.reservation_status not null default 'pending',
  attendee_count integer check (attendee_count is null or attendee_count > 0),
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  rejection_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservations_time_range_check check (end_at > start_at)
);

create index if not exists reservations_room_id_idx
  on public.reservations (room_id);

create index if not exists reservations_user_id_idx
  on public.reservations (user_id);

create index if not exists reservations_department_id_idx
  on public.reservations (department_id);

create index if not exists reservations_status_idx
  on public.reservations (status);

create index if not exists reservations_time_range_idx
  on public.reservations (room_id, start_at, end_at);

comment on table public.reservations is '방 예약 신청/확정 내역';

-- 동일 방의 겹치는 확정(approved) 예약 방지 (GiST exclusion)
create extension if not exists btree_gist;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservations_no_overlap_approved'
  ) then
    alter table public.reservations
      add constraint reservations_no_overlap_approved
      exclude using gist (
        room_id with =,
        tstzrange(start_at, end_at, '[)') with &&
      )
      where (status = 'approved');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 7) 예약이력 (reservation_histories)
-- ---------------------------------------------------------------------------
create table if not exists public.reservation_histories (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  changed_by uuid references public.profiles (id) on delete set null,
  action text not null,
  old_values jsonb,
  new_values jsonb,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists reservation_histories_reservation_id_idx
  on public.reservation_histories (reservation_id);

create index if not exists reservation_histories_created_at_idx
  on public.reservation_histories (created_at desc);

comment on table public.reservation_histories is '예약 상태/내용 변경 이력';

-- ---------------------------------------------------------------------------
-- 8) 알림 (notifications)
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null default 'info',
  title text not null,
  body text not null,
  reservation_id uuid references public.reservations (id) on delete set null,
  is_read boolean not null default false,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx
  on public.notifications (user_id);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, is_read)
  where is_read = false;

comment on table public.notifications is '사용자 알림';

-- ---------------------------------------------------------------------------
-- 9) 감사로그 (audit_logs)
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_actor_id_idx
  on public.audit_logs (actor_id);

create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id);

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

comment on table public.audit_logs is '시스템 전반 감사 로그';

-- ---------------------------------------------------------------------------
-- 10) updated_at 자동 갱신
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_departments_updated_at on public.departments;
create trigger set_departments_updated_at
  before update on public.departments
  for each row execute function public.set_updated_at();

drop trigger if exists set_rooms_updated_at on public.rooms;
create trigger set_rooms_updated_at
  before update on public.rooms
  for each row execute function public.set_updated_at();

drop trigger if exists set_reservations_updated_at on public.reservations;
create trigger set_reservations_updated_at
  before update on public.reservations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 11) 예약 변경 시 이력 자동 기록
-- ---------------------------------------------------------------------------
create or replace function public.log_reservation_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_actor uuid;
begin
  v_actor := auth.uid();

  if tg_op = 'INSERT' then
    v_action := 'created';
    insert into public.reservation_histories (
      reservation_id, changed_by, action, old_values, new_values
    ) values (
      new.id, v_actor, v_action, null, to_jsonb(new)
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.status is distinct from new.status then
      v_action := 'status_' || new.status::text;
    else
      v_action := 'updated';
    end if;

    insert into public.reservation_histories (
      reservation_id, changed_by, action, old_values, new_values
    ) values (
      new.id, v_actor, v_action, to_jsonb(old), to_jsonb(new)
    );
    return new;
  end if;

  return null;
end;
$$;

drop trigger if exists reservation_history_on_change on public.reservations;
create trigger reservation_history_on_change
  after insert or update on public.reservations
  for each row execute function public.log_reservation_change();

-- ---------------------------------------------------------------------------
-- 12) 기본 권한 시드 (관리자 / 부서장 / 일반사용자)
-- ---------------------------------------------------------------------------
insert into public.permissions (role, resource, action, allowed, description)
values
  -- admin
  ('admin', 'users', 'manage', true, '사용자 전체 관리'),
  ('admin', 'departments', 'manage', true, '부서 전체 관리'),
  ('admin', 'rooms', 'manage', true, '방 전체 관리'),
  ('admin', 'reservations', 'manage', true, '예약 전체 관리'),
  ('admin', 'reservations', 'approve', true, '예약 승인/거절'),
  ('admin', 'permissions', 'manage', true, '권한 관리'),
  ('admin', 'audit_logs', 'read', true, '감사로그 조회'),
  -- department_head
  ('department_head', 'rooms', 'read', true, '방 조회'),
  ('department_head', 'reservations', 'create', true, '예약 신청'),
  ('department_head', 'reservations', 'read', true, '부서 예약 조회'),
  ('department_head', 'reservations', 'approve', true, '부서 예약 승인'),
  ('department_head', 'users', 'read', true, '부서원 조회'),
  -- user
  ('user', 'rooms', 'read', true, '방 조회'),
  ('user', 'reservations', 'create', true, '예약 신청'),
  ('user', 'reservations', 'read', true, '본인 예약 조회'),
  ('user', 'reservations', 'update', true, '본인 예약 수정')
on conflict (role, resource, action) do nothing;

-- ---------------------------------------------------------------------------
-- 13) RLS
-- ---------------------------------------------------------------------------
alter table public.departments enable row level security;
alter table public.rooms enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_histories enable row level security;
alter table public.notifications enable row level security;
alter table public.permissions enable row level security;
alter table public.audit_logs enable row level security;

-- helper: 현재 사용자 역할
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

-- departments
drop policy if exists departments_select_authenticated on public.departments;
create policy departments_select_authenticated
  on public.departments for select to authenticated
  using (true);

drop policy if exists departments_manage_admin on public.departments;
create policy departments_manage_admin
  on public.departments for all to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- rooms
drop policy if exists rooms_select_authenticated on public.rooms;
create policy rooms_select_authenticated
  on public.rooms for select to authenticated
  using (is_active = true or public.current_user_role() = 'admin');

drop policy if exists rooms_manage_admin on public.rooms;
create policy rooms_manage_admin
  on public.rooms for all to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- reservations
drop policy if exists reservations_select_own_or_elevated on public.reservations;
create policy reservations_select_own_or_elevated
  on public.reservations for select to authenticated
  using (
    user_id = auth.uid()
    or public.current_user_role() in ('admin', 'department_head')
  );

drop policy if exists reservations_insert_authenticated on public.reservations;
create policy reservations_insert_authenticated
  on public.reservations for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists reservations_update_own_or_approver on public.reservations;
create policy reservations_update_own_or_approver
  on public.reservations for update to authenticated
  using (
    user_id = auth.uid()
    or public.current_user_role() in ('admin', 'department_head')
  )
  with check (
    user_id = auth.uid()
    or public.current_user_role() in ('admin', 'department_head')
  );

-- reservation_histories
drop policy if exists reservation_histories_select on public.reservation_histories;
create policy reservation_histories_select
  on public.reservation_histories for select to authenticated
  using (
    exists (
      select 1 from public.reservations r
      where r.id = reservation_id
        and (
          r.user_id = auth.uid()
          or public.current_user_role() in ('admin', 'department_head')
        )
    )
  );

-- notifications
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
  on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- permissions
drop policy if exists permissions_select_authenticated on public.permissions;
create policy permissions_select_authenticated
  on public.permissions for select to authenticated
  using (true);

drop policy if exists permissions_manage_admin on public.permissions;
create policy permissions_manage_admin
  on public.permissions for all to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- audit_logs
drop policy if exists audit_logs_select_admin on public.audit_logs;
create policy audit_logs_select_admin
  on public.audit_logs for select to authenticated
  using (public.current_user_role() = 'admin');

drop policy if exists audit_logs_insert_authenticated on public.audit_logs;
create policy audit_logs_insert_authenticated
  on public.audit_logs for insert to authenticated
  with check (actor_id = auth.uid() or actor_id is null);
