/** Church wall-clock timezone (New Zealand). */
export const CHURCH_TIMEZONE = 'Pacific/Auckland';

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function readParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

export function getZonedParts(
  value: string | Date,
  timeZone = CHURCH_TIMEZONE,
): ZonedParts {
  return readParts(new Date(value), timeZone);
}

export function formatZonedDateKey(
  value: string | Date,
  timeZone = CHURCH_TIMEZONE,
) {
  const parts = getZonedParts(value, timeZone);
  const mm = String(parts.month).padStart(2, '0');
  const dd = String(parts.day).padStart(2, '0');
  return `${parts.year}-${mm}-${dd}`;
}

export function formatZonedTime(
  value: string | Date,
  timeZone = CHURCH_TIMEZONE,
) {
  const parts = getZonedParts(value, timeZone);
  return `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
}

/** Convert church-local date + time into a UTC ISO string. */
export function churchLocalToIso(
  date: string,
  time: string,
  timeZone = CHURCH_TIMEZONE,
) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);

  // Iterate to resolve DST offset for Pacific/Auckland.
  let instant = desiredAsUtc;
  for (let i = 0; i < 4; i += 1) {
    const parts = readParts(new Date(instant), timeZone);
    const asUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    instant += desiredAsUtc - asUtc;
  }

  return new Date(instant).toISOString();
}

export function isSameZonedDay(
  a: string | Date,
  b: string | Date,
  timeZone = CHURCH_TIMEZONE,
) {
  return formatZonedDateKey(a, timeZone) === formatZonedDateKey(b, timeZone);
}

export function zonedMinutesFromMidnight(
  value: string | Date,
  timeZone = CHURCH_TIMEZONE,
) {
  const parts = getZonedParts(value, timeZone);
  return parts.hour * 60 + parts.minute;
}
