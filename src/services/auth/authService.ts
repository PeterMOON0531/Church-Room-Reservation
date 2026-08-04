import { AUTH_ROUTES } from '../../constants';
import { setRememberMe, supabase } from '../../lib/supabase';
import type { Profile } from '../../types';

export async function signInWithPassword(
  email: string,
  password: string,
  rememberMe: boolean,
) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase가 설정되지 않았습니다.') };
  }

  setRememberMe(rememberMe);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
}

export async function signUp(email: string, password: string, fullName: string) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase가 설정되지 않았습니다.') };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${window.location.origin}${AUTH_ROUTES.login}`,
    },
  });

  return { data, error };
}

export async function signOut() {
  if (!supabase) {
    return { error: new Error('Supabase가 설정되지 않았습니다.') };
  }

  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function requestPasswordReset(email: string) {
  if (!supabase) {
    return { error: new Error('Supabase가 설정되지 않았습니다.') };
  }

  const redirectTo = new URL(
    AUTH_ROUTES.resetPassword,
    window.location.origin,
  ).toString();

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  });

  return { error };
}

export async function updatePassword(password: string) {
  if (!supabase) {
    return { error: new Error('Supabase가 설정되지 않았습니다.') };
  }

  const { error } = await supabase.auth.updateUser({ password });
  return { error };
}

export async function fetchProfile(userId: string) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase가 설정되지 않았습니다.') };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, email, full_name, phone, department_id, role, is_active, created_at, updated_at',
    )
    .eq('id', userId)
    .maybeSingle();

  return {
    data: data
      ? ({
          ...data,
          phone: data.phone ?? null,
          department_id: data.department_id ?? null,
        } as Profile)
      : null,
    error,
  };
}

export function onAuthStateChange(
  callback: (event: string, session: import('@supabase/supabase-js').Session | null) => void,
) {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange(callback);
}

export async function getSession() {
  if (!supabase) {
    return { data: { session: null }, error: new Error('Supabase가 설정되지 않았습니다.') };
  }

  return supabase.auth.getSession();
}
