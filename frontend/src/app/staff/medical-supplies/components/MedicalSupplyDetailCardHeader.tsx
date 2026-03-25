'use client';

import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface MedicalSupplyDetailCardHeaderProps {
  patientHn: string;
  assessionNos: string[];
}

export function MedicalSupplyDetailCardHeader({ patientHn, assessionNos }: MedicalSupplyDetailCardHeaderProps) {
  return (
    <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
      <CardTitle className="text-base sm:text-lg truncate">รายละเอียดการเบิกอุปกรณ์</CardTitle>
      <CardDescription className="text-xs sm:text-sm break-words">
        HN: {patientHn} | Assession No: {assessionNos.length > 0 ? assessionNos.join(', ') : '-'}
      </CardDescription>
    </CardHeader>
  );
}
