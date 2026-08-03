-- Optional recurrence grouping for bulk reservations
alter table public.reservations
  add column if not exists recurrence_group_id uuid;

create index if not exists reservations_recurrence_group_id_idx
  on public.reservations (recurrence_group_id);
