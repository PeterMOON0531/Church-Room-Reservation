import { getRoomColor } from '../../constants';
import type { Reservation } from '../../types';
import {
  cn,
  formatTimeRange,
  getMonthMatrix,
  getZonedParts,
  isSameDay,
  isSameMonth,
  toDateKey,
  weekdayLabel,
} from '../../utils';

type MonthViewProps = {
  cursor: Date;
  reservations: Reservation[];
  onSelect: (reservation: Reservation) => void;
  onDropOnDay: (reservationId: string, day: Date) => void;
};

export function MonthView({
  cursor,
  reservations,
  onSelect,
  onDropOnDay,
}: MonthViewProps) {
  const cells = getMonthMatrix(cursor);
  const today = new Date();

  const byDay = new Map<string, Reservation[]>();
  for (const item of reservations) {
    const key = toDateKey(item.start_at);
    const list = byDay.get(key) ?? [];
    list.push(item);
    byDay.set(key, list);
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="grid grid-cols-7 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]">
        {cells.slice(0, 7).map((day) => (
          <div
            key={`head-${day.toISOString()}`}
            className="px-2 py-2 text-center text-xs font-semibold text-[var(--color-fg-muted)]"
          >
            {weekdayLabel(day)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day) => {
          const key = toDateKey(day);
          const dayEvents = byDay.get(key) ?? [];
          const inMonth = isSameMonth(day, cursor);
          const isToday = isSameDay(day, today);

          return (
            <div
              key={key}
              className={cn(
                'min-h-28 border-r border-b border-[var(--color-border)] p-1.5',
                !inMonth && 'bg-[var(--color-surface-muted)]/50',
              )}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const id = event.dataTransfer.getData('text/reservation-id');
                if (id) onDropOnDay(id, day);
              }}
            >
              <div
                className={cn(
                  'mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                  isToday
                    ? 'bg-[var(--color-brand)] text-[var(--color-brand-fg)]'
                    : inMonth
                      ? 'text-[var(--color-fg)]'
                      : 'text-[var(--color-fg-subtle)]',
                )}
              >
                {getZonedParts(day).day}
              </div>

              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((item) => {
                  const color = getRoomColor(item.room_id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      draggable
                      className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium"
                      style={{
                        background: color.bg,
                        color: color.text,
                        borderLeft: `3px solid ${color.border}`,
                      }}
                      onClick={() => onSelect(item)}
                      onDragStart={(event) => {
                        event.dataTransfer.setData('text/reservation-id', item.id);
                        event.dataTransfer.effectAllowed = 'move';
                      }}
                      title={`${item.title} · ${formatTimeRange(item.start_at, item.end_at)}`}
                    >
                      {item.title || item.purpose || '예약'}
                    </button>
                  );
                })}
                {dayEvents.length > 3 ? (
                  <p className="px-1 text-[11px] text-[var(--color-fg-subtle)]">
                    +{dayEvents.length - 3}건
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
