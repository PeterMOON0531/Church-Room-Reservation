import { supabase } from '../../lib/supabase';
import type { Department } from '../../types';

export async function fetchDepartments() {
  if (!supabase) {
    return { data: null, error: new Error('Supabase가 설정되지 않았습니다.') };
  }

  const { data, error } = await supabase
    .from('departments')
    .select('id, code, name, description, is_active')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) return { data: null, error };

  return { data: (data ?? []) as Department[], error: null };
}
