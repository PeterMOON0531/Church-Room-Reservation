-- 본당: 매주 화~금 06:00–07:00 새벽예배 × 52주 (승인완료)
-- Supabase Dashboard > SQL Editor에서 실행하세요.
-- 시간대: Pacific/Auckland (뉴질랜드)
-- 첫 화요일: 2026-08-04 → 이후 52주 동안 화·수·목·금
--
-- IMPORTANT: cast date + time to timestamp WITHOUT time zone before AT TIME ZONE.

do $$
declare
  v_user_id uuid;
  v_contact_name text;
  v_contact_phone text;
  v_main uuid;
  v_group uuid := gen_random_uuid();
  v_start date := date '2026-08-04'; -- Tuesday
  v_end date := date '2026-08-04' + interval '52 weeks' - interval '1 day';
  v_inserted integer;
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
  if v_main is null then
    raise exception '본당(main-hall)을 찾을 수 없습니다. rooms 시드를 먼저 적용하세요.';
  end if;

  alter table public.reservations disable trigger reservations_block_holidays;
  alter table public.reservations disable trigger reservations_enforce_status;

  delete from public.reservation_histories
  where reservation_id in (
    select r.id from public.reservations r
    where r.room_id = v_main and r.title in ('새벽예배', '새벽기도')
  );

  begin
    delete from public.reservation_email_logs
    where reservation_id in (
      select r.id from public.reservations r
      where r.room_id = v_main and r.title in ('새벽예배', '새벽기도')
    );
  exception
    when undefined_table then null;
  end;

  delete from public.reservations r
  where r.room_id = v_main and r.title in ('새벽예배', '새벽기도');

  insert into public.reservations (
    room_id, user_id, title, purpose, contact_name, contact_phone,
    start_at, end_at, status, notes, approved_by, approved_at, recurrence_group_id
  )
  select
    v_main,
    v_user_id,
    '새벽예배',
    '새벽예배',
    v_contact_name,
    v_contact_phone,
    ((d::date + time '06:00')::timestamp without time zone at time zone 'Pacific/Auckland'),
    ((d::date + time '07:00')::timestamp without time zone at time zone 'Pacific/Auckland'),
    'approved',
    '정기 예배 (자동 승인)',
    v_user_id,
    now(),
    v_group
  from generate_series(v_start, v_end, interval '1 day') as g(d)
  where extract(dow from d::date) between 2 and 5; -- Tue=2 .. Fri=5

  get diagnostics v_inserted = row_count;

  alter table public.reservations enable trigger reservations_enforce_status;
  alter table public.reservations enable trigger reservations_block_holidays;

  -- 52 weeks × 4 weekdays = 208
  if v_inserted <> 208 then
    raise exception '새벽예배: 예상 208건이 아닌 %건이 삽입되었습니다.', v_inserted;
  end if;

  raise notice '본당 새벽예배 %건 등록 완료 (승인완료, 화~금 06:00–07:00)', v_inserted;
end;
$$;

select
  count(*) as cnt,
  min((start_at at time zone 'Pacific/Auckland')::date) as first_date,
  max((start_at at time zone 'Pacific/Auckland')::date) as last_date,
  array_agg(distinct extract(dow from (start_at at time zone 'Pacific/Auckland')::date) order by extract(dow from (start_at at time zone 'Pacific/Auckland')::date)) as dows,
  min((start_at at time zone 'Pacific/Auckland')::time) as start_time,
  min((end_at at time zone 'Pacific/Auckland')::time) as end_time,
  status
from public.reservations
where title = '새벽예배'
group by status;
