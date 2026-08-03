-- Delete ALL reservations and related rows.
-- Run in Supabase Dashboard > SQL Editor.

begin;

alter table public.reservations disable trigger reservations_block_holidays;
alter table public.reservations disable trigger reservations_enforce_status;

delete from public.reservation_histories;
delete from public.reservation_email_logs;
delete from public.reservations;

alter table public.reservations enable trigger reservations_enforce_status;
alter table public.reservations enable trigger reservations_block_holidays;

commit;

-- Verify
select count(*) as remaining_reservations from public.reservations;
