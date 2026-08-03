import { useEffect, useState, type FormEvent } from 'react';
import { Alert, Button, Input, Modal, Textarea } from '../common';
import type { Room, UpdateRoomInput } from '../../types';
import { cn } from '../../utils';

type RoomEditModalProps = {
  room: Room | null;
  open: boolean;
  onClose: () => void;
  onSave: (
    id: string,
    input: UpdateRoomInput,
  ) => Promise<{ data?: Room | null; error: Error | null }>;
};

export function RoomEditModal({ room, open, onClose, onSave }: RoomEditModalProps) {
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('1');
  const [description, setDescription] = useState('');
  const [amenitiesText, setAmenitiesText] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!room) return;

    setLocation(room.location ?? '');
    setCapacity(String(room.capacity));
    setDescription(room.description ?? '');
    setAmenitiesText(room.amenities.join(', '));
    setIsActive(room.is_active);
    setError(null);
  }, [room]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!room) return;

    const parsedCapacity = Number(capacity);
    if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1) {
      setError('수용 인원은 1 이상의 정수여야 합니다.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const amenities = amenitiesText
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const { error: saveError } = await onSave(room.id, {
      location: location.trim() || null,
      capacity: parsedCapacity,
      description: description.trim() || null,
      amenities,
      is_active: isActive,
    });

    setSubmitting(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={room ? `${room.name} 수정` : '방 수정'}
      description="위치, 수용 인원, 설명, 편의시설, 사용 여부를 변경할 수 있습니다."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" form="room-edit-form" disabled={submitting}>
            {submitting ? '저장 중...' : '저장'}
          </Button>
        </>
      }
    >
      <form id="room-edit-form" className="space-y-4" onSubmit={handleSubmit}>
        {error ? (
          <Alert tone="danger" title="저장 실패">
            {error}
          </Alert>
        ) : null}

        <Input label="방 이름" value={room?.name ?? ''} disabled />
        <Input
          label="위치"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="예: 1층, 2층, 별관"
        />
        <Input
          label="수용 인원"
          type="number"
          min={1}
          value={capacity}
          onChange={(event) => setCapacity(event.target.value)}
          required
        />
        <Textarea
          label="설명"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="공간 용도 및 안내"
          rows={3}
        />
        <Input
          label="편의시설"
          value={amenitiesText}
          onChange={(event) => setAmenitiesText(event.target.value)}
          placeholder="프로젝터, 화이트보드 (쉼표로 구분)"
          hint="쉼표(,)로 여러 항목을 입력할 수 있습니다."
        />

        <label className="inline-flex items-center gap-2 text-sm text-[var(--color-fg-muted)]">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            className={cn(
              'h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-brand)]',
              'focus:ring-[var(--color-brand)]',
            )}
          />
          예약 가능 상태
        </label>
      </form>
    </Modal>
  );
}
