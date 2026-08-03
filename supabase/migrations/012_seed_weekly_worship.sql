-- Wipe existing reservations and seed weekly worship schedule (approved, no approval needed).
-- Run in Supabase Dashboard > SQL Editor as a single script.
-- Times use Pacific/Auckland (New Zealand). Dawn service (??湲? uses 05:00-06:00.
-- Generates 52 weeks from the week of 2026-08-03.
-- Re-run this script anytime to rebuild the schedule with correct NZ weekdays.

-- Allow SQL Editor / service-role maintenance inserts to keep provided status.
create or replace function public.enforce_reservation_status_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  role text := coalesce(public.current_user_role(), 'user');
  is_elevated boolean := role in ('admin', 'department_head');
begin
  if tg_op = 'INSERT' then
    -- App users always start as pending. SQL Editor (auth.uid() is null) may seed approved rows.
    if auth.uid() is not null then
      new.status := 'pending';
      new.approved_by := null;
      new.approved_at := null;
      new.rejection_reason := null;
      new.reminder_sent_at := null;
    else
      if new.status is null then
        new.status := 'pending';
      end if;
      if new.status = 'approved' and new.approved_at is null then
        new.approved_at := now();
      end if;
    end if;
    return new;
  end if;

  if auth.uid() is null then
    return new;
  end if;

  if not is_elevated then
    if new.status is distinct from old.status then
      if not (
        new.status = 'cancelled'
        and old.status in ('pending', 'approved')
      ) then
        raise exception '?덉빟 ?곹깭??愿由ъ옄留?蹂寃쏀븷 ???덉뒿?덈떎.';
      end if;
    end if;

    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;
    if new.status <> 'cancelled' then
      new.rejection_reason := old.rejection_reason;
    end if;
  end if;

  if role = 'department_head' then
    if new.department_id is distinct from (
      select p.department_id from public.profiles p where p.id = auth.uid()
    ) and old.department_id is distinct from (
      select p.department_id from public.profiles p where p.id = auth.uid()
    ) then
      raise exception '?ㅻⅨ 遺???덉빟? 泥섎━?????놁뒿?덈떎.';
    end if;
  end if;

  return new;
end;
$$;

do $$
declare
  v_user_id uuid;
  v_contact_name text;
  v_contact_phone text;
  v_main uuid;
  v_chapel uuid;
  v_choir uuid;
  v_start date := date '2026-08-03';
  v_end date := date '2026-08-03' + interval '52 weeks';
  v_group uuid;
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
    raise exception 'profiles???ъ슜?먭? ?놁뒿?덈떎. 癒쇱? ?뚯썝媛??濡쒓렇?몄쓣 ??二쇱꽭??';
  end if;

  select id into v_main from public.rooms where code = 'main-hall' limit 1;
  select id into v_chapel from public.rooms where code = 'chapel-2f' limit 1;
  select id into v_choir from public.rooms where code = 'choir' limit 1;

  if v_main is null or v_chapel is null or v_choir is null then
    raise exception '蹂몃떦/2痢듭삁諛곗떎/?깃???ㅼ쓣 李얠쓣 ???놁뒿?덈떎. rooms ?쒕뱶瑜?癒쇱? ?곸슜?섏꽭??';
  end if;

  -- Avoid holiday/status blockers while seeding approved recurring worship.
  alter table public.reservations disable trigger reservations_block_holidays;
  alter table public.reservations disable trigger reservations_enforce_status;

  -- 1) Delete all current reservations
  begin
    delete from public.reservation_histories;
  exception
    when undefined_table then null;
  end;

  begin
    delete from public.reservation_email_logs;
  exception
    when undefined_table then null;
  end;

  delete from public.reservations;

  -- Helper inline insert via temp function body
  -- Sundays
  v_group := gen_random_uuid();
  insert into public.reservations (
    room_id, user_id, title, purpose, contact_name, contact_phone,
    start_at, end_at, status, notes, approved_by, approved_at, recurrence_group_id
  )
  select
    v_main,
    v_user_id,
    '二쇱씪 ?ㅼ쟾1遺 ?덈같',
    '二쇱씪 ?ㅼ쟾1遺 ?덈같',
    v_contact_name,
    v_contact_phone,
    ((d::date + time '09:00')::timestamp without time zone at time zone 'Pacific/Auckland'),
    ((d::date + time '10:30')::timestamp without time zone at time zone 'Pacific/Auckland'),
    'approved',
    '?뺢린 ?덈같 (?먮룞 ?뱀씤)',
    v_user_id,
    now(),
    v_group
  from generate_series(v_start, v_end, interval '1 day') as g(d)
  where extract(dow from d) = 0;

  v_group := gen_random_uuid();
  insert into public.reservations (
    room_id, user_id, title, purpose, contact_name, contact_phone,
    start_at, end_at, status, notes, approved_by, approved_at, recurrence_group_id
  )
  select
    v_main,
    v_user_id,
    '二쇱씪 ?ㅼ쟾 2遺?덈같',
    '二쇱씪 ?ㅼ쟾 2遺?덈같',
    v_contact_name,
    v_contact_phone,
    ((d::date + time '11:00')::timestamp without time zone at time zone 'Pacific/Auckland'),
    ((d::date + time '12:30')::timestamp without time zone at time zone 'Pacific/Auckland'),
    'approved',
    '?뺢린 ?덈같 (?먮룞 ?뱀씤)',
    v_user_id,
    now(),
    v_group
  from generate_series(v_start, v_end, interval '1 day') as g(d)
  where extract(dow from d) = 0;

  v_group := gen_random_uuid();
  insert into public.reservations (
    room_id, user_id, title, purpose, contact_name, contact_phone,
    start_at, end_at, status, notes, approved_by, approved_at, recurrence_group_id
  )
  select
    v_main,
    v_user_id,
    '二쇱씪 李ъ뼇?덈같',
    '二쇱씪 李ъ뼇?덈같',
    v_contact_name,
    v_contact_phone,
    ((d::date + time '19:30')::timestamp without time zone at time zone 'Pacific/Auckland'),
    ((d::date + time '21:00')::timestamp without time zone at time zone 'Pacific/Auckland'),
    'approved',
    '?뺢린 ?덈같 (?먮룞 ?뱀씤)',
    v_user_id,
    now(),
    v_group
  from generate_series(v_start, v_end, interval '1 day') as g(d)
  where extract(dow from d) = 0;

  -- Wednesday evening
  v_group := gen_random_uuid();
  insert into public.reservations (
    room_id, user_id, title, purpose, contact_name, contact_phone,
    start_at, end_at, status, notes, approved_by, approved_at, recurrence_group_id
  )
  select
    v_main,
    v_user_id,
    '?섏슂?덈같',
    '?섏슂?덈같',
    v_contact_name,
    v_contact_phone,
    ((d::date + time '19:30')::timestamp without time zone at time zone 'Pacific/Auckland'),
    ((d::date + time '21:00')::timestamp without time zone at time zone 'Pacific/Auckland'),
    'approved',
    '?뺢린 ?덈같 (?먮룞 ?뱀씤)',
    v_user_id,
    now(),
    v_group
  from generate_series(v_start, v_end, interval '1 day') as g(d)
  where extract(dow from d) = 3;

  -- Tue-Fri dawn prayer at 蹂몃떦
  v_group := gen_random_uuid();
  insert into public.reservations (
    room_id, user_id, title, purpose, contact_name, contact_phone,
    start_at, end_at, status, notes, approved_by, approved_at, recurrence_group_id
  )
  select
    v_main,
    v_user_id,
    '?덈꼍?덈같',
    '?덈꼍?덈같',
    v_contact_name,
    v_contact_phone,
    ((d::date + time '05:00')::timestamp without time zone at time zone 'Pacific/Auckland'),
    ((d::date + time '06:00')::timestamp without time zone at time zone 'Pacific/Auckland'),
    'approved',
    '?뺢린 ?덈같 (?먮룞 ?뱀씤) 쨌 ??湲?05:00',
    v_user_id,
    now(),
    v_group
  from generate_series(v_start, v_end, interval '1 day') as g(d)
  where extract(dow from d) between 2 and 5;

  -- 2痢??덈같??
  v_group := gen_random_uuid();
  insert into public.reservations (
    room_id, user_id, title, purpose, contact_name, contact_phone,
    start_at, end_at, status, notes, approved_by, approved_at, recurrence_group_id
  )
  select
    v_chapel,
    v_user_id,
    '泥?냼?꾨? ?덈같',
    '泥?냼?꾨? ?덈같',
    v_contact_name,
    v_contact_phone,
    ((d::date + time '11:00')::timestamp without time zone at time zone 'Pacific/Auckland'),
    ((d::date + time '12:30')::timestamp without time zone at time zone 'Pacific/Auckland'),
    'approved',
    '?뺢린 ?덈같 (?먮룞 ?뱀씤)',
    v_user_id,
    now(),
    v_group
  from generate_series(v_start, v_end, interval '1 day') as g(d)
  where extract(dow from d) = 0;

  v_group := gen_random_uuid();
  insert into public.reservations (
    room_id, user_id, title, purpose, contact_name, contact_phone,
    start_at, end_at, status, notes, approved_by, approved_at, recurrence_group_id
  )
  select
    v_chapel,
    v_user_id,
    '泥?뀈遺 ?덈같',
    '泥?뀈遺 ?덈같',
    v_contact_name,
    v_contact_phone,
    ((d::date + time '13:30')::timestamp without time zone at time zone 'Pacific/Auckland'),
    ((d::date + time '15:00')::timestamp without time zone at time zone 'Pacific/Auckland'),
    'approved',
    '?뺢린 ?덈같 (?먮룞 ?뱀씤)',
    v_user_id,
    now(),
    v_group
  from generate_series(v_start, v_end, interval '1 day') as g(d)
  where extract(dow from d) = 0;

  -- ?깃????
  v_group := gen_random_uuid();
  insert into public.reservations (
    room_id, user_id, title, purpose, contact_name, contact_phone,
    start_at, end_at, status, notes, approved_by, approved_at, recurrence_group_id
  )
  select
    v_choir,
    v_user_id,
    '?깃?? ?곗뒿',
    '?깃?? ?곗뒿',
    v_contact_name,
    v_contact_phone,
    ((d::date + time '10:00')::timestamp without time zone at time zone 'Pacific/Auckland'),
    ((d::date + time '11:00')::timestamp without time zone at time zone 'Pacific/Auckland'),
    'approved',
    '?뺢린 ?덈같 (?먮룞 ?뱀씤)',
    v_user_id,
    now(),
    v_group
  from generate_series(v_start, v_end, interval '1 day') as g(d)
  where extract(dow from d) = 0;

  v_group := gen_random_uuid();
  insert into public.reservations (
    room_id, user_id, title, purpose, contact_name, contact_phone,
    start_at, end_at, status, notes, approved_by, approved_at, recurrence_group_id
  )
  select
    v_choir,
    v_user_id,
    '?곗큹?깅? ?덈같',
    '?곗큹?깅? ?덈같',
    v_contact_name,
    v_contact_phone,
    ((d::date + time '11:00')::timestamp without time zone at time zone 'Pacific/Auckland'),
    ((d::date + time '12:30')::timestamp without time zone at time zone 'Pacific/Auckland'),
    'approved',
    '?뺢린 ?덈같 (?먮룞 ?뱀씤)',
    v_user_id,
    now(),
    v_group
  from generate_series(v_start, v_end, interval '1 day') as g(d)
  where extract(dow from d) = 0;

  alter table public.reservations enable trigger reservations_enforce_status;
  alter table public.reservations enable trigger reservations_block_holidays;
end $$;
