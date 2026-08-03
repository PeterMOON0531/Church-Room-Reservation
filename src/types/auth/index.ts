export type UserRole = 'developer' | 'admin' | 'department_head' | 'user';

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  department_id: string | null;
  role: UserRole;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
};

export type AuthUser = {
  id: string;
  email: string;
  profile: Profile | null;
};
