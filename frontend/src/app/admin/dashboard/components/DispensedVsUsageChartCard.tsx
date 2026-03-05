'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Link2 } from 'lucide-react';

export interface MappingSummary {
  total: number;
  cabinets: number;
  departments: number;
}

interface DispensedVsUsageChartCardProps {
  /** สรุปการเชื่อมโยง - แสดงเป็นการ์ดเล็กแบบอุปกรณ์ใกล้หมดอายุ */
  mappingSummary?: MappingSummary | null;
  loadingMappings?: boolean;
}

export default function DispensedVsUsageChartCard({
  mappingSummary,
  loadingMappings = false,
}: DispensedVsUsageChartCardProps) {
  const totalMappings = mappingSummary?.total ?? 0;
  const cabinets = mappingSummary?.cabinets ?? 0;
  const departments = mappingSummary?.departments ?? 0;

  return (
    <Card className="bg-gradient-to-br from-indigo-500 to-violet-600 border-0 text-white overflow-hidden shadow-lg shrink-0 relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <CardHeader className="relative flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-white/95">
          สรุปการเชื่อมโยง
        </CardTitle>
        {!loadingMappings && (
          <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm font-semibold">
            <Link2 className="h-4 w-4" />
            {totalMappings} รายการ
          </div>
        )}
      </CardHeader>
      <CardContent className="relative">
        {loadingMappings ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-white/80" />
          </div>
        ) : (
          <>
            <p className="text-xs text-white/90 mb-2">ตู้ Cabinet · แผนก</p>
            <div className="mt-2 flex gap-3 flex-wrap">
              <span className="rounded-lg bg-white/25 px-3 py-1.5 text-xs font-semibold">
                รายการ: <span className="text-base font-bold">{totalMappings}</span>
              </span>
              <span className="rounded-lg bg-white/25 px-3 py-1.5 text-xs font-semibold">
                ตู้: <span className="text-base font-bold">{cabinets}</span>
              </span>
              <span className="rounded-lg bg-white/25 px-3 py-1.5 text-xs font-semibold">
                แผนก: <span className="text-base font-bold">{departments}</span>
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
