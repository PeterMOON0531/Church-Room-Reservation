import type { Reservation, Room } from '../types';
import { addDays, startOfWeek } from '../utils/calendar';

export function createMockReservations(
  rooms: Room[],
  userId = 'demo-user-id',
): Reservation[] {
  if (rooms.length === 0) return [];

  const weekStart = startOfWeek(new Date());
  const now = new Date().toISOString();

  const samples: Array<{
    roomIndex: number;
    dayOffset: number;
    startHour: number;
    durationHours: number;
    title: string;
    contact: string;
  }> = [
    { roomIndex: 0, dayOffset: 0, startHour: 10, durationHours: 2, title: '주일 예배', contact: '예배부' },
    { roomIndex: 1, dayOffset: 1, startHour: 14, durationHours: 1.5, title: '성경공부', contact: '교육부' },
    { roomIndex: 2, dayOffset: 2, startHour: 19, durationHours: 2, title: '성가대 연습', contact: '성가대' },
    { roomIndex: 3, dayOffset: 3, startHour: 9, durationHours: 2, title: '유아부 모임', contact: '아동부' },
    { roomIndex: 4, dayOffset: 3, startHour: 15, durationHours: 1, title: '소그룹 회의', contact: '청년부' },
    { roomIndex: 5, dayOffset: 4, startHour: 11, durationHours: 1, title: '상담', contact: '관리부' },
    { roomIndex: 6, dayOffset: 5, startHour: 16, durationHours: 1.5, title: '선교 미팅', contact: '선교부' },
    { roomIndex: 0, dayOffset: 6, startHour: 10, durationHours: 2, title: '주일 예배', contact: '예배부' },
  ];

  return samples.map((sample, index) => {
    const room = rooms[sample.roomIndex % rooms.length];
    const day = addDays(weekStart, sample.dayOffset);
    const start = new Date(day);
    start.setHours(sample.startHour, 0, 0, 0);
    const end = new Date(start.getTime() + sample.durationHours * 60 * 60 * 1000);

    return {
      id: `mock-cal-${index}`,
      room_id: room.id,
      user_id: userId,
      department_id: null,
      title: sample.title,
      purpose: sample.title,
      contact_name: sample.contact,
      contact_phone: '010-0000-0000',
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      status: 'approved' as const,
      notes: null,
      created_at: now,
      updated_at: now,
      room_name: room.name,
      department_name: null,
    };
  });
}
