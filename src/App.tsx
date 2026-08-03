import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminRoute, GuestRoute, ProtectedRoute } from './components/auth';
import { LoadingBlock, TestBuildBanner } from './components/common';
import { APP_ROUTES, AUTH_ROUTES } from './constants';
import { AuthProvider } from './hooks';
import { MainLayout } from './layouts';
import {
  ForgotPasswordPage,
  LoginPage,
  ResetPasswordPage,
  SignupPage,
} from './pages/auth';
import { HomePage } from './pages/home';
import { ReservationsPage } from './pages/reservations';
import { RoomsPage } from './pages/rooms';

const CalendarPage = lazy(() =>
  import('./pages/calendar').then((module) => ({ default: module.CalendarPage })),
);
const AdminPage = lazy(() =>
  import('./pages/admin').then((module) => ({ default: module.AdminPage })),
);

function LazyPage({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingBlock label="페이지를 불러오는 중..." />}>
      {children}
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TestBuildBanner />
        <Routes>
          <Route path={AUTH_ROUTES.resetPassword} element={<ResetPasswordPage />} />

          <Route element={<GuestRoute />}>
            <Route path={AUTH_ROUTES.login} element={<LoginPage />} />
            <Route path={AUTH_ROUTES.signup} element={<SignupPage />} />
            <Route path={AUTH_ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path={APP_ROUTES.home} element={<HomePage />} />
              <Route path={APP_ROUTES.rooms} element={<RoomsPage />} />
              <Route path={APP_ROUTES.reservations} element={<ReservationsPage />} />
              <Route
                path={APP_ROUTES.calendar}
                element={
                  <LazyPage>
                    <CalendarPage />
                  </LazyPage>
                }
              />
              <Route element={<AdminRoute />}>
                <Route
                  path={APP_ROUTES.admin}
                  element={
                    <LazyPage>
                      <AdminPage />
                    </LazyPage>
                  }
                />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to={APP_ROUTES.home} replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
