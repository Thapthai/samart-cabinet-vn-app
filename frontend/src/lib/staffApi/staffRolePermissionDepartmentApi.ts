import staffApi from './index';

export type StaffRolePermissionDepartmentsResponse = {
  success?: boolean;
  data?: {
    unrestricted?: boolean;
    departments?: Array<{ id: number; department_name?: string | null }>;
  };
  message?: string;
};

/** แผนกหลักที่ Staff Role อนุญาต — unrestricted = เห็นทุกแผนก */
export async function fetchStaffRolePermissionDepartments(
  roleId: number,
): Promise<StaffRolePermissionDepartmentsResponse> {
  const response = await staffApi.get<StaffRolePermissionDepartmentsResponse>(
    '/staff-role-permission-departments',
    { params: { role_id: roleId } },
  );
  return response.data;
}
