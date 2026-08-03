import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { DEMO_AUTH_KEY } from '../../constants';
import { isDemoAllowed, isSupabaseConfigured } from '../../lib/supabase';
import {
  fetchProfile,
  getSession,
  onAuthStateChange,
  requestPasswordReset,
  signInWithPassword,
  signOut as authSignOut,
  signUp,
  updatePassword,
} from '../../services/auth';
import type { Profile, UserRole } from '../../types';

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isDemo: boolean;
  profileError: string | null;
  signIn: (email: string, password: string, rememberMe: boolean) => Promise<string | null>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<string | null>;
  signOut: () => Promise<string | null>;
  resetPassword: (email: string) => Promise<string | null>;
  changePassword: (password: string) => Promise<string | null>;
  enterDemo: (role?: UserRole) => void;
  reloadProfile: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
  isDeveloper: boolean;
  isAdmin: boolean;
  isDepartmentHead: boolean;
  isUser: boolean;
  canAccessAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function createDemoProfile(role: UserRole = 'admin'): Profile {
  const now = new Date().toISOString();
  return {
    id: 'demo-user-id',
    email: 'demo@church.local',
    full_name: '미리보기 관리자',
    phone: '010-0000-0000',
    department_id: null,
    role,
    is_active: true,
    created_at: now,
    updated_at: now,
  };
}

function createDemoUser(profile: Profile): User {
  return {
    id: profile.id,
    email: profile.email,
    app_metadata: {},
    user_metadata: { full_name: profile.full_name },
    aud: 'authenticated',
    created_at: profile.created_at,
  } as User;
}

function createDemoSession(profile: Profile): Session {
  return {
    access_token: 'demo-access-token',
    refresh_token: 'demo-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: createDemoUser(profile),
  } as Session;
}

function readDemoSession(): { session: Session; profile: Profile } | null {
  if (!isDemoAllowed) return null;
  try {
    const raw = localStorage.getItem(DEMO_AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { role?: UserRole };
    const profile = createDemoProfile(parsed.role ?? 'admin');
    return { session: createDemoSession(profile), profile };
  } catch {
    return null;
  }
}

async function loadProfile(user: User | null) {
  if (!user) return { profile: null, error: null as string | null };
  const { data, error } = await fetchProfile(user.id);
  if (error) {
    return { profile: null, error: error.message };
  }
  return { profile: data, error: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!isSupabaseConfigured) {
        const demo = readDemoSession();
        if (!mounted) return;
        if (demo) {
          setSession(demo.session);
          setUser(demo.session.user);
          setProfile(demo.profile);
          setIsDemo(true);
        }
        setLoading(false);
        return;
      }

      localStorage.removeItem(DEMO_AUTH_KEY);

      const { data } = await getSession();
      if (!mounted) return;

      const currentSession = data.session;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        const result = await loadProfile(currentSession.user);
        if (!mounted) return;
        if (result.profile && result.profile.is_active === false) {
          await authSignOut();
          setSession(null);
          setUser(null);
          setProfile(null);
          setProfileError('비활성화된 계정입니다. 관리자에게 문의하세요.');
        } else {
          setProfile(result.profile);
          setProfileError(result.error);
        }
      }

      setIsDemo(false);
      setLoading(false);
    };

    void init();

    if (!isSupabaseConfigured) {
      return () => {
        mounted = false;
      };
    }

    const { data } = onAuthStateChange((_event, nextSession) => {
      void (async () => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setIsDemo(false);

        if (!nextSession?.user) {
          setProfile(null);
          setLoading(false);
          return;
        }

        const result = await loadProfile(nextSession.user);
        if (result.profile && result.profile.is_active === false) {
          await authSignOut();
          setSession(null);
          setUser(null);
          setProfile(null);
          setProfileError('비활성화된 계정입니다. 관리자에게 문의하세요.');
        } else {
          setProfile(result.profile);
          setProfileError(result.error);
        }
        setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const enterDemo = useCallback((role: UserRole = 'admin') => {
    if (!isDemoAllowed) return;
    const nextProfile = createDemoProfile(role);
    const nextSession = createDemoSession(nextProfile);
    localStorage.setItem(DEMO_AUTH_KEY, JSON.stringify({ role }));
    setSession(nextSession);
    setUser(nextSession.user);
    setProfile(nextProfile);
    setIsDemo(true);
    setProfileError(null);
  }, []);

  const reloadProfile = useCallback(async () => {
    if (!user) return;
    const result = await loadProfile(user);
    setProfile(result.profile);
    setProfileError(result.error);
  }, [user]);

  const signIn = useCallback(
    async (email: string, password: string, rememberMe: boolean) => {
      if (!isSupabaseConfigured) {
        return 'Supabase 환경 변수가 설정되지 않았습니다.';
      }
      const { error } = await signInWithPassword(email, password, rememberMe);
      return error?.message ?? null;
    },
    [],
  );

  const signUpHandler = useCallback(
    async (email: string, password: string, fullName: string) => {
      if (!isSupabaseConfigured) {
        return 'Supabase 환경 변수가 설정되지 않았습니다.';
      }
      const { error } = await signUp(email, password, fullName);
      return error?.message ?? null;
    },
    [],
  );

  const signOut = useCallback(async () => {
    localStorage.removeItem(DEMO_AUTH_KEY);

    if (!isSupabaseConfigured || isDemo) {
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsDemo(false);
      setProfileError(null);
      return null;
    }

    const { error } = await authSignOut();
    if (!error) {
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsDemo(false);
      setProfileError(null);
    }
    return error?.message ?? null;
  }, [isDemo]);

  const resetPassword = useCallback(async (email: string) => {
    if (!isSupabaseConfigured) {
      return 'Supabase 환경 변수가 설정되지 않았습니다.';
    }
    const { error } = await requestPasswordReset(email);
    return error?.message ?? null;
  }, []);

  const changePassword = useCallback(async (password: string) => {
    if (!isSupabaseConfigured) {
      return 'Supabase 환경 변수가 설정되지 않았습니다.';
    }
    const { error } = await updatePassword(password);
    return error?.message ?? null;
  }, []);

  const hasRole = useCallback(
    (...roles: UserRole[]) => {
      if (!profile) return false;
      return roles.includes(profile.role);
    },
    [profile],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      session,
      loading,
      isDemo,
      profileError,
      signIn,
      signUp: signUpHandler,
      signOut,
      resetPassword,
      changePassword,
      enterDemo,
      reloadProfile,
      hasRole,
      isDeveloper: profile?.role === 'developer',
      isAdmin: profile?.role === 'admin',
      isDepartmentHead: profile?.role === 'department_head',
      isUser: profile?.role === 'user',
      canAccessAdmin:
        profile?.role === 'admin' || profile?.role === 'developer',
    }),
    [
      user,
      profile,
      session,
      loading,
      isDemo,
      profileError,
      signIn,
      signUpHandler,
      signOut,
      resetPassword,
      changePassword,
      enterDemo,
      reloadProfile,
      hasRole,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
