import { supabase } from '../../lib/supabase';
import type {
  Reservation,
  ReservationEmailEvent,
  ReservationEmailRequest,
} from '../../types';

export async function notifyReservationEmail(
  event: ReservationEmailEvent,
  reservationOrIds: Reservation | string | string[],
  options?: {
    rejectionReason?: string | null;
  },
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: null };
  }

  const body: ReservationEmailRequest =
    typeof reservationOrIds === 'string'
      ? {
          event,
          reservationId: reservationOrIds,
          rejectionReason: options?.rejectionReason,
        }
      : Array.isArray(reservationOrIds)
        ? {
            event,
            reservationIds: reservationOrIds,
            rejectionReason: options?.rejectionReason,
          }
        : {
            event,
            reservationId: reservationOrIds.id,
            rejectionReason: options?.rejectionReason,
          };

  if (
    !body.reservationId &&
    (!body.reservationIds || body.reservationIds.length === 0)
  ) {
    return { error: null };
  }

  try {
    const { error } = await supabase.functions.invoke(
      'send-reservation-email',
      { body },
    );

    if (error) {
      console.warn('[reservation-email]', error.message);
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '이메일 발송에 실패했습니다.';
    console.warn('[reservation-email]', message);
    return { error: new Error(message) };
  }
}

/** Fire-and-forget: reservation mutations should not fail because of email. */
export function queueReservationEmail(
  event: ReservationEmailEvent,
  reservationOrIds: Reservation | string | string[],
  options?: {
    rejectionReason?: string | null;
  },
) {
  void notifyReservationEmail(event, reservationOrIds, options);
}
