import { useState } from 'react';
import { Alert, Badge, Button, LoadingBlock } from '../../components';
import { RoleBadge } from '../../components/auth';
import { RoomCard, RoomEditModal } from '../../components/room';
import { useAuth, useRooms } from '../../hooks';
import type { Room } from '../../types';

export function RoomsPage() {
  const { isAdmin, profile } = useAuth();
  const { rooms, loading, error, usingMockData, canEdit, saveRoom, reload } =
    useRooms();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openEditModal = (room: Room) => {
    setSelectedRoom(room);
    setModalOpen(true);
  };

  const closeEditModal = () => {
    setModalOpen(false);
    setSelectedRoom(null);
  };

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="ds-eyebrow">방</p>
          <h1 className="ds-page-title">{isAdmin ? '방 관리' : '방 안내'}</h1>
          <p className="ds-page-subtitle">
            교회 공간 목록을 확인하고, 관리자는 방 정보를 수정할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {profile ? <RoleBadge role={profile.role} /> : null}
          <Badge tone={canEdit ? 'brand' : 'neutral'}>
            {canEdit ? '관리자 수정 가능' : '조회 전용'}
          </Badge>
        </div>
      </div>

      {usingMockData ? (
        <Alert tone="warning" title="미리보기 데이터">
          Supabase 연결 또는 시드 데이터가 없어 기본 방 목록을 표시합니다.
          {canEdit ? ' 관리자는 미리보기 모드에서도 화면상 수정을 테스트할 수 있습니다.' : ''}
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

      {!isAdmin ? (
        <Alert tone="info" title="조회 권한">
          일반 사용자와 부서장은 방 정보를 조회만 할 수 있습니다. 수정은 관리자만
          가능합니다.
        </Alert>
      ) : null}

      {loading ? (
        <LoadingBlock label="방 목록을 불러오는 중..." />
      ) : rooms.length === 0 ? (
        <Alert tone="info" title="방 없음">
          등록된 방이 없습니다. 관리자에게 시드/방 등록을 요청하세요.
        </Alert>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              canEdit={canEdit}
              onEdit={openEditModal}
            />
          ))}
        </div>
      )}

      <RoomEditModal
        room={selectedRoom}
        open={modalOpen}
        onClose={closeEditModal}
        onSave={saveRoom}
      />
    </section>
  );
}
