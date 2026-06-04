import type { Item } from '@/types/item';

/** IsCancel = 1 → ปิดการใช้งาน */
export function itemIsActive(item: { IsCancel?: number | null }): boolean {
  return item.IsCancel !== 1;
}

export function departmentIdToSelectValue(departmentId?: number | null): string {
  if (departmentId == null || departmentId === 0) return '0';
  return String(departmentId);
}

export function selectValueToDepartmentId(value: string): number {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n;
}

export function formatItemDepartmentLabel(
  departmentId?: number | null,
  deptMap?: Map<number, { DepName?: string | null; DepName2?: string | null }>,
): string {
  if (departmentId == null || departmentId === 0) return 'ทุกแผนก';
  const d = deptMap?.get(departmentId);
  if (!d) return `แผนก #${departmentId}`;
  return (d.DepName || d.DepName2 || `แผนก #${departmentId}`).trim();
}

export type DeptRow = { ID: number; DepName?: string | null; DepName2?: string | null };

export function buildDepartmentSelectOptions(
  departments: DeptRow[],
  includeAll = true,
): { value: string; label: string; subLabel?: string }[] {
  const opts = departments
    .slice()
    .sort((a, b) => (a.DepName || a.DepName2 || '').localeCompare(b.DepName || b.DepName2 || ''))
    .map((d) => ({
      value: String(d.ID),
      label: (d.DepName || d.DepName2 || `แผนก #${d.ID}`).trim(),
      subLabel: d.DepName2 && d.DepName ? d.DepName2 : undefined,
    }));
  if (includeAll) {
    return [{ value: '0', label: 'ทุกแผนก', subLabel: 'DepartmentID = 0' }, ...opts];
  }
  return opts;
}

export function departmentInitialDisplay(
  departmentId: number | undefined | null,
  departments: DeptRow[],
): { label: string; subLabel?: string } | undefined {
  if (departmentId == null || departmentId === 0) {
    return { label: 'ทุกแผนก', subLabel: 'DepartmentID = 0' };
  }
  const d = departments.find((x) => x.ID === departmentId);
  if (!d) return { label: `แผนก #${departmentId}`, subLabel: `ID ${departmentId}` };
  return {
    label: (d.DepName || d.DepName2 || `แผนก #${departmentId}`).trim(),
    subLabel: d.DepName2 && d.DepName ? d.DepName2 : `ID ${departmentId}`,
  };
}
