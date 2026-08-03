import { sortRoomsByDisplayOrder } from '../../constants';
import { supabase } from '../../lib/supabase';
import type { Room, UpdateRoomInput } from '../../types';

function mapRoom(row: Record<string, unknown>): Room {
  const amenities = row.amenities;
  return {
    id: row.id as string,
    code: row.code as string,
    name: row.name as string,
    location: (row.location as string | null) ?? null,
    capacity: row.capacity as number,
    department_id: (row.department_id as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    amenities: Array.isArray(amenities) ? (amenities as string[]) : [],
    is_active: row.is_active as boolean,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function fetchRooms() {
  if (!supabase) {
    return { data: null, error: new Error('Supabase가 설정되지 않았습니다.') };
  }

  const { data, error } = await supabase
    .from('rooms')
    .select(
      'id, code, name, location, capacity, department_id, description, amenities, is_active, created_at, updated_at',
    )
    .order('name', { ascending: true });

  if (error) return { data: null, error };

  return {
    data: sortRoomsByDisplayOrder((data ?? []).map(mapRoom)),
    error: null,
  };
}

export async function updateRoom(id: string, input: UpdateRoomInput) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase가 설정되지 않았습니다.') };
  }

  const { data, error } = await supabase
    .from('rooms')
    .update(input)
    .eq('id', id)
    .select(
      'id, code, name, location, capacity, department_id, description, amenities, is_active, created_at, updated_at',
    )
    .single();

  if (error) return { data: null, error };

  return { data: mapRoom(data), error: null };
}
