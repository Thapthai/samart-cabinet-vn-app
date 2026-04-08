'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { RotateCcw } from 'lucide-react';
import FilterSection from './components/FilterSection';
import ReturnedTable from './components/ReturnedTable';
import type { DispensedItem, FilterState, SummaryData } from './types';
import { returnedItemsApi } from '@/lib/staffApi/returnedItemsApi';
import { buildReturnedGroups } from '@/lib/returnToCabinet/buildReturnedGroups';
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
  const [loadingList, setLoadingList] = useState(false);
  const [returnedList, setReturnedList] = useState<DispensedItem[]>([]);
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

  const allGroups = useMemo(() => buildReturnedGroups(returnedList), [returnedList]);
  const totalGroups = allGroups.length;
  const totalPages = useMemo(
    () => (totalGroups > 0 ? Math.ceil(totalGroups / GROUPS_PER_PAGE) : 1),
    [totalGroups],
  );

  const fetchReturnedList = async (
    overrideFilters?: FilterState,
    options?: { resetPage?: boolean },
  ) => {
    const activeFilters = overrideFilters ?? filters;
    if (!activeFilters.departmentId?.trim() || !activeFilters.cabinetId?.trim()) {
      setReturnedList([]);
      setTotalRawItems(0);
      setLoadingList(false);
      return;
    }
    try {
      setLoadingList(true);
      const params: Record<string, unknown> = {
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
        const response = (await returnedItemsApi.getReturnedItems({
          ...params,
          page,
          limit: FETCH_BATCH_LIMIT,
        })) as any;

        if (!(response.success || response.data)) {
          toast.error(response.message || 'ไม่สามารถโหลดข้อมูลได้');
          break;
        }

        const returnedData = Array.isArray(response.data)
          ? response.data
          : (response.data?.data || response.data || []);

        reportedTotal = Number(response.total ?? reportedTotal ?? 0);
        aggregated.push(...returnedData);

        const batchLen = returnedData.length;
        if (batchLen < FETCH_BATCH_LIMIT || aggregated.length >= reportedTotal) {
          break;
        }
        page += 1;
        if (page > 500) {
          console.warn('staff return-to-cabinet: stopped batch fetch after 500 pages');
          break;
        }
      }

      setReturnedList(aggregated);
      setTotalRawItems(reportedTotal);
      if (options?.resetPage !== false) {
        setCurrentPage(1);
      }

      if (aggregated.length === 0) {
        toast.info('ไม่พบข้อมูลการคืนอุปกรณ์เข้าตู้ กรุณาตรวจสอบว่ามีข้อมูลในระบบ');
      } else {
        toast.success(`พบ ${reportedTotal} รายการคืนอุปกรณ์เข้าตู้`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, Math.max(1, totalPages)));
  }, [totalPages]);

  const handleSearch = () => {
    if (!filters.departmentId?.trim()) {
      toast.error('กรุณาเลือก Division');
      return;
    }
    if (!filters.cabinetId?.trim()) {
      toast.error('กรุณาเลือกตู้ Cabinet');
      return;
    }
    fetchReturnedList(undefined, { resetPage: true });
  };

  const handleClearSearch = () => {
    const resetFilters: FilterState = {
      searchItemCode: '',
      startDate: getTodayDate(),
      endDate: getTodayDate(),
      itemTypeFilter: 'all',
      departmentId: '',
      subDepartmentId: '',
      cabinetId: '',
    };
    setFilters(resetFilters);
    setReturnedList([]);
    setTotalRawItems(0);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleExportReport = async (format: 'excel' | 'pdf') => {
    if (!filters.departmentId?.trim()) {
      toast.error('กรุณาเลือก Division ก่อนส่งออกรายงาน');
      return;
    }
    if (!filters.cabinetId?.trim()) {
      toast.error('กรุณาเลือกตู้ Cabinet ก่อนส่งออกรายงาน');
      return;
    }
    try {
      const params: any = {};
      if (filters.searchItemCode) params.keyword = filters.searchItemCode;
      if (filters.itemTypeFilter && filters.itemTypeFilter !== 'all') {
        params.itemTypeId = parseInt(filters.itemTypeFilter, 10);
      }
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.departmentId) params.departmentId = filters.departmentId;
      if (filters.subDepartmentId) params.subDepartmentId = filters.subDepartmentId;
      params.cabinetId = filters.cabinetId;

      toast.info(`กำลังสร้างรายงาน ${format.toUpperCase()}...`);

      if (format === 'excel') {
        await returnedItemsApi.downloadReturnToCabinetReportExcel(params);
      } else {
        await returnedItemsApi.downloadReturnToCabinetReportPdf(params);
      }

      toast.success(`กำลังดาวน์โหลดรายงาน ${format.toUpperCase()}`);
    } catch (error: any) {
      toast.error(`ไม่สามารถสร้างรายงาน ${format.toUpperCase()} ได้: ${error.message}`);
    }
  };

  const calculateSummary = (): SummaryData => {
    const totalQty = returnedList.reduce((sum, item) => sum + (item.qty || 0), 0);
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
    returnedList.forEach((item) => {
      if (item.itemtypeID && item.itemType) {
        types.set(item.itemtypeID, item.itemType);
      }
    });
    return Array.from(types.entries()).map(([id, name]) => ({ id: id.toString(), name }));
  };

  const summary = calculateSummary();

  return (
    <>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600 font-medium">รายการทั้งหมด</p>
            <p className="text-2xl font-bold text-green-900">{summary.total}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">จำนวนรวม</p>
            <p className="text-2xl font-bold text-blue-900">{summary.totalQty}</p>
          </div>
        </div>

        <FilterSection
          filters={filters}
          onFilterChange={handleFilterChange}
          onSearch={handleSearch}
          onClear={handleClearSearch}
          onRefresh={() => fetchReturnedList(undefined, { resetPage: false })}
          itemTypes={getItemTypes()}
          loading={loadingList}
          departmentDisabled={false}
        />

        <ReturnedTable
          loading={loadingList}
          items={returnedList}
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
    </>
  );
}
