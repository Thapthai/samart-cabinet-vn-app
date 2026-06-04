'use client';

import { BadgeCheck } from 'lucide-react';
import type { EmployeeRow } from '@/lib/api';

export function EmployeeLinkedBadge({ row }: { row: EmployeeRow }) {
  const staff = row.linkedStaffUser;
  if (staff == null) {
    return (
      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
        ไม่ผูก
      </span>
    );
  }
  return (
    <div className="flex flex-col items-start gap-0.5">
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
        <BadgeCheck className="h-3 w-3 shrink-0" />
        ผูกแล้ว
      </span>
      {/* <span className="max-w-[200px] truncate text-xs text-slate-600" title={staff.email}>
        {staff.fullName || staff.email}
      </span> */}
    </div>
  );
}
