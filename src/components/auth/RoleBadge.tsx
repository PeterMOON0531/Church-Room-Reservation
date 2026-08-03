import type { UserRole } from '../../types';
import { USER_ROLE_LABEL } from '../../constants';
import { Badge } from '../common';

const toneMap: Record<UserRole, 'brand' | 'success' | 'neutral'> = {
  developer: 'brand',
  admin: 'brand',
  department_head: 'success',
  user: 'neutral',
};

type RoleBadgeProps = {
  role: UserRole;
};

export function RoleBadge({ role }: RoleBadgeProps) {
  return <Badge tone={toneMap[role]}>{USER_ROLE_LABEL[role]}</Badge>;
}
