import { Link } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  LoadingBlock,
} from '../../components';
import { RoleBadge } from '../../components/auth';
import { APP_ROUTES, RESERVATION_STATUS_LABEL } from '../../constants';
import { useAuth, useReservations } from '../../hooks';
import {
  formatDateTimeRange,
  formatZonedDateKey,
} from '../../utils';

export function HomePage() {
  const { profile, user, isAdmin, isDemo } = useAuth();
  const { reservations, loading, error, usingMockData, reload } = useReservations({
    scope: isAdmin ? 'all' : 'mine',
  });

  const todayKey = formatZonedDateKey(new Date());

  const todayItems = reservations
    .filter((item) => {
      if (item.status === 'cancelled' || item.status === 'rejected') return false;
      return formatZonedDateKey(item.start_at) === todayKey;
    })
    .sort(
      (a, b) =>
        new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
    )
    .slice(0, 5);

  const upcoming = reservations
    .filter((item) => {
      if (item.status === 'cancelled' || item.status === 'rejected') return false;
      return formatZonedDateKey(item.start_at) > todayKey;
    })
    .sort(
      (a, b) =>
        new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
    )
    .slice(0, 5);

  const pendingCount = reservations.filter((item) => item.status === 'pending')
    .length;

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="ds-eyebrow">홈</p>
        <h1 className="ds-page-title">
          {profile?.full_name ?? user?.email ?? '사용자'}님, 환영합니다
        </h1>
        <p className="ds-page-subtitle">
          오늘 일정과 다가오는 예약을 확인하고 바로 신청하세요.
          {profile ? (
            <span className="ml-2 inline-flex align-middle">
              <RoleBadge role={profile.role} />
            </span>
          ) : null}
        </p>
      </div>

      {isDemo || usingMockData ? (
        <Alert tone="warning" title="미리보기 모드">
          실제 데이터베이스에 저장되지 않습니다. Supabase를 연결하면 정식으로
          사용할 수 있습니다.
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

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>오늘 예약</CardDescription>
            <CardTitle className="text-3xl">{todayItems.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>다가오는 예약</CardDescription>
            <CardTitle className="text-3xl">{upcoming.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>{isAdmin ? '승인 대기' : '내 대기'}</CardDescription>
            <CardTitle className="text-3xl">{pendingCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link to={APP_ROUTES.reservations}>
          <Button className="w-full">예약 등록</Button>
        </Link>
        <Link to={APP_ROUTES.calendar}>
          <Button variant="secondary" className="w-full">
            달력 보기
          </Button>
        </Link>
        <Link to={APP_ROUTES.rooms}>
          <Button variant="secondary" className="w-full">
            방 안내
          </Button>
        </Link>
      </div>

      {loading ? (
        <LoadingBlock label="예약을 불러오는 중..." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>오늘 일정</CardTitle>
              <CardDescription>오늘 시작하는 예약입니다.</CardDescription>
            </CardHeader>
            <CardBody className="space-y-3">
              {todayItems.length === 0 ? (
                <p className="text-sm text-[var(--color-fg-muted)]">
                  오늘 예정된 예약이 없습니다.
                </p>
              ) : (
                todayItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-[var(--color-fg)]">
                        {item.room_name ?? '방'}
                      </p>
                      <Badge
                        tone={
                          item.status === 'approved'
                            ? 'success'
                            : item.status === 'pending'
                              ? 'brand'
                              : 'neutral'
                        }
                      >
                        {RESERVATION_STATUS_LABEL[item.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
                      {formatDateTimeRange(item.start_at, item.end_at)}
                    </p>
                    <p className="mt-0.5 text-sm text-[var(--color-fg-subtle)]">
                      {item.purpose ?? item.title}
                    </p>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>다가오는 예약</CardTitle>
              <CardDescription>이후 일정입니다.</CardDescription>
            </CardHeader>
            <CardBody className="space-y-3">
              {upcoming.length === 0 ? (
                <p className="text-sm text-[var(--color-fg-muted)]">
                  다가오는 예약이 없습니다.
                </p>
              ) : (
                upcoming.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-[var(--color-fg)]">
                        {item.room_name ?? '방'}
                      </p>
                      <Badge
                        tone={
                          item.status === 'approved'
                            ? 'success'
                            : item.status === 'pending'
                              ? 'brand'
                              : 'neutral'
                        }
                      >
                        {RESERVATION_STATUS_LABEL[item.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
                      {formatDateTimeRange(item.start_at, item.end_at)}
                    </p>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>관리자 바로가기</CardTitle>
            <CardDescription>
              승인 대기 {pendingCount}건을 처리할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardBody>
            <Link to={APP_ROUTES.admin}>
              <Button>관리자 페이지로 이동</Button>
            </Link>
          </CardBody>
        </Card>
      ) : null}
    </section>
  );
}
