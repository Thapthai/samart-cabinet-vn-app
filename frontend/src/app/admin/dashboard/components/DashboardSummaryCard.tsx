"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link2, LayoutGrid, Building2 } from "lucide-react";

interface CabinetDepartment {
  id: number;
  cabinet_id: number;
  department_id: number;
  cabinet?: { cabinet_code?: string };
  department?: { DepName?: string };
}

interface DashboardSummaryCardProps {
  mappings: CabinetDepartment[];
  loading?: boolean;
}

export default function DashboardSummaryCard({ mappings, loading }: DashboardSummaryCardProps) {
  const uniqueCabinets = new Set(mappings.map((m) => m.cabinet_id)).size;
  const uniqueDepartments = new Set(mappings.map((m) => m.department_id)).size;

  return (
    <Card className="h-full min-h-0 flex flex-col overflow-hidden border-slate-200">
      <CardHeader className="pb-2 shrink-0">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Link2 className="h-4 w-4 text-blue-600" />
          สรุปการเชื่อมโยง
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col justify-center pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-slate-500 text-sm">
            โหลด...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Link2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">รายการเชื่อมโยง</p>
                <p className="text-xl font-bold text-slate-800">{mappings.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">ตู้ Cabinet</p>
                <p className="text-xl font-bold text-slate-800">{uniqueCabinets}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">แผนก</p>
                <p className="text-xl font-bold text-slate-800">{uniqueDepartments}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
