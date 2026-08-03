-- Reservation email notifications support
alter table public.reservations
  add column if not exists reminder_sent_at timestamptz;

create table if not exists public.reservation_email_logs (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid references public.reservations (id) on delete set null,
  user_id uuid references public.profiles (id) on delete set null,
  event text not null,
  to_email text not null,
  subject text,
  status text not null default 'sent',
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists reservation_email_logs_reservation_id_idx
  on public.reservation_email_logs (reservation_id);

create index if not exists reservation_email_logs_created_at_idx
  on public.reservation_email_logs (created_at desc);

create index if not exists reservations_reminder_sent_at_idx
  on public.reservations (reminder_sent_at);

alter table public.reservation_email_logs enable row level security;

drop policy if exists "Admins can read email logs" on public.reservation_email_logs;
create policy "Admins can read email logs"
  on public.reservation_email_logs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- Optional: schedule day-before reminders via Supabase Cron (Dashboard > Edge Functions)
-- Example cron expression: 0 9 * * * (매일 오전 9시)
-- Target function: send-reservation-reminders
