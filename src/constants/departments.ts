import type { Department } from '../types';

export const DEFAULT_DEPARTMENTS: Array<
  Pick<Department, 'code' | 'name' | 'description'>
> = [
  { code: 'worship', name: '예배부', description: '예배 및 찬양 사역' },
  { code: 'education', name: '교육부', description: '교육·양육 사역' },
  { code: 'youth', name: '청년부', description: '청년 사역' },
  { code: 'children', name: '아동부', description: '유아·아동 사역' },
  { code: 'admin', name: '관리부', description: '행정·시설 관리' },
  { code: 'mission', name: '선교부', description: '선교·봉사 사역' },
];

export function createMockDepartments(): Department[] {
  return DEFAULT_DEPARTMENTS.map((dept) => ({
    id: `mock-dept-${dept.code}`,
    code: dept.code,
    name: dept.name,
    description: dept.description,
    is_active: true,
  }));
}

export const RESERVATION_STATUS_LABEL: Record<string, string> = {
  pending: '대기',
  approved: '승인',
  rejected: '거절',
  cancelled: '취소',
  completed: '완료',
};
