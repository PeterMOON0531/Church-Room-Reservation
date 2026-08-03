import {
  CHURCH_TIMEZONE,
  churchLocalToIso,
  formatZonedDateKey,
  formatZonedTime,
  getZonedParts,
} from './timezone';

export function combineDateAndTime(date: string, time: string) {
  return churchLocalToIso(date, time, CHURCH_TIMEZONE);
}

export function splitDateTime(iso: string) {
  const parts = getZonedParts(iso, CHURCH_TIMEZONE);
  return {
    date: formatZonedDateKey(iso, CHURCH_TIMEZONE),
    time: `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`,
  };
}

export function formatDateTimeRange(startAt: string, endAt: string) {
  const date = new Date(startAt).toLocaleDateString('ko-KR', {
    timeZone: CHURCH_TIMEZONE,
  });
  const startTime = formatZonedTime(startAt);
  const endTime = formatZonedTime(endAt);
  return `${date} ${startTime} ~ ${endTime}`;
}

export function formatTimeRange(startAt: string, endAt: string) {
  return `${formatZonedTime(startAt)} ~ ${formatZonedTime(endAt)}`;
}
