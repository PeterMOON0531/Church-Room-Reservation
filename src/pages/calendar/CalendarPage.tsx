import { useState } from 'react';
import { ReservationCalendar } from '../../components/calendar';
import { ReservationForm } from '../../components/reservation';
import { Alert, Button, LoadingBlock, Modal } from '../../components';
import { useAuth, useReservations } from '../../hooks';
import type { Reservation } from '../../types';

export function CalendarPage() {
  const { user, isAdmin, isDeveloper } = useAuth();
  const {
    reservations,
    rooms,
    departments,
    loading,
    error,
    usingMockData,
    reload,
    move,
    update,
    remove,
  } = useReservations({
    scope: 'all',
  });
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const canManageAll = isAdmin || isDeveloper;

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="ds-eyebrow">달력</p>
        <h1 className="ds-page-title">예약 달력</h1>
        <p className="ds-page-subtitle">
          모든 사용자의 승인·대기 예약을 함께 볼 수 있습니다. 본인 예약(또는
          관리자)은 상세에서 수정·취소할 수 있고, 드래그로 시간도 변경할 수
          있습니다. 시간은 뉴질랜드(Pacific/Auckland) 기준입니다.
        </p>
      </div>

      {usingMockData ? (
        <Alert tone="warning" title="미리보기 데이터">
          Supabase 미연결 상태에서는 로컬 미리보기 데이터로 표시됩니다.
        </Alert>
      ) : null}

      {error ? (
        <Alert tone="danger" title="불러오기 오류">
          <div className="flex flex-wrap items-center gap-3">
            <span>{error}</span>
            <Button size="sm" variant="secondary" onClick={() => void reload()}>
              다시 시도
            </Button>
          </div>
        </Alert>
      ) : null}

      {actionError ? (
        <Alert tone="danger" title="처리 실패" onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      ) : null}

      {actionMessage ? (
        <Alert tone="success" title="완료" onClose={() => setActionMessage(null)}>
          {actionMessage}
        </Alert>
      ) : null}

      {loading ? (
        <LoadingBlock label="달력을 불러오는 중..." rows={6} />
      ) : (
        <ReservationCalendar
          reservations={reservations}
          rooms={rooms}
          loading={loading}
          usingMockData={usingMockData}
          currentUserId={user?.id}
          canManageAll={canManageAll}
          onMove={move}
          onEdit={(reservation) => {
            setActionError(null);
            setEditing(reservation);
          }}
          onCancelReservation={async (reservation) => {
            setActionError(null);
            const result = await remove(reservation.id);
            if (result.error) {
              setActionError(result.error.message);
              throw result.error;
            }
            setActionMessage('예약을 취소했습니다.');
          }}
        />
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="예약 수정"
        description="예약 내용을 수정한 뒤 저장해 주세요."
      >
        {editing ? (
          <ReservationForm
            rooms={rooms}
            departments={departments}
            selected={editing}
            defaultContactName={editing.contact_name ?? ''}
            defaultContactPhone={editing.contact_phone ?? ''}
            defaultDepartmentId={editing.department_id ?? ''}
            onCreate={async () => ({
              error: new Error('달력에서는 수정만 가능합니다.'),
            })}
            onUpdate={async (id, input) => {
              const result = await update(id, input);
              if (!result.error) {
                setEditing(null);
                setActionMessage('예약을 수정했습니다.');
              } else {
                setActionError(result.error.message);
              }
              return result;
            }}
            onDelete={async (id) => {
              const result = await remove(id);
              if (!result.error) {
                setEditing(null);
                setActionMessage('예약을 취소했습니다.');
              } else {
                setActionError(result.error.message);
              }
              return result;
            }}
            onCancelSelection={() => setEditing(null)}
          />
        ) : null}
      </Modal>
    </section>
  );
}
