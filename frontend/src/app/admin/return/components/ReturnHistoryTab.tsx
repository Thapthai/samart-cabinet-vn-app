'use client';

import ReturnHistoryFilter from './ReturnHistoryFilter';
import ReturnHistoryTable from './ReturnHistoryTable';
import type { ReturnHistoryData } from '../types';
import type {
  DepartmentOption,
  SubDepartmentOption,
} from '@/app/admin/medical-supplies/components/MedicalSuppliesSearchFilters';

interface ReturnHistoryTabProps {
  dateFrom: string;
  dateTo: string;
  reason: string;
  departmentCode: string;
  subDepartmentId: string;
  cabinetId: string;
  itemKeyword: string;
  departments: DepartmentOption[];
  subDepartments: SubDepartmentOption[];
  cabinets: Array<{ id: number; cabinet_name?: string; cabinet_code?: string }>;
  data: ReturnHistoryData | null;
  currentPage: number;
  limit: number;
  loading: boolean;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onReasonChange: (reason: string) => void;
  onDepartmentChange: (code: string) => void;
  onSubDepartmentChange: (id: string) => void;
  onCabinetChange: (id: string) => void;
  onItemKeywordChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onSearch: () => void;
  onReset: () => void;
  onRefresh?: () => void;
  formatDate: (dateString: string) => string;
  getReturnReasonLabel: (reason: string) => string;
}

export default function ReturnHistoryTab({
  dateFrom,
  dateTo,
  reason,
  departmentCode,
  subDepartmentId,
  cabinetId,
  itemKeyword,
  departments,
  subDepartments,
  cabinets,
  data,
  currentPage,
  limit,
  loading,
  onDateFromChange,
  onDateToChange,
  onReasonChange,
  onDepartmentChange,
  onSubDepartmentChange,
  onCabinetChange,
  onItemKeywordChange,
  onPageChange,
  onSearch,
  onReset,
  onRefresh,
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
        subDepartmentId={subDepartmentId}
        cabinetId={cabinetId}
        itemKeyword={itemKeyword}
        departments={departments}
        subDepartments={subDepartments}
        cabinets={cabinets}
        loading={loading}
        onDateFromChange={onDateFromChange}
        onDateToChange={onDateToChange}
        onReasonChange={onReasonChange}
        onDepartmentChange={onDepartmentChange}
        onSubDepartmentChange={onSubDepartmentChange}
        onCabinetChange={onCabinetChange}
        onItemKeywordChange={onItemKeywordChange}
        onSearch={onSearch}
        onReset={onReset}
        onRefresh={onRefresh}
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
