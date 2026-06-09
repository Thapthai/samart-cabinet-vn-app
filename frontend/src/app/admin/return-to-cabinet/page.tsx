'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { medicalSuppliesApi, vendingReportsApi } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import { RotateCcw } from 'lucide-react';
import FilterSection from './components/FilterSection';
import ReturnedTable from './components/ReturnedTable';
import { buildReturnedGroups } from '@/lib/returnToCabinet/buildReturnedGroups';
import type { DispensedItem, FilterState } from './types';

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const GROUPS_PER_PAGE = 10;
const FETCH_BATCH_LIMIT = 5000;

export default function ReturnToCabinetPage() {
  const { user } = useAuth();
  const [loadingList, setLoadingList] = useState(true);
  const [returnedList, setReturnedList] = useState<DispensedItem[]>([]);

  const initialFilters: FilterState = {
    searchItemCode: '',
    startDate: getTodayDate(),
    endDate: getTodayDate(),
    itemTypeFilter: 'all',
    departmentId: '',
    subDepartmentId: '',
    cabinetId: '',
  };

  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(initialFilters);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalRawItems, setTotalRawItems] = useState(0);

  const allGroups = useMemo(() => buildReturnedGroups(returnedList), [returnedList]);
  const totalGroups = allGroups.length;
  const totalPages = useMemo(
    () => (totalGroups > 0 ? Math.ceil(totalGroups / GROUPS_PER_PAGE) : 1),
    [totalGroups],
  );

  const fetchReturnedList = useCallback(
    async (
      overrideFilters?: FilterState,
      opts?: { resetPage?: boolean; silent?: boolean },
    ) => {
      const activeFilters = overrideFilters ?? appliedFilters;
      try {
        setLoadingList(true);
        const params: Record<string, string | number> = {
          page: 1,
          limit: FETCH_BATCH_LIMIT,
        };
        if (activeFilters.startDate) params.startDate = activeFilters.startDate;
        if (activeFilters.endDate) params.endDate = activeFilters.endDate;
        if (activeFilters.searchItemCode) params.keyword = activeFilters.searchItemCode;
        if (activeFilters.itemTypeFilter && activeFilters.itemTypeFilter !== 'all') {
          params.itemTypeId = parseInt(activeFilters.itemTypeFilter, 10);
        }
        if (activeFilters.departmentId) params.departmentId = activeFilters.departmentId;
        if (activeFilters.subDepartmentId) params.subDepartmentId = activeFilters.subDepartmentId;
        if (activeFilters.cabinetId) params.cabinetId = activeFilters.cabinetId;

        const aggregated: DispensedItem[] = [];
        let reportedTotal = 0;
        let page = 1;

        while (true) {
          const response = (await medicalSuppliesApi.getReturnedItems({
            ...params,
            page,
            limit: FETCH_BATCH_LIMIT,
          })) as {
            success?: boolean;
            data?: DispensedItem[] | { data?: DispensedItem[] };
            total?: number;
            message?: string;
            error?: string;
          };

          const ok = response?.success === true || Array.isArray(response?.data);
          if (!ok) {
            toast.error(response?.error || response?.message || 'ไม่สามารถโหลดข้อมูลได้');
            setReturnedList([]);
            setTotalRawItems(0);
            break;
          }

          const raw = response.data;
          const returnedData = Array.isArray(raw)
            ? raw
            : raw != null && typeof raw === 'object' && Array.isArray(raw.data)
              ? raw.data
              : [];

          reportedTotal =
            typeof response.total === 'number' ? response.total : aggregated.length + returnedData.length;
          aggregated.push(...returnedData);

          if (returnedData.length < FETCH_BATCH_LIMIT || aggregated.length >= reportedTotal) {
            break;
          }
          page += 1;
          if (page > 500) {
            console.warn('admin return-to-cabinet: stopped batch fetch after 500 pages');
            break;
          }
        }

        if (aggregated.length > 0 || reportedTotal === 0) {
          setReturnedList(aggregated);
          setTotalRawItems(reportedTotal);
          if (opts?.resetPage !== false) {
            setCurrentPage(1);
          }

          if (!opts?.silent) {
            if (aggregated.length === 0) {
              toast.info('ไม่พบข้อมูลการคืนอุปกรณ์เข้าตู้ กรุณาตรวจสอบว่ามีข้อมูลในระบบ');
            } else {
              toast.success(`พบ ${reportedTotal} รายการคืนอุปกรณ์เข้าตู้`);
            }
          }
        }
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } }; message?: string };
        toast.error(
          err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
        );
      } finally {
        setLoadingList(false);
      }
    },
    [appliedFilters],
  );

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, Math.max(1, totalPages)));
  }, [totalPages]);

  const initialFetchDone = useRef(false);
  useEffect(() => {
    if (!user?.id || initialFetchDone.current) return;
    initialFetchDone.current = true;
    void fetchReturnedList(undefined, { resetPage: true, silent: true });
  }, [user?.id, fetchReturnedList]);

  const handleSearch = () => {
    setAppliedFilters(filters);
    setCurrentPage(1);
    void fetchReturnedList(filters, { resetPage: true });
  };

  const handleClearSearch = () => {
    const resetFilters: FilterState = {
      ...initialFilters,
      startDate: getTodayDate(),
      endDate: getTodayDate(),
    };
    setFilters(resetFilters);
    setAppliedFilters(resetFilters);
    setCurrentPage(1);
    void fetchReturnedList(resetFilters, { resetPage: true, silent: true });
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleExportReport = async (format: 'excel' | 'pdf') => {
    try {
      const params: Record<string, string | number | undefined> = {};
      if (appliedFilters.searchItemCode) params.keyword = appliedFilters.searchItemCode;
      if (appliedFilters.itemTypeFilter && appliedFilters.itemTypeFilter !== 'all') {
        params.itemTypeId = parseInt(appliedFilters.itemTypeFilter, 10);
      }
      if (appliedFilters.startDate) params.startDate = appliedFilters.startDate;
      if (appliedFilters.endDate) params.endDate = appliedFilters.endDate;
      if (appliedFilters.departmentId) params.departmentId = appliedFilters.departmentId;
      if (appliedFilters.subDepartmentId) params.subDepartmentId = appliedFilters.subDepartmentId;
      if (appliedFilters.cabinetId) params.cabinetId = appliedFilters.cabinetId;

      toast.info(`กำลังสร้างรายงาน ${format.toUpperCase()}...`);

      if (format === 'excel') {
        await vendingReportsApi.downloadReturnToCabinetReportExcel(params);
      } else {
        await vendingReportsApi.downloadReturnToCabinetReportPdf(params);
      }

      toast.success(`กำลังดาวน์โหลดรายงาน ${format.toUpperCase()}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
      toast.error(`ไม่สามารถสร้างรายงาน ${format.toUpperCase()} ได้: ${msg}`);
    }
  };

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const getItemTypes = () => {
    const types = new Map<string, string>();
    returnedList.forEach((item) => {
      if (item.itemtypeID && item.itemType) {
        types.set(String(item.itemtypeID), item.itemType);
      }
    });
    return Array.from(types.entries()).map(([id, name]) => ({ id, name }));
  };

  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <RotateCcw className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">รายงานเติมอุปกรณ์เข้าตู้</h1>
              <p className="text-sm text-gray-500 mt-1">
                รายการอุปกรณ์ทั้งหมดที่เติมเข้าตู้ SmartCabinet
              </p>
            </div>
          </div>

          <FilterSection
            filters={filters}
            appliedFilters={appliedFilters}
            onFilterChange={handleFilterChange}
            onSearch={handleSearch}
            onClear={handleClearSearch}
            onRefresh={() => fetchReturnedList(undefined, { resetPage: false, silent: true })}
            itemTypes={getItemTypes()}
            loading={loadingList}
          />

          <ReturnedTable
            loading={loadingList}
            items={returnedList}
            currentPage={currentPage}
            totalPages={totalPages}
            totalRawItems={totalRawItems}
            totalGroups={totalGroups}
            groupsPerPage={GROUPS_PER_PAGE}
            searchItemCode={appliedFilters.searchItemCode}
            itemTypeFilter={appliedFilters.itemTypeFilter}
            onPageChange={handlePageChange}
            onExportExcel={() => handleExportReport('excel')}
            onExportPdf={() => handleExportReport('pdf')}
          />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
