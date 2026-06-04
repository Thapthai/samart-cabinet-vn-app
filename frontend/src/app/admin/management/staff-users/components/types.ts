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
  /** IsUser: 1 = ใช้งาน, 0 = ปิด (สอดคล้อง is_active) */
  isUser?: number;
  created_at: string;
  updated_at: string;
}

export interface StaffRoleOption {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_active?: boolean;
}

/** บทบาทที่เปิดใช้งาน (is_active = true / 1) */
export function isStaffRoleActive(role: { is_active?: boolean | number }): boolean {
  const active = role.is_active;
  if (active === true || active === 1) return true;
  if (active === false || active === 0) return false;
  return true;
}

/** รายการบทบาทสำหรับ Select — เฉพาะที่เปิดใช้งาน (ปิดใช้งานเลือกไม่ได้) */
export function selectableStaffRoles(roles: StaffRoleOption[]): StaffRoleOption[] {
  return roles.filter(isStaffRoleActive);
}
