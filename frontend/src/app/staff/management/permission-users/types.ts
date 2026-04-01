export interface StaffUser {
  id: number;
  email: string;
  fname: string;
  lname: string;
  role: string;
  /** ชื่อแสดงจาก app_staff_roles.name */
  role_name?: string | null;
  client_id: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffRoleOption {
  code: string;
  name: string;
}

export interface CreateStaffUserFormData {
  email: string;
  fname: string;
  lname: string;
  role: string;
  password: string;
  expires_at: string;
  is_active: boolean;
}

export const emptyCreateStaffUserForm = (): CreateStaffUserFormData => ({
  email: '',
  fname: '',
  lname: '',
  role: '',
  password: 'password123',
  expires_at: '',
  is_active: true,
});
