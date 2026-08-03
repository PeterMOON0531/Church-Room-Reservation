-- Holidays / church closed days
create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_date date not null unique,
  name text not null,
  description text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists holidays_holiday_date_idx
  on public.holidays (holiday_date);

comment on table public.holidays is '교회 휴일 / 예약 불가일';

drop trigger if exists set_holidays_updated_at on public.holidays;
create trigger set_holidays_updated_at
  before update on public.holidays
  for each row execute function public.set_updated_at();

alter table public.holidays enable row level security;

drop policy if exists holidays_select_authenticated on public.holidays;
create policy holidays_select_authenticated
  on public.holidays for select to authenticated
  using (true);

drop policy if exists holidays_manage_admin on public.holidays;
create policy holidays_manage_admin
  on public.holidays for all to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
