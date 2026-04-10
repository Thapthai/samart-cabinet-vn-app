'use client';

import { useMemo } from 'react';
import { DailyCabinetStockArchivesPanel } from '@/components/reports/DailyCabinetStockArchivesPanel';
import { staffReportApi } from '@/lib/staffApi/reportApi';

export default function StaffDailyCabinetStockArchivesPage() {
  const api = useMemo(
    () => ({
      listArchives: (p?: { limit?: number; offset?: number }) => staffReportApi.listDailyCabinetStockArchives(p),
      downloadArchive: (id: number) => staffReportApi.downloadDailyCabinetStockArchive(id),
      runArchive: (reportDate?: string) => staffReportApi.runDailyCabinetStockArchive(reportDate),
    }),
    [],
  );

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <DailyCabinetStockArchivesPanel api={api} />
    </div>
  );
}
