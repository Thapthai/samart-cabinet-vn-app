export interface StaffEmployeeOption {
  emp_code: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
}

export interface StaffUser {
  id: number;
  email: string;
  fname: string;
  lname: string;
  emp_code?: string | null;
  employee_display?: string | null;
  /** role code จาก backend (StaffRole.code) */
  role: string;
  role_id?: number | null;
  /** ชื่อแสดงจาก app_staff_roles.name */
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
