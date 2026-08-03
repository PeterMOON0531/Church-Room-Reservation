import { useCallback, useEffect, useState } from 'react';
import { createMockRooms } from '../../constants';
import { useAuth } from '../auth';
import { fetchRooms, updateRoom } from '../../services/room';
import type { Room, UpdateRoomInput } from '../../types';
import { isSupabaseConfigured } from '../../lib/supabase';

export function useRooms() {
  const { isAdmin } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured) {
      setRooms(createMockRooms());
      setUsingMockData(true);
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await fetchRooms();
    setLoading(false);

    if (fetchError) {
      setRooms([]);
      setUsingMockData(false);
      setError(fetchError.message);
      return;
    }

    setRooms(data ?? []);
    setUsingMockData(false);
  }, []);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  const saveRoom = useCallback(
    async (id: string, input: UpdateRoomInput) => {
      if (!isAdmin) {
        return { data: null, error: new Error('관리자만 수정할 수 있습니다.') };
      }

      if (usingMockData || !isSupabaseConfigured) {
        setRooms((current) =>
          current.map((room) =>
            room.id === id
              ? {
                  ...room,
                  ...input,
                  location: input.location ?? room.location,
                  capacity: input.capacity ?? room.capacity,
                  description: input.description ?? room.description,
                  amenities: input.amenities ?? room.amenities,
                  is_active: input.is_active ?? room.is_active,
                  updated_at: new Date().toISOString(),
                }
              : room,
          ),
        );
        return { data: null, error: null };
      }

      const { data, error: updateError } = await updateRoom(id, input);

      if (updateError || !data) {
        return { data: null, error: updateError ?? new Error('저장에 실패했습니다.') };
      }

      setRooms((current) =>
        current.map((room) => (room.id === id ? data : room)),
      );

      return { data, error: null };
    },
    [isAdmin, usingMockData],
  );

  return {
    rooms,
    loading,
    error,
    usingMockData,
    canEdit: isAdmin,
    reload: loadRooms,
    saveRoom,
  };
}
