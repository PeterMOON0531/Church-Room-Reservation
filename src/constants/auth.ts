import type { UserRole } from '../types';

export const AUTH_REMEMBER_ME_KEY = 'auth_remember_me';
export const DEMO_AUTH_KEY = 'demo_auth_session';

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  developer: '개발자',
  admin: '관리자',
  department_head: '부서장',
  user: '일반사용자',
};

/** Roles a developer may assign in the UI */
export const DEVELOPER_ASSIGNABLE_ROLES: UserRole[] = [
  'developer',
  'admin',
  'department_head',
  'user',
];

/** Roles a church admin may assign (not admin/developer) */
export const ADMIN_ASSIGNABLE_ROLES: UserRole[] = ['department_head', 'user'];

export const AUTH_ROUTES = {
  login: '/login',
  signup: '/signup',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  home: '/',
} as const;
