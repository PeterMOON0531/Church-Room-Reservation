import { useCallback, useEffect, useState } from 'react';
import {
  createMockDepartments,
  createMockReservations,
  createMockRooms,
} from '../../constants';
import { isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../auth';
import { fetchDepartments } from '../../services/department';
import {
  createHoliday,
  deleteHoliday,
  fetchHolidays,
} from '../../services/holiday';
import {
  fetchProfiles,
  setUserActive,
  setUserRole,
} from '../../services/profile';
import {
  cancelReservation,
  fetchReservations,
  updateReservation,
  updateReservationStatus,
} from '../../services/reservation';
import { queueReservationEmail } from '../../services/notification';
import { fetchRooms, updateRoom } from '../../services/room';
import type {
  Department,
  Holiday,
  HolidayInput,
  Profile,
  Reservation,
  ReservationFormInput,
  Room,
  UserRole,
} from '../../types';
import { combineDateAndTime } from '../../utils';

function createLocalHolidays(): Holiday[] {
  const now = new Date().toISOString();
  const year = new Date().getFullYear();
  return [
    {
      id: 'mock-holiday-1',
      holiday_date: `${year}-12-25`,
      name: '성탄절',
      description: '교회 휴일',
      created_by: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: 'mock-holiday-2',
      holiday_date: `${year}-01-01`,
      name: '신정',
      description: '교회 휴일',
      created_by: null,
      created_at: now,
      updated_at: now,
    },
  ];
}

export function useAdmin() {
  const { user, isAdmin, isDeveloper, canAccessAdmin } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured || !user) {
      if (!isSupabaseConfigured) {
        const mockRooms = createMockRooms();
        const mockReservations = createMockReservations(mockRooms, user?.id).map(
          (item, index) =>
            index % 3 === 0
              ? { ...item, status: 'pending' as const }
              : item,
        );
        setRooms(mockRooms);
        setDepartments(createMockDepartments());
        setReservations(mockReservations);
        setHolidays(createLocalHolidays());
        setProfiles([
          {
            id: user?.id ?? 'demo-user-id',
            email: 'developer@example.com',
            full_name: '개발자',
            phone: null,
            department_id: null,
            role: 'developer',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'mock-admin-user',
            email: 'admin@example.com',
            full_name: '교회 관리자',
            phone: null,
            department_id: null,
            role: 'user',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);
        setUsingMockData(true);
      } else {
        setRooms([]);
        setDepartments([]);
        setReservations([]);
        setHolidays([]);
        setProfiles([]);
        setUsingMockData(false);
      }
      setLoading(false);
      return;
    }

    const [roomsResult, departmentsResult, reservationsResult, holidaysResult, profilesResult] =
      await Promise.all([
        fetchRooms(),
        fetchDepartments(),
        fetchReservations(),
        fetchHolidays(),
        fetchProfiles(),
      ]);

    const errors = [
      roomsResult.error?.message,
      departmentsResult.error?.message,
      reservationsResult.error?.message,
      holidaysResult.error?.message,
      profilesResult.error?.message,
    ].filter(Boolean);

    setRooms(roomsResult.data ?? []);
    setDepartments(departmentsResult.data ?? []);
    setReservations(reservationsResult.data ?? []);
    setHolidays(holidaysResult.data ?? []);
    setProfiles(profilesResult.data ?? []);
    setUsingMockData(false);

    if (errors.length > 0) {
      setError(errors[0] ?? '데이터를 불러오지 못했습니다.');
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = useCallback(
    async (id: string) => {
      if (!isAdmin) return { error: new Error('관리자만 승인할 수 있습니다.') };

      if (usingMockData || !isSupabaseConfigured) {
        setReservations((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'approved',
                  approved_at: new Date().toISOString(),
                  approved_by: user?.id ?? null,
                  rejection_reason: null,
                }
              : item,
          ),
        );
        const target = reservations.find((item) => item.id === id);
        if (target) {
          queueReservationEmail('approved', {
            ...target,
            status: 'approved',
          });
        }
        return { error: null };
      }

      const { data, error: statusError } = await updateReservationStatus(
        id,
        'approved',
        { approvedBy: user?.id },
      );
      if (statusError || !data) {
        return { error: statusError ?? new Error('승인에 실패했습니다.') };
      }
      setReservations((current) =>
        current.map((item) => (item.id === id ? data : item)),
      );
      queueReservationEmail('approved', data);
      return { error: null };
    },
    [isAdmin, usingMockData, user?.id, reservations],
  );

  const reject = useCallback(
    async (id: string, reason: string) => {
      if (!isAdmin) return { error: new Error('관리자만 거절할 수 있습니다.') };

      if (usingMockData || !isSupabaseConfigured) {
        const target = reservations.find((item) => item.id === id);
        setReservations((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'rejected',
                  rejection_reason: reason,
                  approved_at: null,
                  approved_by: null,
                }
              : item,
          ),
        );
        if (target) {
          queueReservationEmail(
            'cancelled',
            {
              ...target,
              status: 'rejected',
              rejection_reason: reason,
            },
            { rejectionReason: reason },
          );
        }
        return { error: null };
      }

      const { data, error: statusError } = await updateReservationStatus(
        id,
        'rejected',
        { rejectionReason: reason },
      );
      if (statusError || !data) {
        return { error: statusError ?? new Error('거절에 실패했습니다.') };
      }
      setReservations((current) =>
        current.map((item) => (item.id === id ? data : item)),
      );
      queueReservationEmail('cancelled', data, { rejectionReason: reason });
      return { error: null };
    },
    [isAdmin, usingMockData, reservations],
  );

  const editReservation = useCallback(
    async (id: string, input: ReservationFormInput) => {
      if (!isAdmin) return { error: new Error('관리자만 수정할 수 있습니다.') };
      if (!user) return { error: new Error('로그인이 필요합니다.') };

      if (usingMockData || !isSupabaseConfigured) {
        let updatedReservation: Reservation | null = null;
        setReservations((current) =>
          current.map((item) => {
            if (item.id !== id) return item;
            updatedReservation = {
              ...item,
              room_id: input.room_id,
              department_id: input.department_id || null,
              contact_name: input.contact_name,
              contact_phone: input.contact_phone,
              purpose: input.purpose,
              title: input.purpose || item.title,
              notes: input.notes || null,
              start_at: combineDateAndTime(
                input.reservation_date,
                input.start_time,
              ),
              end_at: combineDateAndTime(
                input.reservation_date,
                input.end_time,
              ),
              room_name:
                rooms.find((room) => room.id === input.room_id)?.name ??
                item.room_name,
              department_name:
                departments.find((dept) => dept.id === input.department_id)
                  ?.name ?? item.department_name,
              updated_at: new Date().toISOString(),
            };
            return updatedReservation;
          }),
        );
        if (updatedReservation) {
          queueReservationEmail('updated', updatedReservation);
        }
        return { error: null };
      }

      const { data, error: updateError } = await updateReservation(
        id,
        input,
        user.id,
        reservations,
      );
      if (updateError || !data) {
        return { error: updateError ?? new Error('수정에 실패했습니다.') };
      }
      setReservations((current) =>
        current.map((item) => (item.id === id ? data : item)),
      );
      queueReservationEmail('updated', data);
      return { error: null };
    },
    [isAdmin, user, usingMockData, rooms, departments, reservations],
  );

  const removeReservation = useCallback(
    async (id: string) => {
      if (!isAdmin) return { error: new Error('관리자만 삭제할 수 있습니다.') };

      if (usingMockData || !isSupabaseConfigured) {
        const target = reservations.find((item) => item.id === id);
        setReservations((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'cancelled',
                  updated_at: new Date().toISOString(),
                }
              : item,
          ),
        );
        if (target) {
          queueReservationEmail('cancelled', {
            ...target,
            status: 'cancelled',
          });
        }
        return { error: null };
      }

      const { data, error: cancelError } = await cancelReservation(id);
      if (cancelError || !data) {
        return { error: cancelError ?? new Error('예약 취소에 실패했습니다.') };
      }
      setReservations((current) =>
        current.map((item) => (item.id === id ? data : item)),
      );
      queueReservationEmail('cancelled', data);
      return { error: null };
    },
    [isAdmin, usingMockData, reservations],
  );

  const setRoomBanned = useCallback(
    async (id: string, banned: boolean) => {
      if (!isAdmin) return { error: new Error('관리자만 변경할 수 있습니다.') };

      if (usingMockData || !isSupabaseConfigured) {
        setRooms((current) =>
          current.map((room) =>
            room.id === id
              ? { ...room, is_active: !banned, updated_at: new Date().toISOString() }
              : room,
          ),
        );
        return { error: null };
      }

      const { data, error: roomError } = await updateRoom(id, {
        is_active: !banned,
      });
      if (roomError || !data) {
        return { error: roomError ?? new Error('방 상태 변경에 실패했습니다.') };
      }
      setRooms((current) =>
        current.map((room) => (room.id === id ? data : room)),
      );
      return { error: null };
    },
    [isAdmin, usingMockData],
  );

  const addHoliday = useCallback(
    async (input: HolidayInput) => {
      if (!isAdmin) return { error: new Error('관리자만 등록할 수 있습니다.') };

      if (usingMockData || !isSupabaseConfigured) {
        const now = new Date().toISOString();
        const created: Holiday = {
          id: `mock-holiday-${Date.now()}`,
          holiday_date: input.holiday_date,
          name: input.name,
          description: input.description ?? null,
          created_by: user?.id ?? null,
          created_at: now,
          updated_at: now,
        };
        setHolidays((current) =>
          [...current, created].sort((a, b) =>
            a.holiday_date.localeCompare(b.holiday_date),
          ),
        );
        return { error: null };
      }

      const { data, error: holidayError } = await createHoliday(
        input,
        user?.id,
      );
      if (holidayError || !data) {
        return { error: holidayError ?? new Error('휴일 등록에 실패했습니다.') };
      }
      setHolidays((current) =>
        [...current, data].sort((a, b) =>
          a.holiday_date.localeCompare(b.holiday_date),
        ),
      );
      return { error: null };
    },
    [isAdmin, usingMockData, user?.id],
  );

  const removeHoliday = useCallback(
    async (id: string) => {
      if (!isAdmin) return { error: new Error('관리자만 삭제할 수 있습니다.') };

      if (usingMockData || !isSupabaseConfigured) {
        setHolidays((current) => current.filter((item) => item.id !== id));
        return { error: null };
      }

      const { error: holidayError } = await deleteHoliday(id);
      if (holidayError) return { error: holidayError };
      setHolidays((current) => current.filter((item) => item.id !== id));
      return { error: null };
    },
    [isAdmin, usingMockData],
  );

  const changeUserRole = useCallback(
    async (userId: string, role: UserRole) => {
      if (!isDeveloper && !isAdmin) {
        return { error: new Error('역할 변경 권한이 없습니다.') };
      }
      if (!isDeveloper && (role === 'admin' || role === 'developer')) {
        return { error: new Error('관리자 지정은 개발자만 할 수 있습니다.') };
      }

      if (usingMockData || !isSupabaseConfigured) {
        setProfiles((current) =>
          current.map((item) =>
            item.id === userId
              ? { ...item, role, updated_at: new Date().toISOString() }
              : item,
          ),
        );
        return { error: null };
      }

      const { data, error: roleError } = await setUserRole(userId, role);
      if (roleError) return { error: roleError };
      if (data) {
        setProfiles((current) =>
          current.map((item) => (item.id === data.id ? data : item)),
        );
      }
      return { error: null };
    },
    [isAdmin, isDeveloper, usingMockData],
  );

  const changeUserActive = useCallback(
    async (userId: string, isActive: boolean) => {
      if (!isDeveloper && !isAdmin) {
        return { error: new Error('계정 상태 변경 권한이 없습니다.') };
      }

      if (usingMockData || !isSupabaseConfigured) {
        setProfiles((current) =>
          current.map((item) =>
            item.id === userId
              ? { ...item, is_active: isActive, updated_at: new Date().toISOString() }
              : item,
          ),
        );
        return { error: null };
      }

      const { data, error: activeError } = await setUserActive(userId, isActive);
      if (activeError) return { error: activeError };
      if (data) {
        setProfiles((current) =>
          current.map((item) => (item.id === data.id ? data : item)),
        );
      }
      return { error: null };
    },
    [isAdmin, isDeveloper, usingMockData],
  );

  return {
    isAdmin,
    isDeveloper,
    canAccessAdmin,
    loading,
    error,
    usingMockData,
    reservations,
    rooms,
    holidays,
    departments,
    profiles,
    reload: load,
    approve,
    reject,
    editReservation,
    removeReservation,
    setRoomBanned,
    addHoliday,
    removeHoliday,
    changeUserRole,
    changeUserActive,
  };
}
