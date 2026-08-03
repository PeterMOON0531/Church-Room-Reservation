-- Seed default church rooms
insert into public.rooms (code, name, location, capacity, description, amenities, is_active)
values
  ('main-hall', '본당', '1층', 300, '주일 예배 및 대규모 집회 공간', '[]'::jsonb, true),
  ('chapel-2f', '2층 예배실', '2층', 80, '소규모 예배 및 기도회 공간', '[]'::jsonb, true),
  ('choir', '성가대실', '2층', 30, '성가대 연습 및 음악 사역 공간', '[]'::jsonb, true),
  ('nursery', '유아실', '1층', 20, '유아·아동 돌봄 및 교육 공간', '[]'::jsonb, true),
  ('meeting-1', '소회의실1', '3층', 12, '소그룹·회의용 공간', '[]'::jsonb, true),
  ('meeting-2', '소회의실2', '3층', 12, '소그룹·회의용 공간', '[]'::jsonb, true),
  ('cabin-1', '캐빈1', '별관', 6, '1:1 상담 및 소규모 모임 공간', '[]'::jsonb, true),
  ('cabin-2', '캐빈2', '별관', 6, '1:1 상담 및 소규모 모임 공간', '[]'::jsonb, true),
  ('cabin-3', '캐빈3', '별관', 6, '1:1 상담 및 소규모 모임 공간', '[]'::jsonb, true)
on conflict (code) do update
set
  name = excluded.name,
  location = excluded.location,
  capacity = excluded.capacity,
  description = excluded.description,
  is_active = excluded.is_active,
  updated_at = now();
