import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AUTH_ROUTES } from '../../constants';
import { useAuth } from '../../hooks';
import { getSafeRedirectPath } from '../../utils';

export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-[var(--color-fg-muted)]">
        세션 확인 중...
      </div>
    );
  }

  if (!session) {
    return <Navigate to={AUTH_ROUTES.login} replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function GuestRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const redirectTo = getSafeRedirectPath(
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname,
    AUTH_ROUTES.home,
  );

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-[var(--color-fg-muted)]">
        세션 확인 중...
      </div>
    );
  }

  if (session) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
