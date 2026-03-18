'use client';

import ReturnHistoryFilter from './ReturnHistoryFilter';
import ReturnHistoryTable from './ReturnHistoryTable';
import type { ReturnHistoryData } from '../types';

interface ReturnHistoryTabProps {
  dateFrom: string;
  dateTo: string;
  reason: string;
  departmentCode: string;
  departments: Array<{ ID: number; DepName: string }>;
  data: ReturnHistoryData | null;
  currentPage: number;
  limit: number;
  loading: boolean;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onReasonChange: (reason: string) => void;
  onDepartmentChange: (code: string) => void;
  onPageChange: (page: number) => void;
  onSearch: () => void;
  formatDate: (dateString: string) => string;
  getReturnReasonLabel: (reason: string) => string;
}

export default function ReturnHistoryTab({
  dateFrom,
  dateTo,
  reason,
  departmentCode,
  departments,
  data,
  currentPage,
  limit,
  loading,
  onDateFromChange,
  onDateToChange,
  onReasonChange,
  onDepartmentChange,
  onPageChange,
  onSearch,
  formatDate,
  getReturnReasonLabel,
}: ReturnHistoryTabProps) {
  return (
    <div className="space-y-4">
      <ReturnHistoryFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        reason={reason}
        departmentCode={departmentCode}
        departments={departments}
        loading={loading}
        onDateFromChange={onDateFromChange}
        onDateToChange={onDateToChange}
        onReasonChange={onReasonChange}
        onDepartmentChange={onDepartmentChange}
        onSearch={onSearch}
      />

      <ReturnHistoryTable
        data={data}
        currentPage={currentPage}
        limit={limit}
        dateFrom={dateFrom}
        dateTo={dateTo}
        reason={reason}
        formatDate={formatDate}
        getReturnReasonLabel={getReturnReasonLabel}
        onPageChange={onPageChange}
      />
    </div>
  );
}
