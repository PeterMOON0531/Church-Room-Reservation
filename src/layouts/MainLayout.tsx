import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button } from '../components';
import { RoleBadge } from '../components/auth';
import { APP_ROUTES, AUTH_ROUTES } from '../constants';
import { useAuth } from '../hooks';
import { cn } from '../utils';

const NAV_LINKS = [
  { label: '홈', to: APP_ROUTES.home },
  { label: '방 안내', to: APP_ROUTES.rooms },
  { label: '예약', to: APP_ROUTES.reservations },
  { label: '달력', to: APP_ROUTES.calendar },
] as const;

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, user, signOut, canAccessAdmin } = useAuth();
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!sidebarOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const toggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError(null);
    const message = await signOut();
    setLoggingOut(false);
    if (message) {
      setLogoutError(message);
      return;
    }
    navigate(AUTH_ROUTES.login, { replace: true });
  };

  const displayName = profile?.full_name ?? user?.email ?? '사용자';

  const links = [
    ...NAV_LINKS,
    ...(canAccessAdmin ? [{ label: '관리자', to: APP_ROUTES.admin }] : []),
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface)_82%,transparent)] backdrop-blur-xl">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 px-0 lg:hidden"
            aria-label="메뉴 열기"
            aria-expanded={sidebarOpen}
            aria-controls="app-sidebar"
            onClick={() => setSidebarOpen(true)}
          >
            <MenuIcon />
          </Button>

          <Link to={APP_ROUTES.home} className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-brand)] text-sm font-bold text-[var(--color-brand-fg)] shadow-[var(--shadow-xs)]">
              C
            </span>
            <span className="max-w-[14rem] truncate text-[0.85rem] font-semibold tracking-tight text-[var(--color-fg)] sm:max-w-none sm:text-base">
              대한예수교 장로회 평강교회 방 예약
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 sm:flex">
              <span className="max-w-[10rem] truncate text-sm font-medium text-[var(--color-fg)]">
                {displayName}
              </span>
              {profile ? <RoleBadge role={profile.role} /> : null}
            </div>
            <Button
              variant="ghost"
              size="sm"
              aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              <span className="hidden sm:inline">
                {theme === 'dark' ? '라이트' : '다크'}
              </span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
            >
              {loggingOut ? '로그아웃 중...' : '로그아웃'}
            </Button>
          </div>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {sidebarOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[2px] lg:hidden"
            aria-label="메뉴 닫기"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}

        <aside
          id="app-sidebar"
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-[17.5rem] flex-col border-r border-[var(--color-border)] bg-[var(--color-sidebar)] text-[var(--color-sidebar-fg)] shadow-[var(--shadow-md)] transition-transform duration-300 ease-[var(--ds-ease)] lg:static lg:z-0 lg:translate-x-0 lg:shadow-none',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          aria-label="왼쪽 메뉴"
        >
          <div className="flex h-16 items-center justify-between border-b border-[var(--color-border)] px-4 lg:hidden">
            <span className="text-sm font-semibold tracking-tight">메뉴</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 px-0"
              aria-label="메뉴 닫기"
              onClick={() => setSidebarOpen(false)}
            >
              <CloseIcon />
            </Button>
          </div>

          <div className="px-4 pt-6 pb-3">
            <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[var(--color-fg-subtle)] uppercase">
              메뉴
            </p>
            <p className="mt-1 text-base font-semibold tracking-tight text-[var(--color-sidebar-fg)]">
              바로가기
            </p>
          </div>

          <nav className="flex-1 space-y-1 px-3 pb-6">
            {links.map((link) => {
              const isActive = location.pathname === link.to;

              return (
                <Link
                  key={link.label}
                  to={link.to}
                  className={cn('ds-side-link', isActive && 'ds-side-link-active')}
                  onClick={() => setSidebarOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      isActive
                        ? 'bg-[var(--color-brand)]'
                        : 'bg-[var(--color-border-strong)]',
                    )}
                  />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="mx-3 mb-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3.5 py-3.5">
            <p className="text-xs leading-relaxed text-[var(--color-fg-muted)]">
              방 예약 현황을 확인하고 필요한 공간을 신청하세요.
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {logoutError ? (
            <div className="px-4 pt-4 sm:px-6 lg:px-8">
              <Alert tone="danger" title="로그아웃 실패">
                {logoutError}
              </Alert>
            </div>
          ) : null}
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </main>

          <footer className="border-t border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface)_70%,transparent)] px-4 py-5 sm:px-6 lg:px-8">
            <p className="text-sm text-[var(--color-fg-muted)]">
              © 교회 방 예약 시스템
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M19 13.5A7.5 7.5 0 1 1 10.5 5 6 6 0 0 0 19 13.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.1 5.1l1.6 1.6M17.3 17.3l1.6 1.6M17.3 6.7l1.6-1.6M5.1 18.9l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
