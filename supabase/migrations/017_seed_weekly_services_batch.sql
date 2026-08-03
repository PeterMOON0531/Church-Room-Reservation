-- 정기 예배 추가 시드 (승인완료, 52주)
-- Supabase Dashboard > SQL Editor에서 실행하세요.
-- 시간대: Pacific/Auckland
--
-- 1) 본당 일 19:30–20:30 주일 저녁예배
-- 2) 본당 수 19:30–20:30 수요예배
-- 3) 2층 예배실 일 11:00–12:30 청소년부 예배
-- 4) 2층 예배실 일 13:30–15:00 청년부 예배
-- 5) 성가대실 일 10:00–11:00 성가대연습
-- 6) 성가대실 일 11:00–12:00 유초등부 예배
--    ※ 요청은 2층 예배실이었으나 청소년부(11:00–12:30)와 겹쳐 성가대실로 등록
-- 7) 유아실 일 11:00–12:00 유아부 예배
--
-- IMPORTANT: cast date + time to timestamp WITHOUT time zone before AT TIME ZONE.

do $$
declare
  v_user_id uuid;
  v_contact_name text;
  v_contact_phone text;
  v_main uuid;
  v_chapel uuid;
  v_choir uuid;
  v_nursery uuid;
  v_first_sunday date := date '2026-08-09';
  v_last_sunday date := date '2026-08-09' + interval '51 weeks';
  v_first_wednesday date := date '2026-08-05';
  v_last_wednesday date := date '2026-08-05' + interval '51 weeks';
  v_group uuid;
  v_inserted integer;
  v_total integer := 0;
begin
  select id, coalesce(nullif(full_name, ''), email), phone
  into v_user_id, v_contact_name, v_contact_phone
  from public.profiles
  where role = 'admin'
  order by updated_at desc nulls last, created_at desc
  limit 1;

  if v_user_id is null then
    select id, coalesce(nullif(full_name, ''), email), phone
    into v_user_id, v_contact_name, v_contact_phone
    from public.profiles
    order by created_at
    limit 1;
  end if;

  if v_user_id is null then
    raise exception 'profiles에 사용자가 없습니다. 먼저 회원가입/로그인을 해 주세요.';
  end if;

  select id into v_main from public.rooms where code = 'main-hall' limit 1;
  select id into v_chapel from public.rooms where code = 'chapel-2f' limit 1;
  select id into v_choir from public.rooms where code = 'choir' limit 1;
  select id into v_nursery from public.rooms where code = 'nursery' limit 1;

  if v_main is null or v_chapel is null or v_choir is null or v_nursery is null then
    raise exception '본당/2층예배실/성가대실/유아실을 찾을 수 없습니다. rooms 시드를 먼저 적용하세요.';
  end if;

  alter table public.reservations disable trigger reservations_block_holidays;
  alter table public.reservations disable trigger reservations_enforce_status;

  -- 재실행 시 동일 제목 정리
  delete from public.reservation_histories
  where reservation_id in (
    select id from public.reservations
    where title in (
      '주일 저녁예배', '주일 찬양예배',
      '수요예배',
      '청소년부 예배',
      '청년부 예배',
      '성가대연습', '성가대 연습',
      '유초등부 예배', '우초등부 예배',
      '유아부 예배'
    )
  );

  begin
    delete from public.reservation_email_logs
    where reservation_id in (
      select id from public.reservations
      where title in (
        '주일 저녁예배', '주일 찬양예배',
        '수요예배',
        '청소년부 예배',
        '청년부 예배',
        '성가대연습', '성가대 연습',
        '유초등부 예배', '우초등부 예배',
        '유아부 예배'
      )
    );
  exception
    when undefined_table then null;
  end;

  delete from public.reservations
  where title in (
    '주일 저녁예배', '주일 찬양예배',
    '수요예배',
    '청소년부 예배',
    '청년부 예배',
    '성가대연습', '성가대 연습',
    '유초등부 예배', '우초등부 예배',
    '유아부 예배'
  );

  -- 1) 본당 주일 저녁예배
  v_group := gen_random_uuid();
  insert into public.reservations (
    room_id, user_id, title, purpose, contact_name, contact_phone,
    start_at, end_at, status, notes, approved_by, approved_at, recurrence_group_id
  )
  select
    v_main, v_user_id, '주일 저녁예배', '주일 저녁예배',
    v_contact_name, v_contact_phone,
    ((d::date + time '19:30')::timestamp without time zone at time zone 'Pacific/Auckland'),
    ((d::date + time '20:30')::timestamp without time zone at time zone 'Pacific/Auckland'),
    'approved', '정기 예배 (자동 승인)', v_user_id, now(), v_group
  from generate_series(v_first_sunday, v_last_sunday, interval '7 days') as g(d);
  get diagnostics v_inserted = row_count;
  if v_inserted <> 52 then raise exception '주일 저녁예배: 예상 52건이 아닌 %건', v_inserted; end if;
  v_total := v_total + v_inserted;

  -- 2) 본당 수요예배
  v_group := gen_random_uuid();
  insert into public.reservations (
    room_id, user_id, title, purpose, contact_name, contact_phone,
    start_at, end_at, status, notes, approved_by, approved_at, recurrence_group_id
  )
  select
    v_main, v_user_id, '수요예배', '수요예배',
    v_contact_name, v_contact_phone,
    ((d::date + time '19:30')::timestamp without time zone at time zone 'Pacific/Auckland'),
    ((d::date + time '20:30')::timestamp without time zone at time zone 'Pacific/Auckland'),
    'approved', '정기 예배 (자동 승인)', v_user_id, now(), v_group
  from generate_series(v_first_wednesday, v_last_wednesday, interval '7 days') as g(d);
  get diagnostics v_inserted = row_count;
  if v_inserted <> 52 then raise exception '수요예배: 예상 52건이 아닌 %건', v_inserted; end if;
  v_total := v_total + v_inserted;

  -- 3) 2층 예배실 청소년부 예배
  v_group := gen_random_uuid();
  insert into public.reservations (
    room_id, user_id, title, purpose, contact_name, contact_phone,
    start_at, end_at, status, notes, approved_by, approved_at, recurrence_group_id
  )
  select
    v_chapel, v_user_id, '청소년부 예배', '청소년부 예배',
    v_contact_name, v_contact_phone,
    ((d::date + time '11:00')::timestamp without time zone at time zone 'Pacific/Auckland'),
    ((d::date + time '12:30')::timestamp without time zone at time zone 'Pacific/Auckland'),
    'approved', '정기 예배 (자동 승인)', v_user_id, now(), v_group
  from generate_series(v_first_sunday, v_last_sunday, interval '7 days') as g(d);
  get diagnostics v_inserted = row_count;
  if v_inserted <> 52 then raise exception '청소년부 예배: 예상 52건이 아닌 %건', v_inserted; end if;
  v_total := v_total + v_inserted;

  -- 4) 2층 예배실 청년부 예배
  v_group := gen_random_uuid();
  insert into public.reservations (
    room_id, user_id, title, purpose, contact_name, contact_phone,
    start_at, end_at, status, notes, approved_by, approved_at, recurrence_group_id
  )
  select
    v_chapel, v_user_id, '청년부 예배', '청년부 예배',
    v_contact_name, v_contact_phone,
    ((d::date + time '13:30')::timestamp without time zone at time zone 'Pacific/Auckland'),
    ((d::date + time '15:00')::timestamp without time zone at time zone 'Pacific/Auckland'),
    'approved', '정기 예배 (자동 승인)', v_user_id, now(), v_group
  from generate_series(v_first_sunday, v_last_sunday, interval '7 days') as g(d);
  get diagnostics v_inserted = row_count;
  if v_inserted <> 52 then raise exception '청년부 예배: 예상 52건이 아닌 %건', v_inserted; end if;
  v_total := v_total + v_inserted;

  -- 5) 성가대실 성가대연습
  v_group := gen_random_uuid();
  insert into public.reservations (
    room_id, user_id, title, purpose, contact_name, contact_phone,
    start_at, end_at, status, notes, approved_by, approved_at, recurrence_group_id
  )
  select
    v_choir, v_user_id, '성가대연습', '성가대연습',
    v_contact_name, v_contact_phone,
    ((d::date + time '10:00')::timestamp without time zone at time zone 'Pacific/Auckland'),
    ((d::date + time '11:00')::timestamp without time zone at time zone 'Pacific/Auckland'),
    'approved', '정기 예배 (자동 승인)', v_user_id, now(), v_group
  from generate_series(v_first_sunday, v_last_sunday, interval '7 days') as g(d);
  get diagnostics v_inserted = row_count;
  if v_inserted <> 52 then raise exception '성가대연습: 예상 52건이 아닌 %건', v_inserted; end if;
  v_total := v_total + v_inserted;

  -- 6) 성가대실 유초등부 예배 (2층 예배실 청소년부와 시간 충돌 방지)
  v_group := gen_random_uuid();
  insert into public.reservations (
    room_id, user_id, title, purpose, contact_name, contact_phone,
    start_at, end_at, status, notes, approved_by, approved_at, recurrence_group_id
  )
  select
    v_choir, v_user_id, '유초등부 예배', '유초등부 예배',
    v_contact_name, v_contact_phone,
    ((d::date + time '11:00')::timestamp without time zone at time zone 'Pacific/Auckland'),
    ((d::date + time '12:00')::timestamp without time zone at time zone 'Pacific/Auckland'),
    'approved', '정기 예배 (자동 승인)', v_user_id, now(), v_group
  from generate_series(v_first_sunday, v_last_sunday, interval '7 days') as g(d);
  get diagnostics v_inserted = row_count;
  if v_inserted <> 52 then raise exception '유초등부 예배: 예상 52건이 아닌 %건', v_inserted; end if;
  v_total := v_total + v_inserted;

  -- 7) 유아실 유아부 예배
  v_group := gen_random_uuid();
  insert into public.reservations (
    room_id, user_id, title, purpose, contact_name, contact_phone,
    start_at, end_at, status, notes, approved_by, approved_at, recurrence_group_id
  )
  select
    v_nursery, v_user_id, '유아부 예배', '유아부 예배',
    v_contact_name, v_contact_phone,
    ((d::date + time '11:00')::timestamp without time zone at time zone 'Pacific/Auckland'),
    ((d::date + time '12:00')::timestamp without time zone at time zone 'Pacific/Auckland'),
    'approved', '정기 예배 (자동 승인)', v_user_id, now(), v_group
  from generate_series(v_first_sunday, v_last_sunday, interval '7 days') as g(d);
  get diagnostics v_inserted = row_count;
  if v_inserted <> 52 then raise exception '유아부 예배: 예상 52건이 아닌 %건', v_inserted; end if;
  v_total := v_total + v_inserted;

  alter table public.reservations enable trigger reservations_enforce_status;
  alter table public.reservations enable trigger reservations_block_holidays;

  raise notice '정기 예배 시드 완료: 총 %건 (7종 × 52주)', v_total;
end;
$$;

select
  title,
  count(*) as cnt,
  min((start_at at time zone 'Pacific/Auckland')::date) as first_date,
  extract(dow from min((start_at at time zone 'Pacific/Auckland')::date)) as first_dow,
  min((start_at at time zone 'Pacific/Auckland')::time) as start_time,
  min((end_at at time zone 'Pacific/Auckland')::time) as end_time,
  status
from public.reservations
where title in (
  '주일 저녁예배', '수요예배', '청소년부 예배', '청년부 예배',
  '성가대연습', '유초등부 예배', '유아부 예배'
)
group by title, status
order by title;
