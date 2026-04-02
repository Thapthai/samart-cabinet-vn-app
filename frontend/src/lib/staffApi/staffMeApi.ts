import staffApi from './index';

/** แผนกจาก staff → role → app_staff_role_permission_departments → department */
export type StaffMeDepartmentsResponse = {
  success?: boolean;
  data?: {
    unrestricted?: boolean;
    staff_user_id?: number;
    role_id?: number;
    departments: Array<{
      ID: number;
      DepName?: string | null;
      DepName2?: string | null;
      RefDepID?: string | null;
    }>;
  };
  message?: string;
};

export async function fetchStaffMeDepartments(): Promise<StaffMeDepartmentsResponse> {
  const response = await staffApi.get<StaffMeDepartmentsResponse>('/staff/me/departments');
  return response.data;
}
