export const APP_ROUTES = {
  home: '/',
  rooms: '/rooms',
  reservations: '/reservations',
  calendar: '/calendar',
  admin: '/admin',
} as const;

export type DefaultRoomSeed = {
  code: string;
  name: string;
  location: string;
  capacity: number;
  description: string;
};

export const DEFAULT_ROOMS: DefaultRoomSeed[] = [
  {
    code: 'main-hall',
    name: '본당',
    location: '1층',
    capacity: 300,
    description: '주일 예배 및 대규모 집회 공간',
  },
  {
    code: 'chapel-2f',
    name: '2층 예배실',
    location: '2층',
    capacity: 80,
    description: '소규모 예배 및 기도회 공간',
  },
  {
    code: 'choir',
    name: '성가대실',
    location: '2층',
    capacity: 30,
    description: '성가대 연습 및 음악 사역 공간',
  },
  {
    code: 'nursery',
    name: '유아실',
    location: '1층',
    capacity: 20,
    description: '유아·아동 돌봄 및 교육 공간',
  },
  {
    code: 'meeting-1',
    name: '소회의실1',
    location: '3층',
    capacity: 12,
    description: '소그룹·회의용 공간',
  },
  {
    code: 'meeting-2',
    name: '소회의실2',
    location: '3층',
    capacity: 12,
    description: '소그룹·회의용 공간',
  },
  {
    code: 'cabin-1',
    name: '캐빈1',
    location: '별관',
    capacity: 6,
    description: '1:1 상담 및 소규모 모임 공간',
  },
  {
    code: 'cabin-2',
    name: '캐빈2',
    location: '별관',
    capacity: 6,
    description: '1:1 상담 및 소규모 모임 공간',
  },
  {
    code: 'cabin-3',
    name: '캐빈3',
    location: '별관',
    capacity: 6,
    description: '1:1 상담 및 소규모 모임 공간',
  },
];

const ROOM_DISPLAY_ORDER = new Map(
  DEFAULT_ROOMS.map((room, index) => [room.code, index]),
);

/** Prefer seed order (본당 first); unknown rooms follow alphabetically. */
export function sortRoomsByDisplayOrder<
  T extends { code: string; name: string },
>(rooms: T[]): T[] {
  return [...rooms].sort((a, b) => {
    const aOrder = ROOM_DISPLAY_ORDER.get(a.code);
    const bOrder = ROOM_DISPLAY_ORDER.get(b.code);

    if (aOrder !== undefined && bOrder !== undefined) {
      return aOrder - bOrder;
    }
    if (aOrder !== undefined) return -1;
    if (bOrder !== undefined) return 1;
    return a.name.localeCompare(b.name, 'ko');
  });
}

export function createMockRooms(): import('../types').Room[] {
  const now = new Date().toISOString();

  return sortRoomsByDisplayOrder(
    DEFAULT_ROOMS.map((room) => ({
      id: `mock-${room.code}`,
      code: room.code,
      name: room.name,
      location: room.location,
      capacity: room.capacity,
      department_id: null,
      description: room.description,
      amenities: [],
      is_active: true,
      created_at: now,
      updated_at: now,
    })),
  );
}
