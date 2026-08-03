import { supabase } from '../../lib/supabase';
import type { Reservation, ReservationFormInput } from '../../types';
import { DEFAULT_RECURRENCE } from '../../types';
import {
  combineDateAndTime,
  expandRecurrenceDates,
  findOverlappingReservations,
  type ReservationConflict,
} from '../../utils';

type ReservationRow = Reservation & {
  rooms?: { name: string } | null;
  departments?: { name: string } | null;
};

export type ReservationMutationResult = {
  data: Reservation | null;
  error: Error | null;
  conflicts?: ReservationConflict[];
  created?: Reservation[];
  skipped?: Array<{
    date: string;
    conflicts: ReservationConflict[];
  }>;
  createdCount?: number;
  skippedCount?: number;
};

function mapReservation(row: ReservationRow): Reservation {
  return {
    id: row.id,
    room_id: row.room_id,
    user_id: row.user_id,
    department_id: row.department_id,
    title: row.title,
    purpose: row.purpose,
    contact_name: row.contact_name,
    contact_phone: row.contact_phone,
    start_at: row.start_at,
    end_at: row.end_at,
    status: row.status,
    notes: row.notes,
    approved_by: row.approved_by ?? null,
    approved_at: row.approved_at ?? null,
    rejection_reason: row.rejection_reason ?? null,
    recurrence_group_id: row.recurrence_group_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    room_name: row.rooms?.name ?? row.room_name ?? null,
    department_name: row.departments?.name ?? row.department_name ?? null,
  };
}

function toPayload(
  input: ReservationFormInput,
  userId: string,
  recurrenceGroupId?: string | null,
) {
  const startAt = combineDateAndTime(input.reservation_date, input.start_time);
  const endAt = combineDateAndTime(input.reservation_date, input.end_time);

  return {
    room_id: input.room_id,
    user_id: userId,
    department_id: input.department_id || null,
    title: input.purpose.trim() || '방 예약',
    purpose: input.purpose.trim() || null,
    contact_name: input.contact_name.trim() || null,
    contact_phone: input.contact_phone.trim() || null,
    start_at: startAt,
    end_at: endAt,
    notes: input.notes.trim() || null,
    status: 'pending' as const,
    recurrence_group_id: recurrenceGroupId ?? null,
  };
}

const SELECT_FIELDS = `
  id, room_id, user_id, department_id, title, purpose,
  contact_name, contact_phone, start_at, end_at, status, notes,
  approved_by, approved_at, rejection_reason, recurrence_group_id,
  created_at, updated_at,
  rooms:room_id ( name ),
  departments:department_id ( name )
`;

export async function fetchReservations(userId?: string) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase가 설정되지 않았습니다.') };
  }

  let query = supabase
    .from('reservations')
    .select(SELECT_FIELDS)
    .order('start_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) return { data: null, error };

  return {
    data: ((data ?? []) as unknown as ReservationRow[]).map(mapReservation),
    error: null,
  };
}

export async function findReservationConflicts(
  input: ReservationFormInput,
  excludeId?: string | null,
  localCandidates: Reservation[] = [],
): Promise<{ conflicts: ReservationConflict[]; error: Error | null }> {
  if (input.end_time <= input.start_time) {
    return {
      conflicts: [],
      error: new Error('종료 시간은 시작 시간보다 늦어야 합니다.'),
    };
  }

  if (!supabase) {
    return {
      conflicts: findOverlappingReservations(localCandidates, input, excludeId),
      error: null,
    };
  }

  const startAt = combineDateAndTime(input.reservation_date, input.start_time);
  const endAt = combineDateAndTime(input.reservation_date, input.end_time);

  const { data, error } = await supabase.rpc('find_reservation_conflicts', {
    p_room_id: input.room_id,
    p_start_at: startAt,
    p_end_at: endAt,
    p_exclude_id: excludeId ?? null,
  });

  if (error) {
    // RPC 미적용 환경에서는 로컬/조회 가능한 목록으로 폴백
    return {
      conflicts: findOverlappingReservations(localCandidates, input, excludeId),
      error: null,
    };
  }

  const conflicts = ((data ?? []) as Array<{
    id: string;
    contact_name: string | null;
    start_at: string;
    end_at: string;
  }>).map((item) => ({
    id: item.id,
    contact_name: item.contact_name,
    start_at: item.start_at,
    end_at: item.end_at,
  }));

  return { conflicts, error: null };
}

async function assertNotHoliday(date: string): Promise<Error | null> {
  if (!supabase || !date) return null;
  const { data, error } = await supabase
    .from('holidays')
    .select('id, name')
    .eq('holiday_date', date)
    .maybeSingle();

  if (error) {
    // Holidays table may be unavailable; don't block booking on read failure
    return null;
  }

  if (data) {
    return new Error(
      `휴일(${data.name ?? date})에는 예약할 수 없습니다.`,
    );
  }

  return null;
}

export async function createReservation(
  input: ReservationFormInput,
  userId: string,
  localCandidates: Reservation[] = [],
): Promise<ReservationMutationResult> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase가 설정되지 않았습니다.') };
  }

  if (input.end_time <= input.start_time) {
    return {
      data: null,
      error: new Error('종료 시간은 시작 시간보다 늦어야 합니다.'),
    };
  }

  const holidayError = await assertNotHoliday(input.reservation_date);
  if (holidayError) {
    return { data: null, error: holidayError };
  }

  const { conflicts, error: conflictError } = await findReservationConflicts(
    input,
    null,
    localCandidates,
  );

  if (conflictError) {
    return { data: null, error: conflictError };
  }

  if (conflicts.length > 0) {
    return {
      data: null,
      error: new Error('이미 예약된 시간입니다.'),
      conflicts,
    };
  }

  const { data, error } = await supabase
    .from('reservations')
    .insert(toPayload(input, userId))
    .select(SELECT_FIELDS)
    .single();

  if (error) return { data: null, error };

  return { data: mapReservation(data as unknown as ReservationRow), error: null };
}

export async function updateReservation(
  id: string,
  input: ReservationFormInput,
  userId: string,
  localCandidates: Reservation[] = [],
): Promise<ReservationMutationResult> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase가 설정되지 않았습니다.') };
  }

  if (input.end_time <= input.start_time) {
    return {
      data: null,
      error: new Error('종료 시간은 시작 시간보다 늦어야 합니다.'),
    };
  }

  const holidayError = await assertNotHoliday(input.reservation_date);
  if (holidayError) {
    return { data: null, error: holidayError };
  }

  const { conflicts, error: conflictError } = await findReservationConflicts(
    input,
    id,
    localCandidates,
  );

  if (conflictError) {
    return { data: null, error: conflictError };
  }

  if (conflicts.length > 0) {
    return {
      data: null,
      error: new Error('이미 예약된 시간입니다.'),
      conflicts,
    };
  }

  const payload = toPayload(input, userId);
  const { user_id: _userId, status: _status, ...updatePayload } = payload;

  const { data, error } = await supabase
    .from('reservations')
    .update(updatePayload)
    .eq('id', id)
    .select(SELECT_FIELDS)
    .single();

  if (error) return { data: null, error };

  return { data: mapReservation(data as unknown as ReservationRow), error: null };
}

export async function deleteReservation(id: string) {
  if (!supabase) {
    return { error: new Error('Supabase가 설정되지 않았습니다.') };
  }

  const { error } = await supabase.from('reservations').delete().eq('id', id);
  return { error };
}

export async function cancelReservation(
  id: string,
): Promise<ReservationMutationResult> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase가 설정되지 않았습니다.') };
  }

  const { data, error } = await supabase
    .from('reservations')
    .update({
      status: 'cancelled',
      approved_by: null,
      approved_at: null,
    })
    .eq('id', id)
    .select(SELECT_FIELDS)
    .single();

  if (error) return { data: null, error };
  return { data: mapReservation(data as unknown as ReservationRow), error: null };
}

export async function updateReservationStatus(
  id: string,
  status: Reservation['status'],
  options?: {
    approvedBy?: string | null;
    rejectionReason?: string | null;
  },
): Promise<ReservationMutationResult> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase가 설정되지 않았습니다.') };
  }

  const payload: Record<string, unknown> = {
    status,
    rejection_reason:
      status === 'rejected' ? options?.rejectionReason?.trim() || null : null,
  };

  if (status === 'approved') {
    payload.approved_by = options?.approvedBy ?? null;
    payload.approved_at = new Date().toISOString();
  } else {
    payload.approved_by = null;
    payload.approved_at = null;
  }

  const { data, error } = await supabase
    .from('reservations')
    .update(payload)
    .eq('id', id)
    .select(SELECT_FIELDS)
    .single();

  if (error) return { data: null, error };
  return { data: mapReservation(data as unknown as ReservationRow), error: null };
}

export async function moveReservation(
  id: string,
  startAt: string,
  endAt: string,
  roomId: string,
  localCandidates: Reservation[] = [],
): Promise<ReservationMutationResult> {
  if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
    return {
      data: null,
      error: new Error('종료 시간은 시작 시간보다 늦어야 합니다.'),
    };
  }

  const startParts = splitDateTimeLocal(startAt);
  const endParts = splitDateTimeLocal(endAt);

  const formInput: ReservationFormInput = {
    department_id: '',
    contact_name: '',
    contact_phone: '',
    room_id: roomId,
    reservation_date: startParts.date,
    start_time: startParts.time,
    end_time: endParts.time,
    purpose: '',
    notes: '',
    recurrence: { ...DEFAULT_RECURRENCE },
  };

  const { conflicts, error: conflictError } = await findReservationConflicts(
    formInput,
    id,
    localCandidates,
  );

  if (conflictError) {
    return { data: null, error: conflictError };
  }

  if (conflicts.length > 0) {
    return {
      data: null,
      error: new Error('이미 예약된 시간입니다.'),
      conflicts,
    };
  }

  if (!supabase) {
    return { data: null, error: new Error('Supabase가 설정되지 않았습니다.') };
  }

  const { data, error } = await supabase
    .from('reservations')
    .update({
      start_at: startAt,
      end_at: endAt,
    })
    .eq('id', id)
    .select(SELECT_FIELDS)
    .single();

  if (error) return { data: null, error };

  return { data: mapReservation(data as unknown as ReservationRow), error: null };
}

function splitDateTimeLocal(iso: string) {
  const date = new Date(iso);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` };
}

/**
 * Create recurring reservations. Conflicting dates are skipped; others are booked.
 */
export async function createRecurringReservations(
  input: ReservationFormInput,
  userId: string,
  localCandidates: Reservation[] = [],
): Promise<ReservationMutationResult> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase가 설정되지 않았습니다.') };
  }

  if (input.end_time <= input.start_time) {
    return {
      data: null,
      error: new Error('종료 시간은 시작 시간보다 늦어야 합니다.'),
    };
  }

  const dates = expandRecurrenceDates(
    input.reservation_date,
    input.recurrence ?? DEFAULT_RECURRENCE,
  );

  if (dates.length === 0) {
    return {
      data: null,
      error: new Error('반복 예약 일정을 만들 수 없습니다.'),
    };
  }

  const recurrenceGroupId =
    dates.length > 1 ? crypto.randomUUID() : null;
  const created: Reservation[] = [];
  const skipped: Array<{ date: string; conflicts: ReservationConflict[] }> =
    [];
  let workingCandidates = [...localCandidates];

  for (const date of dates) {
    const occurrence: ReservationFormInput = {
      ...input,
      reservation_date: date,
      recurrence: { ...DEFAULT_RECURRENCE },
    };

    const holidayError = await assertNotHoliday(date);
    if (holidayError) {
      skipped.push({ date, conflicts: [] });
      continue;
    }

    const { conflicts, error: conflictError } = await findReservationConflicts(
      occurrence,
      null,
      workingCandidates,
    );

    if (conflictError) {
      return {
        data: created[0] ?? null,
        error: conflictError,
        created,
        skipped,
        createdCount: created.length,
        skippedCount: skipped.length,
      };
    }

    if (conflicts.length > 0) {
      skipped.push({ date, conflicts });
      continue;
    }

    const { data, error } = await supabase
      .from('reservations')
      .insert(toPayload(occurrence, userId, recurrenceGroupId))
      .select(SELECT_FIELDS)
      .single();

    if (error) {
      return {
        data: created[0] ?? null,
        error,
        created,
        skipped,
        createdCount: created.length,
        skippedCount: skipped.length,
      };
    }

    const mapped = mapReservation(data as unknown as ReservationRow);
    created.push(mapped);
    workingCandidates = [mapped, ...workingCandidates];
  }

  if (created.length === 0) {
    return {
      data: null,
      error: new Error('모든 일정이 기존 예약과 충돌하여 등록되지 않았습니다.'),
      conflicts: skipped[0]?.conflicts,
      created: [],
      skipped,
      createdCount: 0,
      skippedCount: skipped.length,
    };
  }

  return {
    data: created[0],
    error: null,
    created,
    skipped,
    createdCount: created.length,
    skippedCount: skipped.length,
  };
}
