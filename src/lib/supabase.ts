import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AUTH_REMEMBER_ME_KEY, DEMO_AUTH_KEY } from '../constants';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const isDemoAllowed =
  import.meta.env.DEV && !isSupabaseConfigured;

function createAuthStorage(): Storage {
  const getStorage = () =>
    localStorage.getItem(AUTH_REMEMBER_ME_KEY) === 'false'
      ? sessionStorage
      : localStorage;

  const managedKeys = (storage: Storage) => {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key) continue;
      if (
        key === AUTH_REMEMBER_ME_KEY ||
        key === DEMO_AUTH_KEY ||
        key.startsWith('sb-')
      ) {
        keys.push(key);
      }
    }
    return keys;
  };

  return {
    get length() {
      return getStorage().length;
    },
    clear() {
      const localKeys = managedKeys(localStorage);
      const sessionKeys = managedKeys(sessionStorage);
      localKeys.forEach((key) => localStorage.removeItem(key));
      sessionKeys.forEach((key) => sessionStorage.removeItem(key));
    },
    getItem(key: string) {
      return getStorage().getItem(key);
    },
    key(index: number) {
      return getStorage().key(index);
    },
    removeItem(key: string) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    },
    setItem(key: string, value: string) {
      getStorage().setItem(key, value);
    },
  };
}

function createSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;

  return createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: createAuthStorage(),
    },
  });
}

export const supabase = createSupabaseClient();

export function setRememberMe(remember: boolean) {
  localStorage.setItem(AUTH_REMEMBER_ME_KEY, remember ? 'true' : 'false');
}
