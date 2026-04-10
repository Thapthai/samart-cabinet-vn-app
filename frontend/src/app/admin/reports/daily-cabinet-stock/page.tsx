'use client';

import { useMemo } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { DailyCabinetStockArchivesPanel } from '@/components/reports/DailyCabinetStockArchivesPanel';
import { reportsApi } from '@/lib/api';

export default function AdminDailyCabinetStockArchivesPage() {
  const api = useMemo(
    () => ({
      listArchives: (p?: { limit?: number; offset?: number }) => reportsApi.listDailyCabinetStockArchives(p),
      downloadArchive: (id: number) => reportsApi.downloadDailyCabinetStockArchive(id),
      runArchive: (reportDate?: string) => reportsApi.runDailyCabinetStockArchive(reportDate),
    }),
    [],
  );

  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <DailyCabinetStockArchivesPanel api={api} />
      </AppLayout>
    </ProtectedRoute>
  );
}
