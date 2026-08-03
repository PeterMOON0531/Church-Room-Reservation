import { supabase } from '../../lib/supabase';
import type { Profile, UserRole } from '../../types';

type ProfileRow = Profile;

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name ?? null,
    phone: row.phone ?? null,
    department_id: row.department_id ?? null,
    role: row.role,
    is_active: row.is_active ?? true,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function fetchProfiles() {
  if (!supabase) {
    return { data: null, error: new Error('Supabase가 설정되지 않았습니다.') };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, email, full_name, phone, department_id, role, is_active, created_at, updated_at',
    )
    .order('created_at', { ascending: true });

  if (error) return { data: null, error };

  return {
    data: ((data ?? []) as ProfileRow[]).map(mapProfile),
    error: null,
  };
}

export async function setUserRole(userId: string, role: UserRole) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase가 설정되지 않았습니다.') };
  }

  const { data, error } = await supabase.rpc('set_user_role', {
    p_user_id: userId,
    p_role: role,
  });

  if (error) return { data: null, error };

  return {
    data: data ? mapProfile(data as ProfileRow) : null,
    error: null,
  };
}

export async function setUserActive(userId: string, isActive: boolean) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase가 설정되지 않았습니다.') };
  }

  const { data, error } = await supabase.rpc('set_user_active', {
    p_user_id: userId,
    p_is_active: isActive,
  });

  if (error) return { data: null, error };

  return {
    data: data ? mapProfile(data as ProfileRow) : null,
    error: null,
  };
}
