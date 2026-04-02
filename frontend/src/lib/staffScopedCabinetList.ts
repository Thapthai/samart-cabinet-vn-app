import { staffCabinetApi, staffCabinetDepartmentApi } from '@/lib/staffApi/cabinetApi';

export type StaffCabinetListItem = {
  id: number;
  cabinet_name?: string;
  cabinet_code?: string;
  cabinet_status?: string;
};

/**
 * รายการตู้ที่ Staff เลือกได้: ไม่จำกัดแผนก → จาก /cabinets;
 * จำกัดแผนก → ยูเนียนตู้จาก mapping ตามแผนกที่อนุญาตเท่านั้น
 */
export async function getStaffScopedCabinetList(
  allowedDepartmentIds: number[] | null | undefined,
  opts?: { keyword?: string; limit?: number },
): Promise<StaffCabinetListItem[]> {
  const limit = opts?.limit ?? 50;
  const keyword = opts?.keyword;
  if (allowedDepartmentIds === undefined) return [];
  if (allowedDepartmentIds === null) {
    const response = await staffCabinetApi.getAll({ page: 1, limit, keyword });
    const list = response?.data ?? [];
    return list as StaffCabinetListItem[];
  }
  if (allowedDepartmentIds.length === 0) return [];

  const byId = new Map<number, StaffCabinetListItem>();
  await Promise.all(
    allowedDepartmentIds.map(async (departmentId) => {
      const response = await staffCabinetDepartmentApi.getAll({ departmentId, keyword });
      if (!response.success || !response.data) return;
      for (const row of response.data as { cabinet?: StaffCabinetListItem }[]) {
        const cab = row.cabinet;
        if (cab && typeof cab.id === 'number' && !byId.has(cab.id)) {
          byId.set(cab.id, cab);
        }
      }
    }),
  );
  return Array.from(byId.values());
}
