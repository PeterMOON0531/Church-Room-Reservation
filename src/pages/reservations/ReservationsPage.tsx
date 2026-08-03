import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  LoadingBlock,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components';
import { ReservationForm } from '../../components/reservation';
import { RESERVATION_STATUS_LABEL } from '../../constants';
import { useAuth, useReservations } from '../../hooks';
import type { Reservation } from '../../types';
import { cn, formatDateTimeRange } from '../../utils';

export function ReservationsPage() {
  const { profile } = useAuth();
  const {
    reservations,
    rooms,
    departments,
    loading,
    error,
    usingMockData,
    reload,
    create,
    update,
    remove,
  } = useReservations();
  const [selected, setSelected] = useState<Reservation | null>(null);

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="ds-eyebrow">예약</p>
        <h1 className="ds-page-title">예약 등록</h1>
        <p className="ds-page-subtitle">
          방 예약을 등록하고, 목록에서 선택해 수정하거나 취소할 수 있습니다.
        </p>
      </div>

      {usingMockData ? (
        <Alert tone="warning" title="미리보기 데이터">
          Supabase 미연결 상태에서는 로컬 미리보기 모드로 동작합니다.
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

      <ReservationForm
        rooms={rooms}
        departments={departments}
        selected={selected}
        defaultContactName={profile?.full_name ?? ''}
        defaultContactPhone={profile?.phone ?? ''}
        defaultDepartmentId={profile?.department_id ?? ''}
        onCreate={create}
        onUpdate={update}
        onDelete={remove}
        onCancelSelection={() => setSelected(null)}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight text-[var(--color-fg)]">
            내 예약 목록
          </h2>
          <Badge>{reservations.length}건</Badge>
        </div>

        {loading ? (
          <LoadingBlock label="예약 목록을 불러오는 중..." />
        ) : reservations.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-10 text-center text-sm text-[var(--color-fg-muted)]">
            등록된 예약이 없습니다. 위 양식에서 새 예약을 등록해 주세요.
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {reservations.map((item) => {
                const isSelected = selected?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(item)}
                    className={cn(
                      'w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left',
                      isSelected && 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-[var(--color-fg)]">
                        {item.room_name ?? '-'}
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
                        {RESERVATION_STATUS_LABEL[item.status] ?? item.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
                      {formatDateTimeRange(item.start_at, item.end_at)}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-fg-subtle)]">
                      {item.contact_name ?? '-'} · {item.department_name ?? '-'}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>방</TableHead>
                    <TableHead>부서</TableHead>
                    <TableHead>예약자</TableHead>
                    <TableHead>일정</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="w-24">선택</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map((item) => {
                    const isSelected = selected?.id === item.id;

                    return (
                      <TableRow
                        key={item.id}
                        className={cn(
                          isSelected && 'bg-[var(--color-brand-soft)]',
                        )}
                      >
                        <TableCell className="font-medium">
                          {item.room_name ?? '-'}
                        </TableCell>
                        <TableCell>{item.department_name ?? '-'}</TableCell>
                        <TableCell>{item.contact_name ?? '-'}</TableCell>
                        <TableCell>
                          {formatDateTimeRange(item.start_at, item.end_at)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            tone={
                              item.status === 'approved'
                                ? 'success'
                                : item.status === 'pending'
                                  ? 'brand'
                                  : 'neutral'
                            }
                          >
                            {RESERVATION_STATUS_LABEL[item.status] ?? item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant={isSelected ? 'primary' : 'secondary'}
                            onClick={() => setSelected(item)}
                          >
                            {isSelected ? '선택됨' : '수정'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
