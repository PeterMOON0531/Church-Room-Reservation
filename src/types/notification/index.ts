export type ReservationEmailEvent =
  | 'created'
  | 'approved'
  | 'cancelled'
  | 'updated'
  | 'reminder';

export type ReservationEmailRequest = {
  event: ReservationEmailEvent;
  reservationId?: string;
  reservationIds?: string[];
  rejectionReason?: string | null;
};
