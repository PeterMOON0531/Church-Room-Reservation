-- Fix church timezone helpers to New Zealand (Pacific/Auckland).
-- After running this, re-run 012_seed_weekly_worship.sql to rebuild reservations
-- with NZ local times (so Sunday stays Sunday in New Zealand).

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
