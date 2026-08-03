export type Holiday = {
  id: string;
  holiday_date: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type HolidayInput = {
  holiday_date: string;
  name: string;
  description?: string;
};
