export type Room = {
  id: string;
  code: string;
  name: string;
  location: string | null;
  capacity: number;
  department_id: string | null;
  description: string | null;
  amenities: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type UpdateRoomInput = {
  location?: string | null;
  capacity?: number;
  description?: string | null;
  amenities?: string[];
  is_active?: boolean;
};
