export type RecurrenceFrequency =
  | 'none'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'custom';

export type RecurrenceCustomUnit = 'day' | 'week' | 'month' | 'year';

export type RecurrenceEndMode = 'count' | 'until';

export type RecurrenceRule = {
  frequency: RecurrenceFrequency;
  /** every N periods (weekly/monthly/yearly/custom) */
  interval: number;
  customUnit: RecurrenceCustomUnit;
  endMode: RecurrenceEndMode;
  /** number of occurrences including the first */
  count: number;
  untilDate: string;
};

export type ReservationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'completed';

export type Reservation = {
  id: string;
  room_id: string;
  user_id: string;
  department_id: string | null;
  title: string;
  purpose: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  start_at: string;
  end_at: string;
  status: ReservationStatus;
  notes: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  recurrence_group_id?: string | null;
  reminder_sent_at?: string | null;
  created_at: string;
  updated_at: string;
  room_name?: string | null;
  department_name?: string | null;
};

export type ReservationFormInput = {
  department_id: string;
  contact_name: string;
  contact_phone: string;
  room_id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  notes: string;
  recurrence: RecurrenceRule;
};

export type Department = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

export const DEFAULT_RECURRENCE: RecurrenceRule = {
  frequency: 'none',
  interval: 1,
  customUnit: 'week',
  endMode: 'count',
  count: 4,
  untilDate: '',
};
