import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { getRoomColor } from '../../constants';
import type { Reservation } from '../../types';
import { cn, formatTimeRange } from '../../utils';

type CalendarEventChipProps = {
  reservation: Reservation;
  style?: CSSProperties;
  compact?: boolean;
  className?: string;
  onOpen: (reservation: Reservation) => void;
  onDragMove?: (
    reservation: Reservation,
    deltaMinutes: number,
    deltaDays: number,
  ) => void;
  onDragEnd?: (
    reservation: Reservation,
    deltaMinutes: number,
    deltaDays: number,
  ) => void;
  pixelsPerMinute?: number;
  dayWidth?: number;
};

export function CalendarEventChip({
  reservation,
  style,
  compact = false,
  className,
  onOpen,
  onDragMove,
  onDragEnd,
  pixelsPerMinute = 1,
  dayWidth = 0,
}: CalendarEventChipProps) {
  const color = getRoomColor(reservation.room_id);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
    deltaMinutes: number;
    deltaDays: number;
  } | null>(null);

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      deltaMinutes: 0,
      deltaDays: 0,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaY = event.clientY - drag.startY;
    const deltaX = event.clientX - drag.startX;
    const deltaMinutes = Math.round(deltaY / pixelsPerMinute / 15) * 15;
    const deltaDays =
      dayWidth > 0 ? Math.round(deltaX / dayWidth) : 0;

    if (Math.abs(deltaY) > 4 || Math.abs(deltaX) > 4) {
      drag.moved = true;
    }

    drag.deltaMinutes = deltaMinutes;
    drag.deltaDays = deltaDays;
    onDragMove?.(reservation, deltaMinutes, deltaDays);
  };

  const finishDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.currentTarget.releasePointerCapture(event.pointerId);

    if (!drag.moved) {
      onOpen(reservation);
    } else {
      onDragEnd?.(reservation, drag.deltaMinutes, drag.deltaDays);
    }

    dragRef.current = null;
  };

  return (
    <button
      type="button"
      className={cn(
        'absolute left-1 right-1 z-10 overflow-hidden rounded-md border text-left shadow-sm transition select-none',
        'cursor-grab active:cursor-grabbing',
        className,
      )}
      style={{
        background: color.bg,
        borderColor: color.border,
        color: color.text,
        ...style,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
    >
      <div className={cn('px-1.5', compact ? 'py-0.5' : 'py-1')}>
        <p className={cn('truncate font-semibold', compact ? 'text-[11px]' : 'text-xs')}>
          {reservation.title || reservation.purpose || '예약'}
        </p>
        {!compact ? (
          <>
            <p className="truncate text-[11px] opacity-90">
              {reservation.room_name}
            </p>
            <p className="truncate text-[11px] opacity-80">
              {formatTimeRange(reservation.start_at, reservation.end_at)}
            </p>
          </>
        ) : null}
      </div>
    </button>
  );
}
