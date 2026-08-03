import { useMemo, useRef, useState } from 'react';
import {
  CALENDAR_DAY_END_HOUR,
  CALENDAR_DAY_START_HOUR,
  CALENDAR_HOUR_HEIGHT,
} from '../../constants';
import type { Reservation } from '../../types';
import {
  addDays,
  cn,
  eventLayout,
  formatZonedDateKey,
  getHourLabels,
  getZonedParts,
  isSameDay,
  moveRangeKeepingDuration,
  snapMinutes,
  toDateKey,
  weekdayLabel,
} from '../../utils';
import { CalendarEventChip } from './CalendarEventChip';

type TimeGridViewProps = {
  days: Date[];
  reservations: Reservation[];
  onSelect: (reservation: Reservation) => void;
  onMove: (id: string, startAt: string, endAt: string) => Promise<void>;
};

export function TimeGridView({
  days,
  reservations,
  onSelect,
  onMove,
}: TimeGridViewProps) {
  const labels = getHourLabels();
  const columnsRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<{
    id: string;
    startAt: string;
    endAt: string;
  } | null>(null);
  const [dayWidth, setDayWidth] = useState(120);

  const hours = CALENDAR_DAY_END_HOUR - CALENDAR_DAY_START_HOUR + 1;
  const gridHeight = hours * CALENDAR_HOUR_HEIGHT;
  const pixelsPerMinute = CALENDAR_HOUR_HEIGHT / 60;

  const visible = useMemo(() => {
    const dayKeys = new Set(days.map((day) => toDateKey(day)));

    return reservations.filter((item) => {
      if (item.status === 'cancelled' || item.status === 'rejected') {
        return false;
      }
      return dayKeys.has(formatZonedDateKey(item.start_at));
    });
  }, [days, reservations]);

  const measureDayWidth = () => {
    // columnsRef is attached to the first day column
    const width = columnsRef.current?.clientWidth ?? 0;
    if (width > 0) {
      setDayWidth(width);
    }
  };

  const applyDelta = (
    reservation: Reservation,
    deltaMinutes: number,
    deltaDays: number,
  ) => {
    const snapped = snapMinutes(deltaMinutes);
    const baseStart = addDays(new Date(reservation.start_at), deltaDays);
    baseStart.setMinutes(baseStart.getMinutes() + snapped);
    return moveRangeKeepingDuration(
      reservation.start_at,
      reservation.end_at,
      baseStart,
    );
  };

  const columnTemplate = `4.5rem repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Header + body share one scroll width so day columns stay aligned
          (scrollbar otherwise shrinks only the body). */}
      <div className="max-h-[70vh] overflow-auto">
        <div
          className="sticky top-0 z-20 grid border-b border-[var(--color-border)] bg-[var(--color-surface-muted)]"
          style={{ gridTemplateColumns: columnTemplate }}
        >
          <div className="border-r border-[var(--color-border)]" />
          {days.map((day) => {
            const today = isSameDay(day, new Date());
            const dayParts = getZonedParts(day);
            return (
              <div
                key={toDateKey(day)}
                className={cn(
                  'border-l border-[var(--color-border)] px-2 py-2 text-center',
                  today && 'bg-[var(--color-brand-soft)]',
                )}
              >
                <p className="text-xs font-semibold text-[var(--color-fg-muted)]">
                  {weekdayLabel(day)}
                </p>
                <p
                  className={cn(
                    'mt-0.5 text-sm font-semibold',
                    today ? 'text-[var(--color-brand)]' : 'text-[var(--color-fg)]',
                  )}
                >
                  {dayParts.day}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid" style={{ gridTemplateColumns: columnTemplate }}>
          <div
            className="relative border-r border-[var(--color-border)]"
            style={{ height: gridHeight }}
          >
            {labels.map((label, index) => (
              <div
                key={label}
                className="absolute right-2 text-[11px] text-[var(--color-fg-subtle)]"
                style={{ top: index * CALENDAR_HOUR_HEIGHT - 6 }}
              >
                {label}
              </div>
            ))}
          </div>

          {days.map((day) => (
            <div
              key={toDateKey(day)}
              ref={day === days[0] ? columnsRef : undefined}
              className="relative border-l border-[var(--color-border)]"
              style={{ height: gridHeight }}
              onMouseEnter={measureDayWidth}
            >
              {Array.from({ length: hours }).map((_, hourIndex) => (
                <div
                  key={`line-${toDateKey(day)}-${hourIndex}`}
                  className="pointer-events-none absolute right-0 left-0 border-t border-[var(--color-border)]"
                  style={{ top: hourIndex * CALENDAR_HOUR_HEIGHT }}
                />
              ))}

              {visible
                .filter((item) => isSameDay(new Date(item.start_at), day))
                .map((item) => {
                  const source =
                    preview?.id === item.id
                      ? { start_at: preview.startAt, end_at: preview.endAt }
                      : item;
                  const layout = eventLayout(
                    source.start_at,
                    source.end_at,
                    CALENDAR_HOUR_HEIGHT,
                  );

                  return (
                    <CalendarEventChip
                      key={item.id}
                      reservation={{
                        ...item,
                        start_at: source.start_at,
                        end_at: source.end_at,
                      }}
                      style={{
                        top: layout.top,
                        height: Math.max(layout.height, 28),
                      }}
                      pixelsPerMinute={pixelsPerMinute}
                      dayWidth={dayWidth}
                      onOpen={onSelect}
                      onDragMove={(_reservation, deltaMinutes, deltaDays) => {
                        measureDayWidth();
                        const next = applyDelta(
                          item,
                          deltaMinutes,
                          days.length > 1 ? deltaDays : 0,
                        );
                        setPreview({
                          id: item.id,
                          startAt: next.start_at,
                          endAt: next.end_at,
                        });
                      }}
                      onDragEnd={async (reservation, deltaMinutes, deltaDays) => {
                        const next = applyDelta(
                          item,
                          deltaMinutes,
                          days.length > 1 ? deltaDays : 0,
                        );
                        setPreview(null);
                        if (
                          next.start_at === item.start_at &&
                          next.end_at === item.end_at
                        ) {
                          return;
                        }
                        await onMove(
                          reservation.id,
                          next.start_at,
                          next.end_at,
                        );
                      }}
                    />
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
