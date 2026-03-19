'use client';

import { formatUtcDateTime, formatPrintDateTime } from '@/lib/formatThaiDateTime';

interface MedicalSupplyDetailDateTimeSectionProps {
  createdAt: string | undefined;
  printDate: string | undefined;
  timePrintDate: string | undefined;
  updatedAt: string | undefined;
}

export function MedicalSupplyDetailDateTimeSection({
  createdAt,
  printDate,
  timePrintDate,
  updatedAt,
}: MedicalSupplyDetailDateTimeSectionProps) {
  return (
    <div className="pt-3 border-t border-gray-100">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">วันเวลา</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <div>
          <p className="text-sm text-gray-500">เวลาที่เบิก</p>
                <p className="font-semibold">{formatUtcDateTime(createdAt)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">วันที่และเวลาที่พิมพ์บิล</p>
          <p className="font-semibold">{formatPrintDateTime(printDate, timePrintDate)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">วันที่แก้ไขล่าสุด</p>
                <p className="font-semibold">{formatUtcDateTime(updatedAt)}</p>
        </div>
      </div>
    </div>
  );
}
