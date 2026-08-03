import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
  DatePicker,
  Input,
  Modal,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  TimePicker,
} from '../../components';
import { RESERVATION_STATUS_LABEL, USER_ROLE_LABEL } from '../../constants';
import {
  ADMIN_ASSIGNABLE_ROLES,
  DEVELOPER_ASSIGNABLE_ROLES,
} from '../../constants/auth';
import { useAdmin, useAuth } from '../../hooks';
import type { Reservation, ReservationFormInput, UserRole } from '../../types';
import { RoleBadge } from '../../components/auth';
import { DEFAULT_RECURRENCE } from '../../types';
import {
  downloadReservationsExcel,
  formatDateTimeRange,
  splitDateTime,
} from '../../utils';

type AdminTab = 'reservations' | 'rooms' | 'holidays' | 'users';

export function AdminPage() {
  const { user } = useAuth();
  const {
    loading,
    error,
    usingMockData,
    isAdmin,
    isDeveloper,
    reservations,
    rooms,
    holidays,
    departments,
    profiles,
    approve,
    reject,
    editReservation,
    removeReservation,
    setRoomBanned,
    addHoliday,
    removeHoliday,
    changeUserRole,
    changeUserActive,
  } = useAdmin();

  const [tab, setTab] = useState<AdminTab>(
    isAdmin ? 'reservations' : 'users',
  );
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roomFilter, setRoomFilter] = useState('all');
  const [userQuery, setUserQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [rejectTarget, setRejectTarget] = useState<Reservation | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [editTarget, setEditTarget] = useState<Reservation | null>(null);
  const [editForm, setEditForm] = useState<ReservationFormInput | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');
  const [holidayDescription, setHolidayDescription] = useState('');

  useEffect(() => {
    if (!isAdmin && isDeveloper) {
      setTab('users');
    }
  }, [isAdmin, isDeveloper]);

  const filteredReservations = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reservations.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (roomFilter !== 'all' && item.room_id !== roomFilter) return false;
      if (!q) return true;
      const haystack = [
        item.room_name,
        item.department_name,
        item.contact_name,
        item.contact_phone,
        item.purpose,
        item.title,
        item.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [reservations, query, statusFilter, roomFilter]);

  const filteredProfiles = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((item) => {
      const haystack = [item.email, item.full_name, item.role, USER_ROLE_LABEL[item.role]]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [profiles, userQuery]);

  const assignableRoles: UserRole[] = isDeveloper
    ? DEVELOPER_ASSIGNABLE_ROLES
    : ADMIN_ASSIGNABLE_ROLES;

  const pendingCount = reservations.filter((item) => item.status === 'pending')
    .length;

  const tabs = (
    [
      ...(isAdmin
        ? ([
            ['reservations', '예약 관리'],
            ['rooms', '방 사용금지'],
            ['holidays', '휴일 등록'],
          ] as const)
        : []),
      ...(isDeveloper || isAdmin
        ? ([['users', '사용자 권한']] as const)
        : []),
    ] as Array<readonly [AdminTab, string]>
  );

  const openEdit = (item: Reservation) => {
    const start = splitDateTime(item.start_at);
    const end = splitDateTime(item.end_at);
    setEditTarget(item);
    setEditForm({
      department_id: item.department_id ?? '',
      contact_name: item.contact_name ?? '',
      contact_phone: item.contact_phone ?? '',
      room_id: item.room_id,
      reservation_date: start.date,
      start_time: start.time,
      end_time: end.time,
      purpose: item.purpose ?? item.title,
      notes: item.notes ?? '',
      recurrence: { ...DEFAULT_RECURRENCE },
    });
    setActionError(null);
  };

  const handleApprove = async (id: string) => {
    setSubmitting(true);
    setActionError(null);
    const result = await approve(id);
    setSubmitting(false);
    if (result.error) {
      setActionError(result.error.message);
      return;
    }
    setMessage('예약을 승인했습니다.');
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      setActionError('거절 사유를 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    setActionError(null);
    const result = await reject(rejectTarget.id, rejectReason.trim());
    setSubmitting(false);
    if (result.error) {
      setActionError(result.error.message);
      return;
    }
    setRejectTarget(null);
    setRejectReason('');
    setMessage('예약을 거절했습니다.');
  };

  const handleEditSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!editTarget || !editForm) return;
    setSubmitting(true);
    setActionError(null);
    const result = await editReservation(editTarget.id, editForm);
    setSubmitting(false);
    if (result.error) {
      setActionError(result.error.message);
      return;
    }
    setEditTarget(null);
    setEditForm(null);
    setMessage('예약을 수정했습니다.');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 예약을 취소하시겠습니까?')) return;
    setSubmitting(true);
    setActionError(null);
    const result = await removeReservation(id);
    setSubmitting(false);
    if (result.error) {
      setActionError(result.error.message);
      return;
    }
    setMessage('예약을 취소했습니다.');
  };

  const handleHolidaySubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!holidayDate || !holidayName.trim()) {
      setActionError('휴일 날짜와 이름을 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    setActionError(null);
    const result = await addHoliday({
      holiday_date: holidayDate,
      name: holidayName.trim(),
      description: holidayDescription.trim(),
    });
    setSubmitting(false);
    if (result.error) {
      setActionError(result.error.message);
      return;
    }
    setHolidayDate('');
    setHolidayName('');
    setHolidayDescription('');
    setMessage('휴일을 등록했습니다.');
  };

  const handleRoleChange = async (userId: string, role: UserRole) => {
    setSubmitting(true);
    setActionError(null);
    const result = await changeUserRole(userId, role);
    setSubmitting(false);
    if (result.error) {
      setActionError(result.error.message);
      return;
    }
    setMessage(
      role === 'admin'
        ? '관리자로 지정했습니다.'
        : `역할을 ${USER_ROLE_LABEL[role]}(으)로 변경했습니다.`,
    );
  };

  const handleActiveToggle = async (userId: string, nextActive: boolean) => {
    setSubmitting(true);
    setActionError(null);
    const result = await changeUserActive(userId, nextActive);
    setSubmitting(false);
    if (result.error) {
      setActionError(result.error.message);
      return;
    }
    setMessage(nextActive ? '계정을 활성화했습니다.' : '계정을 비활성화했습니다.');
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="ds-eyebrow">관리</p>
          <h1 className="ds-page-title">{isDeveloper && !isAdmin ? '개발자' : '관리자'}</h1>
          <p className="ds-page-subtitle">
            {isDeveloper && !isAdmin
              ? '사용자를 관리자로 지정하고 역할을 변경할 수 있습니다.'
              : '예약 승인·거절·수정·취소, 방 사용금지, 휴일 등록, 사용자 권한, 검색 및 CSV 다운로드를 관리합니다.'}
          </p>
        </div>
        {isAdmin ? <Badge tone="brand">대기 {pendingCount}건</Badge> : null}
      </div>

      {usingMockData ? (
        <Alert tone="info" title="미리보기 모드">
          Supabase 미연결 시 샘플 데이터로 관리자 기능을 확인할 수 있습니다.
        </Alert>
      ) : null}
      {error ? (
        <Alert tone="danger" title="불러오기 오류">
          {error}
        </Alert>
      ) : null}
      {message ? (
        <Alert tone="success" title="완료" onClose={() => setMessage(null)}>
          {message}
        </Alert>
      ) : null}
      {actionError ? (
        <Alert tone="danger" title="처리 실패" onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      ) : null}

      <div className="inline-flex rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={[
              'rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-semibold transition',
              tab === key
                ? 'bg-[var(--color-brand)] text-[var(--color-brand-fg)]'
                : 'text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-muted)]',
            ].join(' ')}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-16 text-center text-sm text-[var(--color-fg-muted)]">
          관리자 데이터를 불러오는 중...
        </div>
      ) : null}

      {!loading && tab === 'reservations' ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>예약 검색</CardTitle>
              <CardDescription>
                예약자, 방, 목적 등으로 검색하고 CSV로 내려받을 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="검색어"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="예약자, 방, 목적..."
              />
              <Select
                label="상태"
                options={[
                  { value: 'all', label: '전체' },
                  { value: 'pending', label: '대기' },
                  { value: 'approved', label: '승인' },
                  { value: 'rejected', label: '거절' },
                  { value: 'cancelled', label: '취소' },
                ]}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              />
              <Select
                label="방"
                options={[
                  { value: 'all', label: '전체' },
                  ...rooms.map((room) => ({
                    value: room.id,
                    label: room.name,
                  })),
                ]}
                value={roomFilter}
                onChange={(event) => setRoomFilter(event.target.value)}
              />
              <div className="flex items-end">
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={() =>
                    downloadReservationsExcel(
                      filteredReservations,
                      `reservations-${new Date().toISOString().slice(0, 10)}.csv`,
                    )
                  }
                >
                  CSV 다운로드
                </Button>
              </div>
            </CardBody>
          </Card>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>방</TableHead>
                <TableHead>예약자</TableHead>
                <TableHead>일정</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReservations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-[var(--color-fg-muted)]">
                    검색 결과가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filteredReservations.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.room_name ?? '-'}
                      <div className="text-xs text-[var(--color-fg-subtle)]">
                        {item.purpose ?? item.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.contact_name ?? '-'}
                      <div className="text-xs text-[var(--color-fg-subtle)]">
                        {item.contact_phone ?? ''}
                      </div>
                    </TableCell>
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
                      {item.rejection_reason ? (
                        <div className="mt-1 text-xs text-[var(--color-danger)]">
                          {item.rejection_reason}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {item.status === 'pending' ? (
                          <>
                            <Button
                              size="sm"
                              disabled={submitting}
                              onClick={() => void handleApprove(item.id)}
                            >
                              승인
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={submitting}
                              onClick={() => {
                                setRejectTarget(item);
                                setRejectReason('');
                              }}
                            >
                              거절
                            </Button>
                          </>
                        ) : null}
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={submitting}
                          onClick={() => openEdit(item)}
                        >
                          수정
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[var(--color-danger)]"
                          disabled={submitting}
                          onClick={() => void handleDelete(item.id)}
                        >
                          취소
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {!loading && tab === 'rooms' ? (
        <Card>
          <CardHeader>
            <CardTitle>방 사용금지</CardTitle>
            <CardDescription>
              사용금지된 방은 예약 목록에서 비활성으로 표시됩니다.
            </CardDescription>
          </CardHeader>
          <CardBody className="space-y-3">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-[var(--color-fg)]">{room.name}</p>
                  <p className="text-sm text-[var(--color-fg-muted)]">
                    {room.location ?? '-'} · {room.capacity}명
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={room.is_active ? 'success' : 'neutral'}>
                    {room.is_active ? '사용 가능' : '사용금지'}
                  </Badge>
                  <Button
                    size="sm"
                    variant={room.is_active ? 'secondary' : 'primary'}
                    disabled={submitting}
                    onClick={() =>
                      void setRoomBanned(room.id, room.is_active).then((result) => {
                        if (result.error) {
                          setActionError(result.error.message);
                          return;
                        }
                        setMessage(
                          room.is_active
                            ? `${room.name}을(를) 사용금지했습니다.`
                            : `${room.name} 사용금지를 해제했습니다.`,
                        );
                      })
                    }
                  >
                    {room.is_active ? '사용금지' : '사용 허용'}
                  </Button>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}

      {!loading && tab === 'holidays' ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <Card>
            <CardHeader>
              <CardTitle>휴일 등록</CardTitle>
              <CardDescription>교회 휴일·예약 불가일을 등록합니다.</CardDescription>
            </CardHeader>
            <CardBody>
              <form className="space-y-3" onSubmit={handleHolidaySubmit}>
                <DatePicker
                  label="날짜"
                  value={holidayDate}
                  onChange={(event) => setHolidayDate(event.target.value)}
                  required
                />
                <Input
                  label="휴일명"
                  value={holidayName}
                  onChange={(event) => setHolidayName(event.target.value)}
                  placeholder="예: 성탄절"
                  required
                />
                <Textarea
                  label="설명"
                  value={holidayDescription}
                  onChange={(event) => setHolidayDescription(event.target.value)}
                  placeholder="선택 사항"
                  rows={3}
                />
                <Button type="submit" disabled={submitting}>
                  휴일 등록
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>등록된 휴일</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2">
              {holidays.length === 0 ? (
                <p className="text-sm text-[var(--color-fg-muted)]">
                  등록된 휴일이 없습니다.
                </p>
              ) : (
                holidays.map((holiday) => (
                  <div
                    key={holiday.id}
                    className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-fg)]">
                        {holiday.holiday_date} · {holiday.name}
                      </p>
                      {holiday.description ? (
                        <p className="text-xs text-[var(--color-fg-muted)]">
                          {holiday.description}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[var(--color-danger)]"
                      onClick={() =>
                        void removeHoliday(holiday.id).then((result) => {
                          if (result.error) {
                            setActionError(result.error.message);
                            return;
                          }
                          setMessage('휴일을 삭제했습니다.');
                        })
                      }
                    >
                      삭제
                    </Button>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      ) : null}

      {!loading && tab === 'users' ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>사용자 권한</CardTitle>
              <CardDescription>
                {isDeveloper
                  ? '개발자는 다른 사용자를 관리자(admin)로 지정할 수 있습니다.'
                  : '부서장·일반사용자 역할을 변경할 수 있습니다. 관리자 지정은 개발자만 가능합니다.'}
              </CardDescription>
            </CardHeader>
            <CardBody>
              <Input
                label="검색"
                value={userQuery}
                onChange={(event) => setUserQuery(event.target.value)}
                placeholder="이름, 이메일, 역할..."
              />
            </CardBody>
          </Card>

          <Card>
            <CardBody className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>이메일</TableHead>
                    <TableHead>역할</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-[var(--color-fg-muted)]">
                        사용자가 없습니다. 회원가입 후 다시 확인해 주세요.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProfiles.map((profile) => {
                      const isSelf = profile.id === user?.id;
                      const canEditRole =
                        isDeveloper ||
                        (profile.role !== 'admin' && profile.role !== 'developer');
                      const roleOptions = (canEditRole ? assignableRoles : []).map(
                        (role) => ({
                          value: role,
                          label: USER_ROLE_LABEL[role],
                        }),
                      );
                      const selectOptions = roleOptions.some(
                        (option) => option.value === profile.role,
                      )
                        ? roleOptions
                        : canEditRole
                          ? [
                              {
                                value: profile.role,
                                label: USER_ROLE_LABEL[profile.role],
                              },
                              ...roleOptions,
                            ]
                          : roleOptions;

                      return (
                        <TableRow key={profile.id}>
                          <TableCell>
                            <div className="font-medium text-[var(--color-fg)]">
                              {profile.full_name || '이름 없음'}
                              {isSelf ? (
                                <span className="ml-2 text-xs text-[var(--color-fg-muted)]">
                                  (나)
                                </span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-[var(--color-fg-muted)]">
                            {profile.email}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <RoleBadge role={profile.role} />
                              {canEditRole && selectOptions.length > 0 ? (
                                <Select
                                  aria-label={`${profile.email} 역할`}
                                  value={profile.role}
                                  options={selectOptions}
                                  disabled={submitting}
                                  onChange={(event) => {
                                    const nextRole = event.target.value as UserRole;
                                    if (nextRole === profile.role) return;
                                    void handleRoleChange(profile.id, nextRole);
                                  }}
                                />
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge tone={profile.is_active === false ? 'neutral' : 'success'}>
                              {profile.is_active === false ? '비활성' : '활성'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={
                                submitting ||
                                isSelf ||
                                (!isDeveloper && profile.role === 'developer')
                              }
                              onClick={() =>
                                void handleActiveToggle(
                                  profile.id,
                                  profile.is_active === false,
                                )
                              }
                            >
                              {profile.is_active === false ? '활성화' : '비활성화'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardBody>
          </Card>
        </div>
      ) : null}

      <Modal
        open={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        title="예약 거절"
        description="거절 사유를 입력해 주세요."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>
              취소
            </Button>
            <Button disabled={submitting} onClick={() => void handleReject()}>
              거절 확정
            </Button>
          </>
        }
      >
        <Textarea
          label="거절 사유"
          value={rejectReason}
          onChange={(event) => setRejectReason(event.target.value)}
          placeholder="예: 해당 시간대는 이미 다른 일정이 있습니다."
          required
        />
      </Modal>

      <Modal
        open={Boolean(editTarget && editForm)}
        onClose={() => {
          setEditTarget(null);
          setEditForm(null);
        }}
        title="예약 수정"
        description="관리자 권한으로 예약 내용을 수정합니다."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setEditTarget(null);
                setEditForm(null);
              }}
            >
              취소
            </Button>
            <Button
              type="submit"
              form="admin-edit-form"
              disabled={submitting}
            >
              저장
            </Button>
          </>
        }
      >
        {editForm ? (
          <form id="admin-edit-form" className="space-y-3" onSubmit={handleEditSave}>
            <Select
              label="부서"
              options={departments.map((dept) => ({
                value: dept.id,
                label: dept.name,
              }))}
              value={editForm.department_id}
              onChange={(event) =>
                setEditForm({ ...editForm, department_id: event.target.value })
              }
            />
            <Input
              label="예약자"
              value={editForm.contact_name}
              onChange={(event) =>
                setEditForm({ ...editForm, contact_name: event.target.value })
              }
              required
            />
            <Input
              label="전화번호"
              value={editForm.contact_phone}
              onChange={(event) =>
                setEditForm({ ...editForm, contact_phone: event.target.value })
              }
              required
            />
            <Select
              label="방"
              options={rooms.map((room) => ({
                value: room.id,
                label: room.name,
              }))}
              value={editForm.room_id}
              onChange={(event) =>
                setEditForm({ ...editForm, room_id: event.target.value })
              }
            />
            <DatePicker
              label="예약일"
              value={editForm.reservation_date}
              onChange={(event) =>
                setEditForm({
                  ...editForm,
                  reservation_date: event.target.value,
                })
              }
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <TimePicker
                label="시작"
                value={editForm.start_time}
                onChange={(event) =>
                  setEditForm({ ...editForm, start_time: event.target.value })
                }
                required
              />
              <TimePicker
                label="종료"
                value={editForm.end_time}
                onChange={(event) =>
                  setEditForm({ ...editForm, end_time: event.target.value })
                }
                required
              />
            </div>
            <Input
              label="사용목적"
              value={editForm.purpose}
              onChange={(event) =>
                setEditForm({ ...editForm, purpose: event.target.value })
              }
              required
            />
            <Textarea
              label="비고"
              value={editForm.notes}
              onChange={(event) =>
                setEditForm({ ...editForm, notes: event.target.value })
              }
            />
          </form>
        ) : null}
      </Modal>
    </section>
  );
}
