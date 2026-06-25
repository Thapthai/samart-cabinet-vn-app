import type { DeptRow, SubDepartmentRow } from './types';

export function buildRoleDivisionSummary(depts: DeptRow[]): string {
  const names = depts.map((d) => (d.DepName || d.DepName2 || `ID ${d.ID}`).trim()).filter(Boolean);
  if (names.length === 0) return '';
  if (names.length <= 5) return names.join(', ');
  return `${names.slice(0, 5).join(', ')} … (+${names.length - 5})`;
}

export function filterSubRowsInDepartmentScope(
  rows: SubDepartmentRow[],
  allowedDepartmentIds: Set<number>,
): SubDepartmentRow[] {
  if (allowedDepartmentIds.size === 0) return [];
  return rows.filter((r) => allowedDepartmentIds.has(r.department_id));
}
