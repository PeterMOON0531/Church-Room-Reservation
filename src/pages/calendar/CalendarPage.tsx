import { ReservationCalendar } from '../../components/calendar';
import { Alert, Button, LoadingBlock } from '../../components';
import { useReservations } from '../../hooks';

export function CalendarPage() {
  const {
    reservations,
    rooms,
    loading,
    error,
    usingMockData,
    reload,
    move,
  } = useReservations({
    scope: 'all',
  });

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="ds-eyebrow">달력</p>
        <h1 className="ds-page-title">예약 달력</h1>
        <p className="ds-page-subtitle">
          월간·주간·일간으로 예약을 확인하고, 드래그하여 시간을 변경할 수
          있습니다. 시간은 뉴질랜드(Pacific/Auckland) 기준이며 0시~23시까지
          표시됩니다.
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

      {loading ? (
        <LoadingBlock label="달력을 불러오는 중..." rows={6} />
      ) : (
        <ReservationCalendar
          reservations={reservations}
          rooms={rooms}
          loading={loading}
          usingMockData={usingMockData}
          onMove={move}
        />
      )}
    </section>
  );
}
