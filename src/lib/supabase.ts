import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AUTH_REMEMBER_ME_KEY, DEMO_AUTH_KEY } from '../constants';

function isUsableSupabaseUrl(value: string | undefined): value is string {
  if (!value) return false;
  if (value.includes('your-project')) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Project URL only — never include /auth/v1 or other paths. */
function normalizeSupabaseUrl(value: string): string {
  const parsed = new URL(value.trim().replace(/^["']|["']$/g, ''));
  return `${parsed.protocol}//${parsed.host}`;
}

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim().replace(
  /^["']|["']$/g,
  '',
);
const supabaseUrl = isUsableSupabaseUrl(rawSupabaseUrl)
  ? normalizeSupabaseUrl(rawSupabaseUrl)
  : undefined;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseAnonKey !== 'your-anon-key',
);
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
  if (!isSupabaseConfigured || !supabaseUrl || !supabaseAnonKey) return null;

  try {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: createAuthStorage(),
      },
    });
  } catch (error) {
    console.error('Supabase client init failed', error);
    return null;
  }
}

export const supabase = createSupabaseClient();

export function setRememberMe(remember: boolean) {
  localStorage.setItem(AUTH_REMEMBER_ME_KEY, remember ? 'true' : 'false');
}
