import { useEffect, useMemo, useState } from 'react';
import { Alert, Button } from '../common';
import {
  CALENDAR_VIEW_LABEL,
  getRoomColor,
  sortRoomsByDisplayOrder,
  type CalendarView,
} from '../../constants';
import type { Reservation, Room } from '../../types';
import {
  addDays,
  addMonths,
  formatDayTitle,
  formatMonthTitle,
  formatWeekTitle,
  getWeekDays,
  moveRangeKeepingDuration,
  startOfDay,
} from '../../utils';
import { MonthView } from './MonthView';
import { ReservationDetailModal } from './ReservationDetailModal';
import { TimeGridView } from './TimeGridView';

type ReservationCalendarProps = {
  reservations: Reservation[];
  rooms: Room[];
  loading?: boolean;
  usingMockData?: boolean;
  currentUserId?: string | null;
  canManageAll?: boolean;
  onMove: (id: string, startAt: string, endAt: string) => Promise<{
    error: Error | null;
  }>;
  onEdit?: (reservation: Reservation) => void;
  onCancelReservation?: (reservation: Reservation) => Promise<void> | void;
};

function getInitialView(): CalendarView {
  if (typeof window === 'undefined') return 'week';
  return window.matchMedia('(max-width: 768px)').matches ? 'day' : 'week';
}

export function ReservationCalendar({
  reservations,
  rooms,
  loading = false,
  usingMockData = false,
  currentUserId = null,
  canManageAll = false,
  onMove,
  onEdit,
  onCancelReservation,
}: ReservationCalendarProps) {
  const [view, setView] = useState<CalendarView>(getInitialView);
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const onChange = () => {
      if (media.matches && view === 'week') setView('day');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [view]);

  const sortedRooms = useMemo(
    () => sortRoomsByDisplayOrder(rooms),
    [rooms],
  );

  useEffect(() => {
    if (sortedRooms.length === 0) {
      setSelectedRoomId(null);
      return;
    }

    setSelectedRoomId((current) => {
      if (current && sortedRooms.some((room) => room.id === current)) {
        return current;
      }
      return sortedRooms[0].id;
    });
  }, [sortedRooms]);

  const title = useMemo(() => {
    if (view === 'month') return formatMonthTitle(cursor);
    if (view === 'week') return formatWeekTitle(cursor);
    return formatDayTitle(cursor);
  }, [cursor, view]);

  const weekDays = useMemo(() => getWeekDays(cursor), [cursor]);
  const dayDays = useMemo(() => [cursor], [cursor]);

  const activeReservations = useMemo(
    () =>
      reservations.filter(
        (item) =>
          item.status !== 'cancelled' &&
          item.status !== 'rejected' &&
          (selectedRoomId === null || item.room_id === selectedRoomId),
      ),
    [reservations, selectedRoomId],
  );

  const selectedRoom =
    sortedRooms.find((room) => room.id === selectedRoomId) ?? null;

  const activeCountByRoom = useMemo(() => {
    const counts = new Map<string, number>();
    for (const reservation of reservations) {
      if (
        reservation.status === 'cancelled' ||
        reservation.status === 'rejected'
      ) {
        continue;
      }
      counts.set(
        reservation.room_id,
        (counts.get(reservation.room_id) ?? 0) + 1,
      );
    }
    return counts;
  }, [reservations]);

  const goToday = () => setCursor(startOfDay(new Date()));

  const goPrev = () => {
    if (view === 'month') setCursor((current) => addMonths(current, -1));
    else if (view === 'week') setCursor((current) => addDays(current, -7));
    else setCursor((current) => addDays(current, -1));
  };

  const goNext = () => {
    if (view === 'month') setCursor((current) => addMonths(current, 1));
    else if (view === 'week') setCursor((current) => addDays(current, 7));
    else setCursor((current) => addDays(current, 1));
  };

  const canManageReservation = (reservation: Reservation) =>
    canManageAll ||
    (currentUserId != null && reservation.user_id === currentUserId);

  const openDetail = (reservation: Reservation) => {
    setSelected(reservation);
    setDetailOpen(true);
    setMoveError(null);
  };

  const handleMove = async (id: string, startAt: string, endAt: string) => {
    setMoveError(null);
    const target = reservations.find((item) => item.id === id);
    if (!target) return;
    if (!canManageReservation(target)) {
      setMoveError('본인 예약만 시간을 변경할 수 있습니다.');
      return;
    }
    const result = await onMove(id, startAt, endAt);
    if (result.error) {
      setMoveError(result.error.message);
    }
  };

  const handleMonthDrop = async (reservationId: string, day: Date) => {
    const target = reservations.find((item) => item.id === reservationId);
    if (!target) return;
    if (!canManageReservation(target)) {
      setMoveError('본인 예약만 이동할 수 있습니다.');
      return;
    }

    const nextStart = new Date(target.start_at);
    nextStart.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    const moved = moveRangeKeepingDuration(
      target.start_at,
      target.end_at,
      nextStart,
    );

    if (
      moved.start_at === target.start_at &&
      moved.end_at === target.end_at
    ) {
      return;
    }

    await handleMove(reservationId, moved.start_at, moved.end_at);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="md" onClick={goToday}>
            오늘
          </Button>
          <Button
            variant="secondary"
            size="md"
            className="h-10 w-10 px-0 text-2xl leading-none"
            onClick={goPrev}
            aria-label="이전"
          >
            ‹
          </Button>
          <Button
            variant="secondary"
            size="md"
            className="h-10 w-10 px-0 text-2xl leading-none"
            onClick={goNext}
            aria-label="다음"
          >
            ›
          </Button>
          <h2 className="ml-1 text-lg font-semibold tracking-tight text-[var(--color-fg)]">
            {title}
          </h2>
        </div>

        <div className="inline-flex rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
          {(Object.keys(CALENDAR_VIEW_LABEL) as CalendarView[]).map((key) => (
            <button
              key={key}
              type="button"
              className={[
                'rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-semibold transition',
                view === key
                  ? 'bg-[var(--color-brand)] text-[var(--color-brand-fg)]'
                  : 'text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-muted)]',
              ].join(' ')}
              onClick={() => setView(key)}
            >
              {CALENDAR_VIEW_LABEL[key]}
            </button>
          ))}
        </div>
      </div>

      {usingMockData ? (
        <Alert tone="info" title="미리보기 일정">
          샘플 예약이 달력에 표시됩니다. 드래그하여 시간을 변경해 볼 수 있습니다.
        </Alert>
      ) : null}

      {moveError ? (
        <Alert tone="danger" title="시간 변경 실패">
          {moveError}
        </Alert>
      ) : null}

      <div
        className="flex flex-wrap items-center gap-2"
        aria-label="방별 예약 필터"
      >
        {sortedRooms.map((room) => {
          const color = getRoomColor(room.id);
          const isSelected = selectedRoomId === room.id;
          return (
            <button
              key={room.id}
              type="button"
              aria-pressed={isSelected}
              className={[
                'inline-flex min-h-8 items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]',
                isSelected
                  ? 'shadow-[var(--shadow-sm)] ring-2 ring-[var(--color-brand)] ring-offset-2 ring-offset-[var(--color-bg)]'
                  : 'opacity-75 hover:opacity-100',
              ].join(' ')}
              style={{
                background: color.bg,
                color: color.text,
                borderColor: color.border,
              }}
              onClick={() => setSelectedRoomId(room.id)}
            >
              {room.name}
              <span aria-hidden="true">
                {activeCountByRoom.get(room.id) ?? 0}
              </span>
              <span className="sr-only">건</span>
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={selectedRoomId === null}
          className={[
            'inline-flex min-h-8 items-center rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold transition',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand)]',
            selectedRoomId === null
              ? 'bg-[var(--color-brand)] text-[var(--color-brand-fg)] ring-2 ring-[var(--color-brand)] ring-offset-2 ring-offset-[var(--color-bg)]'
              : 'bg-[var(--color-surface)] text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-muted)]',
          ].join(' ')}
          onClick={() => setSelectedRoomId(null)}
        >
          전체
        </button>
      </div>

      <p
        className="text-sm text-[var(--color-fg-muted)]"
        aria-live="polite"
      >
        {selectedRoom
          ? `${selectedRoom.name} 예약 ${activeReservations.length}건을 표시합니다.`
          : `전체 방 예약 ${activeReservations.length}건을 표시합니다.`}
      </p>

      {loading ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-16 text-center text-sm text-[var(--color-fg-muted)]">
          달력을 불러오는 중...
        </div>
      ) : view === 'month' ? (
        <MonthView
          cursor={cursor}
          reservations={activeReservations}
          onSelect={openDetail}
          onDropOnDay={(id, day) => void handleMonthDrop(id, day)}
        />
      ) : (
        <TimeGridView
          days={view === 'week' ? weekDays : dayDays}
          reservations={activeReservations}
          onSelect={openDetail}
          onMove={handleMove}
        />
      )}

      <ReservationDetailModal
        reservation={selected}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        canManage={Boolean(
          selected &&
            (canManageAll ||
              (currentUserId != null && selected.user_id === currentUserId)),
        )}
        showContactDetails={Boolean(
          selected &&
            (canManageAll ||
              (currentUserId != null && selected.user_id === currentUserId)),
        )}
        busy={actionBusy}
        onEdit={
          onEdit
            ? (reservation) => {
                setDetailOpen(false);
                onEdit(reservation);
              }
            : undefined
        }
        onCancelReservation={
          onCancelReservation
            ? async (reservation) => {
                if (
                  !window.confirm(
                    '이 예약을 취소하시겠습니까? 취소 후 달력에서 사라집니다.',
                  )
                ) {
                  return;
                }
                setActionBusy(true);
                try {
                  await onCancelReservation(reservation);
                  setDetailOpen(false);
                  setSelected(null);
                } finally {
                  setActionBusy(false);
                }
              }
            : undefined
        }
      />
    </div>
  );
}
