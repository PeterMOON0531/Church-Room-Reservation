import { supabase } from '../../lib/supabase';
import type { Holiday, HolidayInput } from '../../types';

export async function fetchHolidays() {
  if (!supabase) {
    return { data: null, error: new Error('Supabase가 설정되지 않았습니다.') };
  }

  const { data, error } = await supabase
    .from('holidays')
    .select('id, holiday_date, name, description, created_by, created_at, updated_at')
    .order('holiday_date', { ascending: true });

  if (error) return { data: null, error };
  return { data: (data ?? []) as Holiday[], error: null };
}

export async function createHoliday(input: HolidayInput, createdBy?: string) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase가 설정되지 않았습니다.') };
  }

  const { data, error } = await supabase
    .from('holidays')
    .insert({
      holiday_date: input.holiday_date,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      created_by: createdBy ?? null,
    })
    .select('id, holiday_date, name, description, created_by, created_at, updated_at')
    .single();

  if (error) return { data: null, error };
  return { data: data as Holiday, error: null };
}

export async function deleteHoliday(id: string) {
  if (!supabase) {
    return { error: new Error('Supabase가 설정되지 않았습니다.') };
  }

  const { error } = await supabase.from('holidays').delete().eq('id', id);
  return { error };
}
