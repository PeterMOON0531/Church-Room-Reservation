export type CalendarView = 'month' | 'week' | 'day';

export const CALENDAR_VIEW_LABEL: Record<CalendarView, string> = {
  month: '월간',
  week: '주간',
  day: '일간',
};

/** Stable palette keyed by room code / id hash */
export const ROOM_COLOR_PALETTE = [
  { bg: '#DBEAFE', border: '#2563EB', text: '#1E3A8A' },
  { bg: '#D1FAE5', border: '#059669', text: '#064E3B' },
  { bg: '#FEF3C7', border: '#D97706', text: '#78350F' },
  { bg: '#FCE7F3', border: '#DB2777', text: '#831843' },
  { bg: '#E0E7FF', border: '#4F46E5', text: '#312E81' },
  { bg: '#FFEDD5', border: '#EA580C', text: '#7C2D12' },
  { bg: '#F3E8FF', border: '#9333EA', text: '#581C87' },
  { bg: '#CCFBF1', border: '#0D9488', text: '#134E4A' },
  { bg: '#FEE2E2', border: '#DC2626', text: '#7F1D1D' },
] as const;

export type RoomColor = (typeof ROOM_COLOR_PALETTE)[number];

export function getRoomColor(roomId: string): RoomColor {
  let hash = 0;
  for (let i = 0; i < roomId.length; i += 1) {
    hash = (hash * 31 + roomId.charCodeAt(i)) >>> 0;
  }
  return ROOM_COLOR_PALETTE[hash % ROOM_COLOR_PALETTE.length];
}

export const CALENDAR_DAY_START_HOUR = 0;
export const CALENDAR_DAY_END_HOUR = 23;
export const CALENDAR_SLOT_MINUTES = 30;
export const CALENDAR_HOUR_HEIGHT = 48;
