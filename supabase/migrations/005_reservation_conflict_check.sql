-- Allow authenticated users to detect room schedule conflicts securely

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
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.contact_name,
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
$$;

revoke all on function public.find_reservation_conflicts(uuid, timestamptz, timestamptz, uuid) from public;
grant execute on function public.find_reservation_conflicts(uuid, timestamptz, timestamptz, uuid) to authenticated;
