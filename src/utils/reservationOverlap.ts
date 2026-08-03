import type { Reservation, ReservationFormInput } from '../types';
import { combineDateAndTime, formatTimeRange, splitDateTime } from './datetime';

export type ReservationConflict = {
  id: string;
  contact_name: string | null;
  start_at: string;
  end_at: string;
};

/** Half-open style overlap: [start, end) */
export function rangesOverlap(
  startA: string | Date,
  endA: string | Date,
  startB: string | Date,
  endB: string | Date,
) {
  const aStart = new Date(startA).getTime();
  const aEnd = new Date(endA).getTime();
  const bStart = new Date(startB).getTime();
  const bEnd = new Date(endB).getTime();

  return aStart < bEnd && bStart < aEnd;
}

export function isActiveReservationStatus(status: string) {
  return status !== 'cancelled' && status !== 'rejected';
}

export function isSameLocalDate(iso: string, date: string) {
  return splitDateTime(iso).date === date;
}

export function findOverlappingReservations(
  candidates: Reservation[],
  input: ReservationFormInput,
  excludeId?: string | null,
): ReservationConflict[] {
  const startAt = combineDateAndTime(input.reservation_date, input.start_time);
  const endAt = combineDateAndTime(input.reservation_date, input.end_time);

  return candidates
    .filter((item) => {
      if (excludeId && item.id === excludeId) return false;
      if (item.room_id !== input.room_id) return false;
      if (!isActiveReservationStatus(item.status)) return false;
      if (!isSameLocalDate(item.start_at, input.reservation_date)) return false;
      return rangesOverlap(item.start_at, item.end_at, startAt, endAt);
    })
    .map((item) => ({
      id: item.id,
      contact_name: item.contact_name,
      start_at: item.start_at,
      end_at: item.end_at,
    }))
    .sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
    );
}

export function formatConflictTime(conflict: ReservationConflict) {
  return formatTimeRange(conflict.start_at, conflict.end_at);
}
