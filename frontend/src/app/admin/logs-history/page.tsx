'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { medicalSuppliesApi } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import { LogsPageHeader } from './components/LogsPageHeader';
import { LogsFiltersCard } from './components/LogsFiltersCard';
import { LogsGroupsList } from './components/LogsGroupsList';
import { LogDetailDialog } from './components/LogDetailDialog';
import { getTodayDate } from './utils';
import type { LogFilterState, LogGroupRow, SelectedLog } from './types';

export default function LogsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<LogGroupRow[]>([]);
  const [totalGroups, setTotalGroups] = useState(0);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;

  const [formFilters, setFormFilters] = useState<LogFilterState>({
    patient_hn: '',
    en: '',
    log_status: '',
    startDate: getTodayDate(),
    endDate: getTodayDate(),
  });
  const [activeFilters, setActiveFilters] = useState<LogFilterState>({
    patient_hn: '',
    en: '',
    log_status: '',
    startDate: getTodayDate(),
    endDate: getTodayDate(),
  });
  const [selectedLog, setSelectedLog] = useState<SelectedLog | null>(null);

  const fetchLogs = async (customFilters?: LogFilterState, page?: number) => {
    try {
      setLoading(true);
      const f = customFilters ?? activeFilters;
      const params: Record<string, string | number> = { page: page ?? currentPage, limit };
      if (f.startDate) params.startDate = f.startDate;
      if (f.endDate) params.endDate = f.endDate;
      if (f.patient_hn?.trim()) params.patient_hn = f.patient_hn.trim();
      if (f.en?.trim()) params.en = f.en.trim();
      if (f.log_status?.trim()) params.log_status = f.log_status.trim();

      const res = await medicalSuppliesApi.getLogs(params);
      setGroups(Array.isArray(res?.groups) ? res.groups : []);
      setTotalGroups(res?.total_groups ?? 0);
      setTotalPages(res?.totalPages ?? 1);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      toast.error('โหลด log ไม่ได้');
      setGroups([]);
      setTotalGroups(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchLogs(activeFilters, currentPage);
    }
  }, [user?.id, activeFilters, currentPage]);

  const handleSearch = () => {
    setActiveFilters(formFilters);
    setCurrentPage(1);
  };

  const handleReset = () => {
    const reset: LogFilterState = {
      patient_hn: '',
      en: '',
      log_status: '',
      startDate: getTodayDate(),
      endDate: getTodayDate(),
    };
    setFormFilters(reset);
    setActiveFilters(reset);
    setCurrentPage(1);
  };

  const toggleGroup = (key: string) => {
    setExpandedKeys((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  };

  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-full">
          <LogsPageHeader />

          <LogsFiltersCard
            formFilters={formFilters}
            setFormFilters={setFormFilters}
            onSearch={handleSearch}
            onReset={handleReset}
          />

          <LogsGroupsList
            loading={loading}
            groups={groups}
            totalGroups={totalGroups}
            totalPages={totalPages}
            currentPage={currentPage}
            limit={limit}
            expandedKeys={expandedKeys}
            onToggleGroup={toggleGroup}
            onSelectLog={setSelectedLog}
            onPageChange={setCurrentPage}
          />

          <LogDetailDialog selectedLog={selectedLog} onClose={() => setSelectedLog(null)} />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
