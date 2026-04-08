'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { medicalSuppliesApi } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import { Package } from 'lucide-react';
import FilterSection from './components/FilterSection';
import DispensedTable from './components/DispensedTable';
import type { DispensedItem, FilterState, SummaryData } from './types';
import { buildDispensedGroups } from '@/lib/dispenseFromCabinet/buildDispensedGroups';

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const GROUPS_PER_PAGE = 10;
const FETCH_BATCH_LIMIT = 5000;

export default function DispenseFromCabinetPage() {
  const { user } = useAuth();
  const [loadingList, setLoadingList] = useState(true);
  const [dispensedList, setDispensedList] = useState<DispensedItem[]>([]);

  const [filters, setFilters] = useState<FilterState>({
    searchItemCode: '',
    startDate: getTodayDate(),
    endDate: getTodayDate(),
    itemTypeFilter: 'all',
    departmentId: '',
    subDepartmentId: '',
    cabinetId: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [totalRawItems, setTotalRawItems] = useState(0);

  const allGroups = useMemo(() => buildDispensedGroups(dispensedList), [dispensedList]);
  const totalGroups = allGroups.length;
  const totalPages = useMemo(
    () => (totalGroups > 0 ? Math.ceil(totalGroups / GROUPS_PER_PAGE) : 1),
    [totalGroups],
  );

  const fetchDispensedList = async (
    customFilters?: FilterState,
    options?: { resetPage?: boolean },
  ) => {
    try {
      setLoadingList(true);
      const activeFilters = customFilters ?? filters;
      const params: Record<string, unknown> = {
        page: 1,
        limit: FETCH_BATCH_LIMIT,
      };
      if (activeFilters.startDate) params.startDate = activeFilters.startDate;
      if (activeFilters.endDate) params.endDate = activeFilters.endDate;
      if (activeFilters.searchItemCode) params.keyword = activeFilters.searchItemCode;
      if (activeFilters.departmentId) params.departmentId = activeFilters.departmentId;
      if (activeFilters.subDepartmentId) params.subDepartmentId = activeFilters.subDepartmentId;
      if (activeFilters.cabinetId) params.cabinetId = activeFilters.cabinetId;

      const aggregated: DispensedItem[] = [];
      let reportedTotal = 0;
      let page = 1;

      while (true) {
        const response = (await medicalSuppliesApi.getDispensedItems({
          ...params,
          page,
          limit: FETCH_BATCH_LIMIT,
        })) as any;

        if (!response?.success || !Array.isArray(response.data)) {
          toast.error((response as any)?.error || (response as any)?.message || 'ไม่สามารถโหลดข้อมูลได้');
          break;
        }

        const dispensedData = response.data;
        reportedTotal =
          typeof response.total === 'number' ? response.total : Number(response.total ?? aggregated.length);
        aggregated.push(...dispensedData);

        const batchLen = dispensedData.length;
        if (batchLen < FETCH_BATCH_LIMIT || aggregated.length >= reportedTotal) {
          break;
        }
        page += 1;
        if (page > 500) {
          console.warn('dispense-from-cabinet: stopped batch fetch after 500 pages');
          break;
        }
      }

      setDispensedList(aggregated);
      setTotalRawItems(reportedTotal);
      if (options?.resetPage !== false) {
        setCurrentPage(1);
      }

      if (aggregated.length === 0) {
        toast.info('ไม่พบข้อมูลการเบิกอุปกรณ์ กรุณาตรวจสอบว่ามีข้อมูลในระบบ');
      } else {
        toast.success(`พบ ${reportedTotal} รายการเบิกอุปกรณ์`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchDispensedList(undefined, { resetPage: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount + user id
  }, [user?.id]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, Math.max(1, totalPages)));
  }, [totalPages]);

  const handleSearch = () => {
    fetchDispensedList(undefined, { resetPage: true });
  };

  const handleClearSearch = () => {
    const clearedFilters: FilterState = {
      searchItemCode: '',
      startDate: getTodayDate(),
      endDate: getTodayDate(),
      itemTypeFilter: 'all',
      departmentId: '29',
      subDepartmentId: '',
      cabinetId: '1',
    };
    setFilters(clearedFilters);
    fetchDispensedList(clearedFilters, { resetPage: true });
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleExportReport = async (format: 'excel' | 'pdf') => {
    try {
      toast.info(`กำลังสร้างรายงาน ${format.toUpperCase()}...`);

      const params = {
        keyword: filters.searchItemCode || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        departmentId: filters.departmentId || undefined,
        subDepartmentId: filters.subDepartmentId || undefined,
        cabinetId: filters.cabinetId || undefined,
      };

      if (format === 'excel') {
        await medicalSuppliesApi.downloadDispensedItemsExcel(params);
      } else {
        await medicalSuppliesApi.downloadDispensedItemsPdf(params);
      }

      toast.success(`ดาวน์โหลดรายงาน ${format.toUpperCase()} สำเร็จ`);
    } catch (error: any) {
      toast.error(`ไม่สามารถสร้างรายงาน ${format.toUpperCase()} ได้: ${error.message}`);
    }
  };

  const calculateSummary = (): SummaryData => {
    const totalQty = dispensedList.reduce((sum, item) => sum + (item.qty || 0), 0);
    return {
      total: totalRawItems,
      totalQty,
    };
  };

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const getItemTypes = () => {
    const types = new Map();
    dispensedList.forEach((item) => {
      if (item.itemtypeID && item.itemType) {
        types.set(item.itemtypeID, item.itemType);
      }
    });
    return Array.from(types.entries()).map(([id, name]) => ({ id: id.toString(), name }));
  };

  const summary = calculateSummary();

  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">รายงานเบิกอุปกรณ์จากตู้</h1>
              <p className="text-sm text-gray-500 mt-1">
                รายการอุปกรณ์ทั้งหมดที่เบิกจากตู้ SmartCabinet
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">รายการทั้งหมด</p>
              <p className="text-2xl font-bold text-blue-900">{summary.total}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600 font-medium">จำนวนรวม</p>
              <p className="text-2xl font-bold text-green-900">{summary.totalQty}</p>
            </div>
          </div>

          <FilterSection
            filters={filters}
            onFilterChange={handleFilterChange}
            onSearch={handleSearch}
            onClear={handleClearSearch}
            onRefresh={() => fetchDispensedList(undefined, { resetPage: false })}
            loading={loadingList}
          />

          <DispensedTable
            loading={loadingList}
            items={dispensedList}
            currentPage={currentPage}
            totalPages={totalPages}
            totalRawItems={totalRawItems}
            totalGroups={totalGroups}
            groupsPerPage={GROUPS_PER_PAGE}
            searchItemCode={filters.searchItemCode}
            itemTypeFilter={filters.itemTypeFilter}
            onPageChange={handlePageChange}
            onExportExcel={() => handleExportReport('excel')}
            onExportPdf={() => handleExportReport('pdf')}
          />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
