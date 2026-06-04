import type { EmployeeRow } from '@/lib/api';

/** IsUser: 1 = ใช้งาน, 0 = ปิดการใช้งาน */
export function isUserValueActive(isUser: number | boolean | null | undefined): boolean {
  if (isUser === 0 || isUser === false) return false;
  return true;
}

export function isUserToSelectValue(isUser: number | boolean | null | undefined): '1' | '0' {
  return isUserValueActive(isUser) ? '1' : '0';
}

export function employeeIsUserActive(row: EmployeeRow): boolean {
  return isUserValueActive(row.isUser);
}

export function EmployeeUserStatusBadge({ row }: { row: EmployeeRow }) {
  if (employeeIsUserActive(row)) {
    return (
      <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800">
        ใช้งาน
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
      ปิดการใช้งาน
    </span>
  );
}

export function StaffUserStatusBadge({ isUser }: { isUser: number | boolean }) {
  if (isUserValueActive(isUser)) {
    return (
      <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800">
        ใช้งาน
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
      ปิดการใช้งาน
    </span>
  );
}
