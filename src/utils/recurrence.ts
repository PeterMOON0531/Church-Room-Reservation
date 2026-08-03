import type { RecurrenceRule } from '../types';
import { addDays, addMonths } from './calendar';
import { toDateKey } from './calendar';

function parseDateOnly(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addYears(date: Date, amount: number) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + amount);
  return next;
}

function addByUnit(
  date: Date,
  amount: number,
  unit: RecurrenceRule['customUnit'] | 'week' | 'month' | 'year',
) {
  if (unit === 'day') return addDays(date, amount);
  if (unit === 'week') return addDays(date, amount * 7);
  if (unit === 'month') return addMonths(date, amount);
  return addYears(date, amount);
}

/**
 * Expand recurrence into occurrence dates (YYYY-MM-DD), including the start date.
 */
export function expandRecurrenceDates(
  startDate: string,
  rule: RecurrenceRule,
  maxOccurrences = 52,
): string[] {
  if (!startDate || rule.frequency === 'none') {
    return startDate ? [startDate] : [];
  }

  const interval = Math.max(1, Math.floor(rule.interval || 1));
  const dates: string[] = [];
  let cursor = parseDateOnly(startDate);
  const until =
    rule.endMode === 'until' && rule.untilDate
      ? parseDateOnly(rule.untilDate)
      : null;
  const targetCount =
    rule.endMode === 'count'
      ? Math.min(Math.max(1, Math.floor(rule.count || 1)), maxOccurrences)
      : maxOccurrences;

  const unit =
    rule.frequency === 'weekly'
      ? 'week'
      : rule.frequency === 'monthly'
        ? 'month'
        : rule.frequency === 'yearly'
          ? 'year'
          : rule.customUnit;

  while (dates.length < targetCount) {
    if (until && cursor > until) break;
    dates.push(toDateKey(cursor));
    cursor = addByUnit(cursor, interval, unit);
  }

  return dates;
}

export function describeRecurrence(rule: RecurrenceRule) {
  if (rule.frequency === 'none') return '반복 없음';

  const interval = Math.max(1, rule.interval || 1);
  const unitLabel =
    rule.frequency === 'weekly'
      ? '주'
      : rule.frequency === 'monthly'
        ? '개월'
        : rule.frequency === 'yearly'
          ? '년'
          : rule.customUnit === 'day'
            ? '일'
            : rule.customUnit === 'week'
              ? '주'
              : rule.customUnit === 'month'
                ? '개월'
                : '년';

  const every =
    interval === 1
      ? rule.frequency === 'weekly'
        ? '매주'
        : rule.frequency === 'monthly'
          ? '매월'
          : rule.frequency === 'yearly'
            ? '매년'
            : `매${unitLabel}`
      : `${interval}${unitLabel}마다`;

  const end =
    rule.endMode === 'until' && rule.untilDate
      ? `${rule.untilDate}까지`
      : `${Math.max(1, rule.count)}회`;

  return `${every} · ${end}`;
}
