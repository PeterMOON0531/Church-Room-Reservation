import { Badge, Button, Modal } from '../common';
import { RESERVATION_STATUS_LABEL, getRoomColor } from '../../constants';
import type { Reservation } from '../../types';
import { formatDateTimeRange } from '../../utils';

type ReservationDetailModalProps = {
  reservation: Reservation | null;
  open: boolean;
  onClose: () => void;
};

export function ReservationDetailModal({
  reservation,
  open,
  onClose,
}: ReservationDetailModalProps) {
  if (!reservation) return null;

  const color = getRoomColor(reservation.room_id);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={reservation.title || reservation.purpose || '예약 상세'}
      description="선택한 예약의 상세 정보입니다."
      footer={
        <Button variant="secondary" onClick={onClose}>
          닫기
        </Button>
      }
    >
      <div className="space-y-4">
        <div
          className="rounded-[var(--radius-md)] border px-3 py-2 text-sm font-semibold"
          style={{
            background: color.bg,
            borderColor: color.border,
            color: color.text,
          }}
        >
          {reservation.room_name ?? '방 정보 없음'}
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--color-fg-subtle)]">예약시간</dt>
            <dd className="mt-0.5 font-medium text-[var(--color-fg)]">
              {formatDateTimeRange(reservation.start_at, reservation.end_at)}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-fg-subtle)]">상태</dt>
            <dd className="mt-0.5">
              <Badge
                tone={
                  reservation.status === 'approved'
                    ? 'success'
                    : reservation.status === 'pending'
                      ? 'brand'
                      : 'neutral'
                }
              >
                {RESERVATION_STATUS_LABEL[reservation.status] ?? reservation.status}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-fg-subtle)]">예약자</dt>
            <dd className="mt-0.5 font-medium text-[var(--color-fg)]">
              {reservation.contact_name ?? '-'}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-fg-subtle)]">전화번호</dt>
            <dd className="mt-0.5 font-medium text-[var(--color-fg)]">
              {reservation.contact_phone ?? '-'}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-fg-subtle)]">부서</dt>
            <dd className="mt-0.5 font-medium text-[var(--color-fg)]">
              {reservation.department_name ?? '-'}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-fg-subtle)]">사용목적</dt>
            <dd className="mt-0.5 font-medium text-[var(--color-fg)]">
              {reservation.purpose ?? reservation.title ?? '-'}
            </dd>
          </div>
        </dl>

        {reservation.notes ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-fg-muted)]">
            {reservation.notes}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
