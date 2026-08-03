-- Reservation contact fields + department seed + delete policy

alter table public.reservations
  add column if not exists contact_name text,
  add column if not exists contact_phone text;

insert into public.departments (code, name, description, is_active)
values
  ('worship', '예배부', '예배 및 찬양 사역', true),
  ('education', '교육부', '교육·양육 사역', true),
  ('youth', '청년부', '청년 사역', true),
  ('children', '아동부', '유아·아동 사역', true),
  ('admin', '관리부', '행정·시설 관리', true),
  ('mission', '선교부', '선교·봉사 사역', true)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active,
  updated_at = now();

drop policy if exists reservations_delete_own_or_admin on public.reservations;
create policy reservations_delete_own_or_admin
  on public.reservations for delete to authenticated
  using (
    user_id = auth.uid()
    or public.current_user_role() = 'admin'
  );
