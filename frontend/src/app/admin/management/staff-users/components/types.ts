export interface StaffUser {
  id: number;
  email: string;
  fname: string;
  lname: string;
  role: string;
  /** ชื่อแสดงจาก app_microservice_staff_roles.name */
  role_name?: string | null;
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
