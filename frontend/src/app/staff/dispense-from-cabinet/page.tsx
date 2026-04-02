'use client';

import { useState } from 'react';
import { DispensedItemsApi } from '@/lib/staffApi/dispensedItemsApi';
import { toast } from 'sonner';
import { Package } from 'lucide-react';
import FilterSection from './components/FilterSection';
import DispensedTable from './components/DispensedTable';
import type { DispensedItem, FilterState, SummaryData } from './types';
// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function DispenseFromCabinetPage() {

  const [loadingList, setLoadingList] = useState(false);
  const [dispensedList, setDispensedList] = useState<DispensedItem[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    searchItemCode: '',
    startDate: getTodayDate(),
    endDate: getTodayDate(),
    itemTypeFilter: 'all',
    departmentId: '',
    cabinetId: '',
  });


  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchDispensedList = async (page: number = 1, customFilters?: FilterState) => {
    const activeFilters = customFilters || filters;
    if (!activeFilters.departmentId?.trim() || !activeFilters.cabinetId?.trim()) {
      setDispensedList([]);
      setTotalItems(0);
      setTotalPages(0);
      setLoadingList(false);
      return;
    }
    try {
      setLoadingList(true);
      const params: Record<string, string | number> = {
        page,
        limit: itemsPerPage,
      };
      if (activeFilters.startDate) params.startDate = activeFilters.startDate;
      if (activeFilters.endDate) params.endDate = activeFilters.endDate;
      if (activeFilters.searchItemCode) params.keyword = activeFilters.searchItemCode;
      if (activeFilters.departmentId) params.departmentId = activeFilters.departmentId;
      if (activeFilters.cabinetId) params.cabinetId = activeFilters.cabinetId;

      const response = await DispensedItemsApi.getDispensedItems(params);

      // ให้โครงสร้างเหมือนกับฝั่ง admin:
      // { success: boolean, data: [...], total, page, limit, totalPages, ... }
      if (response?.success && Array.isArray(response.data)) {
        const dispensedData = response.data;

        const total = typeof response.total === 'number' ? response.total : dispensedData.length;
        const limit = typeof response.limit === 'number' ? response.limit : itemsPerPage;
        const totalPagesNum =
          typeof response.totalPages === 'number' ? response.totalPages : Math.ceil(total / limit);

        setDispensedList(dispensedData);
        setTotalItems(total);
        setTotalPages(totalPagesNum);
        setCurrentPage(response.page || page);

        if (dispensedData.length === 0) {
          toast.info('ไม่พบข้อมูลการเบิกอุปกรณ์ กรุณาตรวจสอบว่ามีข้อมูลในระบบ');
        } else {
          toast.success(`พบ ${total} รายการเบิกอุปกรณ์`);
        }
      } else {
        toast.error(response?.message || 'ไม่สามารถโหลดข้อมูลได้');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoadingList(false);
    }
  };

  const handleSearch = () => {
    if (!filters.departmentId?.trim()) {
      toast.error('กรุณาเลือกแผนก');
      return;
    }
    if (!filters.cabinetId?.trim()) {
      toast.error('กรุณาเลือกตู้ Cabinet');
      return;
    }
    setCurrentPage(1);
    fetchDispensedList(1);
  };

  const handleClearSearch = () => {
    const clearedFilters: FilterState = {
      searchItemCode: '',
      startDate: getTodayDate(),
      endDate: getTodayDate(),
      itemTypeFilter: 'all',
      departmentId: '',
      cabinetId: '',
    };
    setFilters(clearedFilters);
    setCurrentPage(1);
    setDispensedList([]);
    setTotalItems(0);
    setTotalPages(0);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExportReport = async (format: 'excel' | 'pdf') => {
    if (!filters.departmentId?.trim()) {
      toast.error('กรุณาเลือกแผนกก่อนส่งออกรายงาน');
      return;
    }
    if (!filters.cabinetId?.trim()) {
      toast.error('กรุณาเลือกตู้ Cabinet ก่อนส่งออกรายงาน');
      return;
    }
    try {
      toast.info(`กำลังสร้างรายงาน ${format.toUpperCase()}...`);
      const params = {
        keyword: filters.searchItemCode || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        departmentId: filters.departmentId || undefined,
        cabinetId: filters.cabinetId,
      };
      if (format === 'excel') {
        await DispensedItemsApi.downloadDispensedItemsExcel(params);
      } else {
        await DispensedItemsApi.downloadDispensedItemsPdf(params);
      }
      toast.success(`ดาวน์โหลดรายงาน ${format.toUpperCase()} สำเร็จ`);
    } catch (error: any) {
      toast.error(`ไม่สามารถสร้างรายงาน ${format.toUpperCase()} ได้: ${error.message}`);
    }
  };

  const calculateSummary = (): SummaryData => {
    const totalQty = dispensedList.reduce((sum, item) => sum + (item.qty || 0), 0);
    return {
      total: totalItems,
      totalQty,
    };
  };

  const handlePageChange = (newPage: number) => {
    if (!filters.departmentId?.trim() || !filters.cabinetId?.trim()) return;
    setCurrentPage(newPage);
    fetchDispensedList(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getItemTypes = () => {
    const types = new Map();
    dispensedList.forEach(item => {
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
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Package className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              รายงานเบิกอุปกรณ์จากตู้
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              รายการอุปกรณ์ทั้งหมดที่เบิกจากตู้ SmartCabinet
            </p>
          </div>
        </div>

        {/* Summary Cards */}
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

        {/* Filter Section */}
        <FilterSection
          filters={filters}
          onFilterChange={handleFilterChange}
          onSearch={handleSearch}
          onClear={handleClearSearch}
          onRefresh={() => fetchDispensedList(currentPage)}
          loading={loadingList}
          departmentDisabled={false}
        />

        {/* Dispensed Items Table */}
        <DispensedTable
          loading={loadingList}
          items={dispensedList}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
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
