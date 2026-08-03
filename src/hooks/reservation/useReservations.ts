import { useCallback, useEffect, useState } from 'react';
import {
  createMockDepartments,
  createMockReservations,
  createMockRooms,
} from '../../constants';
import { isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../auth';
import { fetchDepartments } from '../../services/department';
import {
  cancelReservation,
  createRecurringReservations,
  createReservation,
  fetchReservations,
  findReservationConflicts,
  moveReservation,
  updateReservation,
  type ReservationMutationResult,
} from '../../services/reservation';
import { queueReservationEmail } from '../../services/notification';
import { fetchRooms } from '../../services/room';
import type {
  Department,
  Reservation,
  ReservationFormInput,
  Room,
} from '../../types';
import { DEFAULT_RECURRENCE } from '../../types';
import {
  combineDateAndTime,
  expandRecurrenceDates,
  findOverlappingReservations,
  splitDateTime,
} from '../../utils';

function createLocalReservation(
  input: ReservationFormInput,
  userId: string,
  rooms: Room[],
  departments: Department[],
  id?: string,
  recurrenceGroupId?: string | null,
): Reservation {
  const now = new Date().toISOString();
  const room = rooms.find((item) => item.id === input.room_id);
  const department = departments.find((item) => item.id === input.department_id);

  return {
    id: id ?? `mock-reservation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    room_id: input.room_id,
    user_id: userId,
    department_id: input.department_id || null,
    title: input.purpose.trim() || '방 예약',
    purpose: input.purpose.trim() || null,
    contact_name: input.contact_name.trim() || null,
    contact_phone: input.contact_phone.trim() || null,
    start_at: combineDateAndTime(input.reservation_date, input.start_time),
    end_at: combineDateAndTime(input.reservation_date, input.end_time),
    status: 'pending',
    notes: input.notes.trim() || null,
    recurrence_group_id: recurrenceGroupId ?? null,
    created_at: now,
    updated_at: now,
    room_name: room?.name ?? null,
    department_name: department?.name ?? null,
  };
}

function createLocalRecurring(
  input: ReservationFormInput,
  userId: string,
  rooms: Room[],
  departments: Department[],
  existing: Reservation[],
): ReservationMutationResult {
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
  const skipped: Array<{
    date: string;
    conflicts: ReturnType<typeof findOverlappingReservations>;
  }> = [];
  let working = [...existing];

  for (const date of dates) {
    const occurrence: ReservationFormInput = {
      ...input,
      reservation_date: date,
      recurrence: { ...DEFAULT_RECURRENCE },
    };
    const conflicts = findOverlappingReservations(working, occurrence);
    if (conflicts.length > 0) {
      skipped.push({ date, conflicts });
      continue;
    }

    const item = createLocalReservation(
      occurrence,
      userId,
      rooms,
      departments,
      undefined,
      recurrenceGroupId,
    );
    created.push(item);
    working = [item, ...working];
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

export function useReservations(options?: { scope?: 'mine' | 'all' }) {
  const scope = options?.scope ?? 'mine';
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured || !user) {
      if (!isSupabaseConfigured) {
        const mockRooms = createMockRooms();
        const mockDepartments = createMockDepartments();
        setRooms(mockRooms);
        setDepartments(mockDepartments);
        setReservations(
          createMockReservations(mockRooms, user?.id ?? 'demo-user-id'),
        );
        setUsingMockData(true);
      } else {
        setRooms([]);
        setDepartments([]);
        setReservations([]);
        setUsingMockData(false);
      }
      setLoading(false);
      return;
    }

    const [roomsResult, departmentsResult, reservationsResult] =
      await Promise.all([
        fetchRooms(),
        fetchDepartments(),
        fetchReservations(scope === 'mine' ? user.id : undefined),
      ]);

    const errors = [
      roomsResult.error?.message,
      departmentsResult.error?.message,
      reservationsResult.error?.message,
    ].filter(Boolean);

    setRooms(roomsResult.data ?? []);
    setDepartments(departmentsResult.data ?? []);
    setReservations(reservationsResult.data ?? []);
    setUsingMockData(false);

    if (errors.length > 0) {
      setError(errors[0] ?? '데이터를 불러오지 못했습니다.');
    }

    setLoading(false);
  }, [user, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(
    async (input: ReservationFormInput): Promise<ReservationMutationResult> => {
      if (!user) {
        return { data: null, error: new Error('로그인이 필요합니다.') };
      }

      if (input.end_time <= input.start_time) {
        return {
          data: null,
          error: new Error('종료 시간은 시작 시간보다 늦어야 합니다.'),
        };
      }

      const isRecurring =
        (input.recurrence?.frequency ?? 'none') !== 'none';

      if (usingMockData || !isSupabaseConfigured) {
        if (isRecurring) {
          const result = createLocalRecurring(
            input,
            user.id,
            rooms,
            departments,
            reservations,
          );
          if (result.created?.length) {
            setReservations((current) => [...result.created!, ...current]);
            queueReservationEmail(
              'created',
              result.created.map((item) => item.id),
            );
          }
          return result;
        }

        const conflicts = findOverlappingReservations(reservations, input);
        if (conflicts.length > 0) {
          return {
            data: null,
            error: new Error('이미 예약된 시간입니다.'),
            conflicts,
          };
        }

        const created = createLocalReservation(
          input,
          user.id,
          rooms,
          departments,
        );
        setReservations((current) => [created, ...current]);
        queueReservationEmail('created', created);
        return { data: created, error: null, createdCount: 1, skippedCount: 0 };
      }

      if (isRecurring) {
        const result = await createRecurringReservations(
          input,
          user.id,
          reservations,
        );
        if (result.created?.length) {
          setReservations((current) => [...result.created!, ...current]);
          queueReservationEmail(
            'created',
            result.created.map((item) => item.id),
          );
        }
        return result;
      }

      const { data, error: createError, conflicts } = await createReservation(
        input,
        user.id,
        reservations,
      );
      if (createError || !data) {
        return {
          data: null,
          error: createError ?? new Error('예약 등록에 실패했습니다.'),
          conflicts,
        };
      }

      setReservations((current) => [data, ...current]);
      queueReservationEmail('created', data);
      return { data, error: null, createdCount: 1, skippedCount: 0 };
    },
    [user, usingMockData, rooms, departments, reservations],
  );

  const update = useCallback(
    async (
      id: string,
      input: ReservationFormInput,
    ): Promise<ReservationMutationResult> => {
      if (!user) {
        return { data: null, error: new Error('로그인이 필요합니다.') };
      }

      if (input.end_time <= input.start_time) {
        return {
          data: null,
          error: new Error('종료 시간은 시작 시간보다 늦어야 합니다.'),
        };
      }

      if (usingMockData || !isSupabaseConfigured) {
        const conflicts = findOverlappingReservations(reservations, input, id);
        if (conflicts.length > 0) {
          return {
            data: null,
            error: new Error('이미 예약된 시간입니다.'),
            conflicts,
          };
        }

        const updated = createLocalReservation(
          input,
          user.id,
          rooms,
          departments,
          id,
        );
        setReservations((current) =>
          current.map((item) => (item.id === id ? updated : item)),
        );
        queueReservationEmail('updated', updated);
        return { data: updated, error: null };
      }

      const { data, error: updateError, conflicts } = await updateReservation(
        id,
        input,
        user.id,
        reservations,
      );
      if (updateError || !data) {
        return {
          data: null,
          error: updateError ?? new Error('예약 수정에 실패했습니다.'),
          conflicts,
        };
      }

      setReservations((current) =>
        current.map((item) => (item.id === id ? data : item)),
      );
      queueReservationEmail('updated', data);
      return { data, error: null };
    },
    [user, usingMockData, rooms, departments, reservations],
  );

  const move = useCallback(
    async (
      id: string,
      startAt: string,
      endAt: string,
    ): Promise<ReservationMutationResult> => {
      const target = reservations.find((item) => item.id === id);
      if (!target) {
        return { data: null, error: new Error('예약을 찾을 수 없습니다.') };
      }

      const startParts = splitDateTime(startAt);
      const endParts = splitDateTime(endAt);
      const formInput: ReservationFormInput = {
        department_id: target.department_id ?? '',
        contact_name: target.contact_name ?? '',
        contact_phone: target.contact_phone ?? '',
        room_id: target.room_id,
        reservation_date: startParts.date,
        start_time: startParts.time,
        end_time: endParts.time,
        purpose: target.purpose ?? target.title,
        notes: target.notes ?? '',
        recurrence: { ...DEFAULT_RECURRENCE },
      };

      if (usingMockData || !isSupabaseConfigured) {
        const conflicts = findOverlappingReservations(reservations, formInput, id);
        if (conflicts.length > 0) {
          return {
            data: null,
            error: new Error('이미 예약된 시간입니다.'),
            conflicts,
          };
        }

        const updated: Reservation = {
          ...target,
          start_at: startAt,
          end_at: endAt,
          updated_at: new Date().toISOString(),
        };
        setReservations((current) =>
          current.map((item) => (item.id === id ? updated : item)),
        );
        queueReservationEmail('updated', updated);
        return { data: updated, error: null };
      }

      const { data, error: moveError, conflicts } = await moveReservation(
        id,
        startAt,
        endAt,
        target.room_id,
        reservations,
      );

      if (moveError || !data) {
        return {
          data: null,
          error: moveError ?? new Error('시간 변경에 실패했습니다.'),
          conflicts,
        };
      }

      setReservations((current) =>
        current.map((item) => (item.id === id ? data : item)),
      );
      queueReservationEmail('updated', data);
      return { data, error: null };
    },
    [reservations, usingMockData],
  );

  const remove = useCallback(
    async (id: string) => {
      const target = reservations.find((item) => item.id === id);

      if (usingMockData || !isSupabaseConfigured) {
        setReservations((current) =>
          current.map((item) =>
            item.id === id
              ? { ...item, status: 'cancelled', updated_at: new Date().toISOString() }
              : item,
          ),
        );
        if (target) {
          queueReservationEmail('cancelled', { ...target, status: 'cancelled' });
        }
        return { error: null };
      }

      const { data, error: cancelError } = await cancelReservation(id);
      if (cancelError || !data) {
        return { error: cancelError ?? new Error('예약 취소에 실패했습니다.') };
      }

      setReservations((current) =>
        current.map((item) => (item.id === id ? data : item)),
      );
      queueReservationEmail('cancelled', data);
      return { error: null };
    },
    [usingMockData, reservations],
  );

  const checkConflicts = useCallback(
    async (input: ReservationFormInput, excludeId?: string | null) => {
      if (usingMockData || !isSupabaseConfigured) {
        return {
          conflicts: findOverlappingReservations(reservations, input, excludeId),
          error: null,
        };
      }

      return findReservationConflicts(input, excludeId, reservations);
    },
    [usingMockData, reservations],
  );

  return {
    reservations,
    rooms,
    departments,
    loading,
    error,
    usingMockData,
    reload: load,
    create,
    update,
    move,
    remove,
    checkConflicts,
  };
}
