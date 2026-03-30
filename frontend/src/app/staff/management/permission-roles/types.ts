export interface StaffPermissionRole {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  /** 1 = สูงสุด, 3 = ต่ำสุด */
  hierarchy_level: number;
}

export interface StaffRolePermissionRow {
  id: number;
  role_code?: string;
  role_id?: number;
  menu_href: string;
  can_access: boolean;
  created_at: string;
  updated_at: string;
  role?: {
    code: string;
    name: string;
    hierarchy_level?: number;
  };
}
