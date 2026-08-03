import {
  CALENDAR_DAY_END_HOUR,
  CALENDAR_DAY_START_HOUR,
  CALENDAR_SLOT_MINUTES,
} from '../constants/calendar';
import {
  CHURCH_TIMEZONE,
  churchLocalToIso,
  formatZonedDateKey,
  getZonedParts,
  zonedMinutesFromMidnight,
} from './timezone';

export function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

/** Sunday-start week (일~토) */
export function startOfWeek(date: Date) {
  const next = startOfDay(date);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

export function endOfWeek(date: Date) {
  const start = startOfWeek(date);
  const next = new Date(start);
  next.setDate(start.getDate() + 6);
  return endOfDay(next);
}

export function startOfMonth(date: Date) {
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function endOfMonth(date: Date) {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function addMonths(date: Date, amount: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
}

export function isSameDay(a: Date, b: Date) {
  return formatZonedDateKey(a) === formatZonedDateKey(b);
}

export function isSameMonth(a: Date, b: Date) {
  const aParts = getZonedParts(a);
  const bParts = getZonedParts(b);
  return aParts.year === bParts.year && aParts.month === bParts.month;
}

export function toDateKey(date: Date | string) {
  return formatZonedDateKey(date, CHURCH_TIMEZONE);
}

export function formatMonthTitle(date: Date) {
  const parts = getZonedParts(date);
  return `${parts.year}년 ${parts.month}월`;
}

export function formatWeekTitle(date: Date) {
  const start = startOfWeek(date);
  const end = addDays(start, 6);
  const startParts = getZonedParts(start);
  const endParts = getZonedParts(end);
  return `${startParts.month}/${startParts.day} – ${endParts.month}/${endParts.day}`;
}

export function formatDayTitle(date: Date) {
  return date.toLocaleDateString('ko-KR', {
    timeZone: CHURCH_TIMEZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

export function getMonthMatrix(date: Date) {
  const monthStart = startOfMonth(date);
  const gridStart = startOfWeek(monthStart);
  const cells: Date[] = [];

  for (let i = 0; i < 42; i += 1) {
    cells.push(addDays(gridStart, i));
  }

  return cells;
}

export function getWeekDays(date: Date) {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function getHourLabels() {
  const labels: string[] = [];
  for (
    let hour = CALENDAR_DAY_START_HOUR;
    hour <= CALENDAR_DAY_END_HOUR;
    hour += 1
  ) {
    labels.push(`${String(hour).padStart(2, '0')}:00`);
  }
  return labels;
}

export function snapMinutes(totalMinutes: number, slot = CALENDAR_SLOT_MINUTES) {
  return Math.round(totalMinutes / slot) * slot;
}

export function minutesFromDayStart(date: Date | string) {
  return (
    zonedMinutesFromMidnight(date, CHURCH_TIMEZONE) -
    CALENDAR_DAY_START_HOUR * 60
  );
}

export function clampToCalendarDay(date: Date) {
  const parts = getZonedParts(date);
  const min = CALENDAR_DAY_START_HOUR * 60;
  const max = (CALENDAR_DAY_END_HOUR + 1) * 60 - 1;
  const minutes = parts.hour * 60 + parts.minute;
  const clamped = Math.min(Math.max(minutes, min), max);
  const hh = String(Math.floor(clamped / 60)).padStart(2, '0');
  const mm = String(clamped % 60).padStart(2, '0');
  const dateKey = formatZonedDateKey(date);
  return new Date(churchLocalToIso(dateKey, `${hh}:${mm}`));
}

export function moveRangeKeepingDuration(
  startAt: string,
  endAt: string,
  nextStart: Date,
) {
  const duration = new Date(endAt).getTime() - new Date(startAt).getTime();
  const start = clampToCalendarDay(nextStart);
  const end = new Date(start.getTime() + duration);
  return {
    start_at: start.toISOString(),
    end_at: end.toISOString(),
  };
}

export function eventLayout(
  startAt: string,
  endAt: string,
  hourHeight: number,
) {
  const topMinutes = minutesFromDayStart(startAt);
  const durationMinutes = Math.max(
    (new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000,
    CALENDAR_SLOT_MINUTES,
  );

  return {
    top: (topMinutes / 60) * hourHeight,
    height: (durationMinutes / 60) * hourHeight,
  };
}

export function weekdayLabel(date: Date) {
  return date.toLocaleDateString('ko-KR', {
    timeZone: CHURCH_TIMEZONE,
    weekday: 'short',
  });
}
