export interface StaffUser {
  id: number;
  email: string;
  fname: string;
  lname: string;
  role: string;
  department_id?: number | null;
  department_name?: string | null;
  client_id: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffRoleOption {
  id: number;
  code: string;
  name: string;
  description: string | null;
}
