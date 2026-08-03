import { Badge, Button, Card, CardBody } from '../common';
import type { Room } from '../../types';
import { cn } from '../../utils';

type RoomCardProps = {
  room: Room;
  canEdit: boolean;
  onEdit?: (room: Room) => void;
};

export function RoomCard({ room, canEdit, onEdit }: RoomCardProps) {
  return (
    <Card className={cn(!room.is_active && 'opacity-70')}>
      <CardBody className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold tracking-tight text-[var(--color-fg)]">
                {room.name}
              </h3>
              <Badge tone={room.is_active ? 'success' : 'neutral'}>
                {room.is_active ? '사용 가능' : '비활성'}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-[var(--color-fg-subtle)]">{room.code}</p>
          </div>
          {canEdit && onEdit ? (
            <Button variant="secondary" size="sm" onClick={() => onEdit(room)}>
              수정
            </Button>
          ) : null}
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[var(--color-fg-subtle)]">위치</dt>
            <dd className="mt-0.5 font-medium text-[var(--color-fg)]">
              {room.location ?? '-'}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--color-fg-subtle)]">수용 인원</dt>
            <dd className="mt-0.5 font-medium text-[var(--color-fg)]">
              {room.capacity}명
            </dd>
          </div>
        </dl>

        {room.description ? (
          <p className="text-sm leading-relaxed text-[var(--color-fg-muted)]">
            {room.description}
          </p>
        ) : null}

        {room.amenities.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {room.amenities.map((item) => (
              <Badge key={item}>{item}</Badge>
            ))}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
