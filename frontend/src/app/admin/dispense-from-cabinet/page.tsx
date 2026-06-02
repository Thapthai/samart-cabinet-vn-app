'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { medicalSuppliesApi } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import { Package } from 'lucide-react';
import FilterSection from './components/FilterSection';
import DispensedTable from './components/DispensedTable';
import type { DispensedItem, FilterState } from './types';

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const ITEMS_PER_PAGE = 10;

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
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchDispensedList = useCallback(
    async (
      page: number = 1,
      customFilters?: FilterState,
      opts?: { silent?: boolean },
    ) => {
      const activeFilters = customFilters ?? filters;
      try {
        setLoadingList(true);
        const params: Record<string, string | number> = {
          page,
          limit: ITEMS_PER_PAGE,
        };
        if (activeFilters.startDate) params.startDate = activeFilters.startDate;
        if (activeFilters.endDate) params.endDate = activeFilters.endDate;
        if (activeFilters.searchItemCode) params.keyword = activeFilters.searchItemCode;
        if (activeFilters.departmentId) params.departmentId = activeFilters.departmentId;
        if (activeFilters.subDepartmentId) params.subDepartmentId = activeFilters.subDepartmentId;
        if (activeFilters.cabinetId) params.cabinetId = activeFilters.cabinetId;

        const response = (await medicalSuppliesApi.getDispensedItems(params)) as {
          success?: boolean;
          data?: DispensedItem[];
          total?: number;
          page?: number;
          limit?: number;
          totalPages?: number;
          message?: string;
          error?: string;
        };

        if (response?.success && Array.isArray(response.data)) {
          const dispensedData = response.data;
          const total =
            typeof response.total === 'number' ? response.total : dispensedData.length;
          const limit =
            typeof response.limit === 'number' ? response.limit : ITEMS_PER_PAGE;
          const totalPagesNum =
            typeof response.totalPages === 'number'
              ? response.totalPages
              : Math.max(1, Math.ceil(total / limit));

          setDispensedList(dispensedData);
          setTotalItems(total);
          setTotalPages(totalPagesNum);
          setCurrentPage(response.page ?? page);

          if (!opts?.silent) {
            if (dispensedData.length === 0) {
              toast.info('ไม่พบข้อมูลการเบิกอุปกรณ์ กรุณาตรวจสอบว่ามีข้อมูลในระบบ');
            } else {
              toast.success(`พบ ${total} รายการเบิกอุปกรณ์`);
            }
          }
        } else {
          toast.error(response?.error || response?.message || 'ไม่สามารถโหลดข้อมูลได้');
          setDispensedList([]);
          setTotalItems(0);
          setTotalPages(1);
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
    [filters],
  );

  const initialFetchDone = useRef(false);
  useEffect(() => {
    if (!user?.id || initialFetchDone.current) return;
    initialFetchDone.current = true;
    void fetchDispensedList(1, undefined, { silent: true });
  }, [user?.id, fetchDispensedList]);

  const handleSearch = () => {
    setCurrentPage(1);
    void fetchDispensedList(1);
  };

  const handleClearSearch = () => {
    const clearedFilters: FilterState = {
      searchItemCode: '',
      startDate: getTodayDate(),
      endDate: getTodayDate(),
      itemTypeFilter: 'all',
      departmentId: '',
      subDepartmentId: '',
      cabinetId: '',
    };
    setFilters(clearedFilters);
    setCurrentPage(1);
    void fetchDispensedList(1, clearedFilters, { silent: true });
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
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
      toast.error(`ไม่สามารถสร้างรายงาน ${format.toUpperCase()} ได้: ${msg}`);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    void fetchDispensedList(newPage, undefined, { silent: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

          <FilterSection
            filters={filters}
            onFilterChange={handleFilterChange}
            onSearch={handleSearch}
            onClear={handleClearSearch}
            onRefresh={() => fetchDispensedList(currentPage, undefined, { silent: true })}
            loading={loadingList}
          />

          <DispensedTable
            loading={loadingList}
            items={dispensedList}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
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
