'use client';

import { Card, CardContent } from '@/components/ui/card';
import { deriveMedicalSupplyDetail, type MedicalSupplyDetailSummarySupply } from './medicalSupplyDetailDerived';
import { MedicalSupplyDetailCardHeader } from './MedicalSupplyDetailCardHeader';
import { MedicalSupplyDetailInfoGrid } from './MedicalSupplyDetailInfoGrid';
import { MedicalSupplyDetailDateTimeSection } from './MedicalSupplyDetailDateTimeSection';

export type { MedicalSupplyDetailSummarySupply } from './medicalSupplyDetailDerived';

interface MedicalSupplyDetailSummaryCardProps {
  supply: MedicalSupplyDetailSummarySupply;
}

export default function MedicalSupplyDetailSummaryCard({ supply }: MedicalSupplyDetailSummaryCardProps) {
  const v = deriveMedicalSupplyDetail(supply);

  return (
    <Card>
      <MedicalSupplyDetailCardHeader patientHn={v.patientHn} assessionNos={v.assessionNos} />
      <CardContent className="px-4 py-3 sm:px-6 sm:py-4">
        <div className="space-y-4 sm:space-y-5">
          <MedicalSupplyDetailInfoGrid
            firstName={v.firstName}
            lastName={v.lastName}
            recordedBy={v.recordedBy}
            department={v.department}
            subDepartmentName={v.subDepartmentName}
            suppliesCount={v.suppliesCount}
            billingStatus={v.billingStatus}
          />
          <MedicalSupplyDetailDateTimeSection
            createdAt={v.createdAt}
            printDate={v.printDate}
            timePrintDate={v.timePrintDate}
            updatedAt={v.updatedAt}
          />
        </div>
      </CardContent>
    </Card>
  );
}
