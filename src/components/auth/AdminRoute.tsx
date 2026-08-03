import { Navigate, Outlet } from 'react-router-dom';
import { APP_ROUTES, AUTH_ROUTES } from '../../constants';
import { useAuth } from '../../hooks';

export function AdminRoute() {
  const { loading, session, canAccessAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-[var(--color-fg-muted)]">
        권한 확인 중...
      </div>
    );
  }

  if (!session) {
    return <Navigate to={AUTH_ROUTES.login} replace />;
  }

  if (!canAccessAdmin) {
    return <Navigate to={APP_ROUTES.home} replace />;
  }

  return <Outlet />;
}
