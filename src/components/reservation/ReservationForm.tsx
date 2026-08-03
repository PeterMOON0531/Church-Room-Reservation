import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  DatePicker,
  Input,
  Select,
  Textarea,
  TimePicker,
} from '../common';
import type {
  Department,
  RecurrenceFrequency,
  Reservation,
  ReservationFormInput,
  Room,
} from '../../types';
import { DEFAULT_RECURRENCE } from '../../types';
import {
  clampText,
  describeRecurrence,
  expandRecurrenceDates,
  formatConflictTime,
  isValidPhone,
  splitDateTime,
  type ReservationConflict,
} from '../../utils';

const EMPTY_FORM: ReservationFormInput = {
  department_id: '',
  contact_name: '',
  contact_phone: '',
  room_id: '',
  reservation_date: '',
  start_time: '',
  end_time: '',
  purpose: '',
  notes: '',
  recurrence: { ...DEFAULT_RECURRENCE },
};

type MutationResult = {
  error: Error | null;
  conflicts?: ReservationConflict[];
  createdCount?: number;
  skippedCount?: number;
  skipped?: Array<{ date: string; conflicts: ReservationConflict[] }>;
};

type ReservationFormProps = {
  rooms: Room[];
  departments: Department[];
  selected: Reservation | null;
  defaultContactName?: string;
  defaultContactPhone?: string;
  defaultDepartmentId?: string;
  onCreate: (input: ReservationFormInput) => Promise<MutationResult>;
  onUpdate: (id: string, input: ReservationFormInput) => Promise<MutationResult>;
  onDelete: (id: string) => Promise<{ error: Error | null }>;
  onCancelSelection: () => void;
};

const FREQUENCY_OPTIONS: Array<{ value: RecurrenceFrequency; label: string }> = [
  { value: 'none', label: '반복 없음' },
  { value: 'weekly', label: '매주' },
  { value: 'monthly', label: '매월' },
  { value: 'yearly', label: '매년' },
  { value: 'custom', label: '사용자 지정' },
];

export function ReservationForm({
  rooms,
  departments,
  selected,
  defaultContactName = '',
  defaultContactPhone = '',
  defaultDepartmentId = '',
  onCreate,
  onUpdate,
  onDelete,
  onCancelSelection,
}: ReservationFormProps) {
  const [form, setForm] = useState<ReservationFormInput>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<ReservationConflict[]>([]);
  const [skippedDates, setSkippedDates] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEditMode = Boolean(selected);
  const hasConflict = conflicts.length > 0;
  const isRecurring = form.recurrence.frequency !== 'none';

  const previewCount = useMemo(() => {
    if (!form.reservation_date || !isRecurring) return 0;
    return expandRecurrenceDates(form.reservation_date, form.recurrence).length;
  }, [form.reservation_date, form.recurrence, isRecurring]);

  useEffect(() => {
    if (selected) {
      const start = splitDateTime(selected.start_at);
      const end = splitDateTime(selected.end_at);
      setForm({
        department_id: selected.department_id ?? '',
        contact_name: selected.contact_name ?? '',
        contact_phone: selected.contact_phone ?? '',
        room_id: selected.room_id,
        reservation_date: start.date,
        start_time: start.time,
        end_time: end.time,
        purpose: selected.purpose ?? selected.title ?? '',
        notes: selected.notes ?? '',
        recurrence: { ...DEFAULT_RECURRENCE },
      });
      setError(null);
      setConflicts([]);
      setSkippedDates([]);
      setSuccess(null);
      return;
    }

    setForm({
      ...EMPTY_FORM,
      contact_name: defaultContactName,
      contact_phone: defaultContactPhone,
      department_id: defaultDepartmentId,
      recurrence: { ...DEFAULT_RECURRENCE },
    });
    setConflicts([]);
    setSkippedDates([]);
  }, [selected, defaultContactName, defaultContactPhone, defaultDepartmentId]);

  const updateField = <K extends keyof ReservationFormInput>(
    key: K,
    value: ReservationFormInput[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    setConflicts([]);
    setSkippedDates([]);
    setError(null);
  };

  const updateRecurrence = <K extends keyof typeof form.recurrence>(
    key: K,
    value: (typeof form.recurrence)[K],
  ) => {
    setForm((current) => ({
      ...current,
      recurrence: { ...current.recurrence, [key]: value },
    }));
    setConflicts([]);
    setSkippedDates([]);
    setError(null);
  };

  const validate = () => {
    if (!form.department_id) return '부서를 선택해 주세요.';
    if (!form.contact_name.trim()) return '예약자를 입력해 주세요.';
    if (!form.contact_phone.trim()) return '전화번호를 입력해 주세요.';
    if (!isValidPhone(form.contact_phone)) {
      return '전화번호 형식을 확인해 주세요.';
    }
    if (!form.room_id) return '방을 선택해 주세요.';
    if (!form.reservation_date) return '예약일을 선택해 주세요.';
    if (!form.start_time) return '시작 시간을 선택해 주세요.';
    if (!form.end_time) return '종료 시간을 선택해 주세요.';
    if (form.end_time <= form.start_time) {
      return '종료 시간은 시작 시간보다 늦어야 합니다.';
    }
    if (!form.purpose.trim()) return '사용목적을 입력해 주세요.';
    if (form.purpose.trim().length > 500) {
      return '사용목적은 500자 이내로 입력해 주세요.';
    }
    if (form.notes.trim().length > 1000) {
      return '비고는 1000자 이내로 입력해 주세요.';
    }

    if (isRecurring) {
      if (form.recurrence.interval < 1) {
        return '반복 간격은 1 이상이어야 합니다.';
      }
      if (form.recurrence.endMode === 'count' && form.recurrence.count < 1) {
        return '반복 횟수는 1회 이상이어야 합니다.';
      }
      if (form.recurrence.endMode === 'until') {
        if (!form.recurrence.untilDate) {
          return '반복 종료일을 선택해 주세요.';
        }
        if (form.recurrence.untilDate < form.reservation_date) {
          return '반복 종료일은 시작일 이후여야 합니다.';
        }
      }
    }

    return null;
  };

  const applyMutationResult = (result: MutationResult) => {
    if (result.createdCount && result.createdCount > 0) {
      setConflicts([]);
      const skipped = result.skipped?.map((item) => item.date) ?? [];
      setSkippedDates(skipped);
      return true;
    }

    if (result.conflicts && result.conflicts.length > 0) {
      setConflicts(result.conflicts);
      setSkippedDates([]);
      setError('이미 예약된 시간입니다.');
      return false;
    }

    if (result.error) {
      setConflicts([]);
      setSkippedDates([]);
      setError(result.error.message);
      return false;
    }

    setConflicts([]);
    return true;
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setConflicts([]);
    setSkippedDates([]);
    setSuccess(null);

    if (isEditMode) {
      setError('수정 모드입니다. 수정 버튼을 사용하거나 취소를 눌러 주세요.');
      return;
    }

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    const result = await onCreate({
      ...form,
      contact_name: clampText(form.contact_name, 80),
      contact_phone: clampText(form.contact_phone, 40),
      purpose: clampText(form.purpose, 500),
      notes: clampText(form.notes, 1000),
    });
    setSubmitting(false);

    if (!applyMutationResult(result)) return;

    const createdCount = result.createdCount ?? 1;
    const skippedCount = result.skippedCount ?? 0;
    if (isRecurring) {
      if (skippedCount > 0) {
        setSuccess(
          `반복 예약 ${createdCount}건이 등록되었습니다. 충돌 ${skippedCount}건은 제외했습니다.`,
        );
      } else {
        setSuccess(`반복 예약 ${createdCount}건이 등록되었습니다.`);
      }
    } else {
      setSuccess('예약이 등록되었습니다.');
    }

    setForm({
      ...EMPTY_FORM,
      contact_name: defaultContactName,
      contact_phone: defaultContactPhone,
      department_id: defaultDepartmentId,
      recurrence: { ...DEFAULT_RECURRENCE },
    });
  };

  const handleUpdate = async () => {
    if (!selected) {
      setError('수정할 예약을 목록에서 선택해 주세요.');
      return;
    }

    setError(null);
    setConflicts([]);
    setSkippedDates([]);
    setSuccess(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    const result = await onUpdate(selected.id, {
      ...form,
      recurrence: { ...DEFAULT_RECURRENCE },
    });
    setSubmitting(false);

    if (!applyMutationResult(result)) return;

    setSuccess('예약이 수정되었습니다.');
  };

  const handleDelete = async () => {
    if (!selected) {
      setError('삭제할 예약을 목록에서 선택해 주세요.');
      return;
    }

    const confirmed = window.confirm('선택한 예약을 취소하시겠습니까?');
    if (!confirmed) return;

    setError(null);
    setConflicts([]);
    setSkippedDates([]);
    setSuccess(null);
    setSubmitting(true);
    const { error: deleteError } = await onDelete(selected.id);
    setSubmitting(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setSuccess('예약이 취소되었습니다.');
    onCancelSelection();
  };

  const handleCancel = () => {
    setError(null);
    setConflicts([]);
    setSkippedDates([]);
    setSuccess(null);
    onCancelSelection();
    setForm({
      ...EMPTY_FORM,
      contact_name: defaultContactName,
      contact_phone: defaultContactPhone,
      department_id: defaultDepartmentId,
      recurrence: { ...DEFAULT_RECURRENCE },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditMode ? '예약 수정' : '예약 등록'}</CardTitle>
        <CardDescription>
          부서, 예약자, 방, 일정, 사용목적을 입력한 뒤 등록·수정·취소할 수
          있습니다. 반복 예약 중 충돌이 있으면 해당 날짜만 제외하고 등록합니다.
          예약 상태 변경 시 예약자 계정 이메일로 안내가 발송됩니다.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleCreate}>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          {error || hasConflict ? (
            <div className="sm:col-span-2">
              <Alert tone="danger" title="이미 예약된 시간입니다.">
                {hasConflict ? (
                  <ul className="mt-2 space-y-2">
                    {conflicts.map((conflict) => (
                      <li
                        key={conflict.id}
                        className="rounded-[var(--radius-md)] border border-[color-mix(in_oklab,var(--color-danger)_35%,transparent)] bg-[color-mix(in_oklab,var(--color-danger)_8%,transparent)] px-3 py-2"
                      >
                        <p className="text-sm text-[var(--color-fg)]">
                          예약자:{' '}
                          <span className="font-semibold">
                            {conflict.contact_name?.trim() || '이름 없음'}
                          </span>
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[var(--color-danger)]">
                          예약시간:{' '}
                          <span className="underline decoration-2 underline-offset-2">
                            {formatConflictTime(conflict)}
                          </span>
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  error
                )}
              </Alert>
            </div>
          ) : null}
          {success ? (
            <div className="sm:col-span-2">
              <Alert tone="success" title="완료">
                {success}
                {skippedDates.length > 0 ? (
                  <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
                    제외된 날짜: {skippedDates.join(', ')}
                  </p>
                ) : null}
              </Alert>
            </div>
          ) : null}

          <Select
            label="부서"
            placeholder="부서를 선택하세요"
            options={departments.map((dept) => ({
              value: dept.id,
              label: dept.name,
            }))}
            value={form.department_id}
            onChange={(event) => updateField('department_id', event.target.value)}
            required
          />
          <Input
            label="예약자"
            value={form.contact_name}
            onChange={(event) => updateField('contact_name', event.target.value)}
            placeholder="이름"
            required
          />
          <Input
            label="전화번호"
            type="tel"
            value={form.contact_phone}
            onChange={(event) => updateField('contact_phone', event.target.value)}
            placeholder="010-0000-0000"
            required
          />
          <Select
            label="방"
            placeholder="방을 선택하세요"
            options={rooms
              .filter((room) => room.is_active)
              .map((room) => ({
                value: room.id,
                label: `${room.name}${room.location ? ` (${room.location})` : ''}`,
              }))}
            value={form.room_id}
            onChange={(event) => updateField('room_id', event.target.value)}
            required
          />
          <DatePicker
            label="예약일"
            value={form.reservation_date}
            onChange={(event) =>
              updateField('reservation_date', event.target.value)
            }
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <TimePicker
              label="시작시간"
              value={form.start_time}
              onChange={(event) => updateField('start_time', event.target.value)}
              required
              className={
                hasConflict
                  ? 'border-[var(--color-danger)] text-[var(--color-danger)]'
                  : undefined
              }
            />
            <TimePicker
              label="종료시간"
              value={form.end_time}
              onChange={(event) => updateField('end_time', event.target.value)}
              required
              className={
                hasConflict
                  ? 'border-[var(--color-danger)] text-[var(--color-danger)]'
                  : undefined
              }
            />
          </div>
          <Input
            className="sm:col-span-2"
            label="사용목적"
            value={form.purpose}
            onChange={(event) => updateField('purpose', event.target.value)}
            placeholder="모임/예배/연습 목적"
            required
          />

          {!isEditMode ? (
            <div className="sm:col-span-2 grid gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-brand)_6%,transparent)] p-4 sm:grid-cols-2">
              <Select
                label="반복"
                options={FREQUENCY_OPTIONS}
                value={form.recurrence.frequency}
                onChange={(event) =>
                  updateRecurrence(
                    'frequency',
                    event.target.value as RecurrenceFrequency,
                  )
                }
              />

              {isRecurring ? (
                <>
                  <Input
                    label="간격"
                    type="number"
                    min={1}
                    max={52}
                    value={String(form.recurrence.interval)}
                    onChange={(event) =>
                      updateRecurrence(
                        'interval',
                        Math.max(1, Number(event.target.value) || 1),
                      )
                    }
                    hint={
                      form.recurrence.frequency === 'weekly'
                        ? '예: 1 = 매주, 2 = 격주'
                        : form.recurrence.frequency === 'monthly'
                          ? '예: 1 = 매월, 2 = 격월'
                          : form.recurrence.frequency === 'yearly'
                            ? '예: 1 = 매년'
                            : '사용자 지정 간격'
                    }
                  />

                  {form.recurrence.frequency === 'custom' ? (
                    <Select
                      label="단위"
                      options={[
                        { value: 'day', label: '일' },
                        { value: 'week', label: '주' },
                        { value: 'month', label: '개월' },
                        { value: 'year', label: '년' },
                      ]}
                      value={form.recurrence.customUnit}
                      onChange={(event) =>
                        updateRecurrence(
                          'customUnit',
                          event.target.value as typeof form.recurrence.customUnit,
                        )
                      }
                    />
                  ) : null}

                  <Select
                    label="종료 방식"
                    options={[
                      { value: 'count', label: '횟수' },
                      { value: 'until', label: '종료일' },
                    ]}
                    value={form.recurrence.endMode}
                    onChange={(event) =>
                      updateRecurrence(
                        'endMode',
                        event.target.value as typeof form.recurrence.endMode,
                      )
                    }
                  />

                  {form.recurrence.endMode === 'count' ? (
                    <Input
                      label="반복 횟수"
                      type="number"
                      min={1}
                      max={104}
                      value={String(form.recurrence.count)}
                      onChange={(event) =>
                        updateRecurrence(
                          'count',
                          Math.max(1, Number(event.target.value) || 1),
                        )
                      }
                      hint="첫 예약일 포함"
                    />
                  ) : (
                    <DatePicker
                      label="반복 종료일"
                      value={form.recurrence.untilDate}
                      onChange={(event) =>
                        updateRecurrence('untilDate', event.target.value)
                      }
                      required
                    />
                  )}

                  <div className="sm:col-span-2 text-sm text-[var(--color-fg-muted)]">
                    {describeRecurrence(form.recurrence)}
                    {form.reservation_date && previewCount > 0
                      ? ` · 예정 ${previewCount}건 (충돌 시 해당 날짜만 제외)`
                      : null}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          <Textarea
            className="sm:col-span-2"
            label="비고"
            value={form.notes}
            onChange={(event) => updateField('notes', event.target.value)}
            placeholder="추가 요청사항이 있으면 입력하세요"
            rows={3}
          />
        </CardBody>

        <CardFooter className="justify-end">
          {isEditMode ? (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancel}
                disabled={submitting}
              >
                선택 해제
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-[var(--color-danger)] hover:bg-[color-mix(in_oklab,var(--color-danger)_10%,transparent)] hover:text-[var(--color-danger)]"
                onClick={() => void handleDelete()}
                disabled={submitting}
              >
                예약취소
              </Button>
              <Button
                type="button"
                onClick={() => void handleUpdate()}
                disabled={submitting}
              >
                저장
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancel}
                disabled={submitting}
              >
                초기화
              </Button>
              <Button type="submit" disabled={submitting}>
                등록
              </Button>
            </>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
