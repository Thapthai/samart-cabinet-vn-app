'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Package } from 'lucide-react';
import {
  FilterSection,
  ComparisonTable,
  ItemInfoCard,
  SummaryCards,
  ComparisonDetailsCard,
  UsageItemsTable,
} from './components';
import type { ComparisonItem, UsageItem, FilterState, SummaryData } from './types';
import { itemComparisonApi } from '@/lib/staffApi/itemComparisonApi';
import { staffDepartmentApi } from '@/lib/staffApi/departmentApi';

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ItemComparisonPage() {
  
  const [loadingList, setLoadingList] = useState(true);
  const [selectedItemCode, setSelectedItemCode] = useState<string | null>(null);
  const [comparisonList, setComparisonList] = useState<ComparisonItem[]>([]);
  const [filteredList, setFilteredList] = useState<ComparisonItem[]>([]);
  const [departments, setDepartments] = useState<{ ID: number; DepName: string }[]>([]);

  // Filters - default to today's date
  const [filters, setFilters] = useState<FilterState>({
    searchItemCode: '',
    startDate: getTodayDate(),
    endDate: getTodayDate(),
    itemTypeFilter: 'all',
    departmentCode: '',
  });

  // Pagination for comparison list
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    const initialFilters: FilterState = {
      searchItemCode: '',
      startDate: getTodayDate(),
      endDate: getTodayDate(),
      itemTypeFilter: 'all',
      departmentCode: '',
    };
    fetchComparisonList(1, initialFilters);
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await staffDepartmentApi.getAll({ limit: 1000 });
      if (res.success && Array.isArray(res.data)) {
        setDepartments(res.data.map((d: any) => ({ ID: d.ID, DepName: d.DepName || d.DepName2 || String(d.ID) })));
      }
    } catch {
      // ไม่แสดง error ถ้าโหลดแผนกไม่ได้
    }
  };

  const fetchComparisonList = async (page: number = 1, customFilters?: FilterState) => {
    try {
      setLoadingList(true);
      const activeFilters = customFilters || filters;
      const params: any = {
        page,
        limit: itemsPerPage,
      };
      if (activeFilters.startDate) params.startDate = activeFilters.startDate;
      if (activeFilters.endDate) params.endDate = activeFilters.endDate;
      if (activeFilters.searchItemCode) params.keyword = activeFilters.searchItemCode;
      if (activeFilters.itemTypeFilter && activeFilters.itemTypeFilter !== 'all') {
        params.itemTypeId = parseInt(activeFilters.itemTypeFilter);
      }
      if (activeFilters.departmentCode) params.departmentCode = activeFilters.departmentCode;

      const response = await itemComparisonApi.compareDispensedVsUsage(params);

      if (response.success || response.data) {
        const responseData: any = response.data || response;

        // API now returns { data, pagination, filters }
        const comparisonData = Array.isArray(responseData)
          ? responseData
          : (responseData.data || responseData.comparison || []);

        // Handle pagination
        let paginationData: any = {};
        if (responseData.pagination) {
          paginationData = {
            page: responseData.pagination.page || page,
            limit: responseData.pagination.limit || itemsPerPage,
            total: responseData.pagination.total || 0,
            totalPages: responseData.pagination.totalPages || Math.ceil((responseData.pagination.total || 0) / (responseData.pagination.limit || itemsPerPage))
          };
        } else {
          const totalFromResponse = responseData.total || comparisonData.length;
          const limitFromResponse = responseData.limit || itemsPerPage;
          paginationData = {
            page: responseData.page || page,
            limit: limitFromResponse,
            total: totalFromResponse,
            totalPages: responseData.totalPages || Math.ceil(totalFromResponse / limitFromResponse)
          };
        }

        setComparisonList(comparisonData);
        setFilteredList(comparisonData);
        setTotalItems(paginationData.total || 0);
        setTotalPages(paginationData.totalPages || 0);
        setCurrentPage(paginationData.page || page);

        if (comparisonData.length === 0) {
          toast.info('ไม่พบข้อมูลเปรียบเทียบ กรุณาตรวจสอบว่ามีข้อมูลในระบบ');
        } else {
          toast.success(`พบ ${paginationData.total || comparisonData.length} รายการเปรียบเทียบ`);
        }
      } else {
        toast.error(response.message || 'ไม่สามารถโหลดข้อมูลได้');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoadingList(false);
    }
  };

  const handleSearch = (keywordOverride?: string) => {
    setCurrentPage(1);
    if (keywordOverride !== undefined) {
      setFilters(prev => {
        const updated = { ...prev, searchItemCode: keywordOverride };
        fetchComparisonList(1, updated);
        return updated;
      });
    } else {
      fetchComparisonList(1);
    }
  };

  const handleClearSearch = () => {
    const clearedFilters: FilterState = {
      searchItemCode: '',
      startDate: getTodayDate(),
      endDate: getTodayDate(),
      itemTypeFilter: 'all',
      departmentCode: '',
    };
    setFilters(clearedFilters);
    setCurrentPage(1);
    fetchComparisonList(1, clearedFilters);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSelectItem = (itemCode: string) => {
    setSelectedItemCode(itemCode);
  };

  const handleExportReport = async (format: 'excel' | 'pdf', itemCode?: string) => {
    try {
      toast.info(`กำลังสร้างรายงาน ${format.toUpperCase()}...`);
      const params = {
        itemCode: itemCode || filters.searchItemCode || undefined,
        itemTypeId: filters.itemTypeFilter && filters.itemTypeFilter !== 'all' ? Number(filters.itemTypeFilter) : undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        departmentCode: filters.departmentCode || undefined,
        includeUsageDetails: itemCode ? 'true' : undefined,
      };
      if (format === 'excel') {
        await itemComparisonApi.downloadComparisonExcel(params);
      } else {
        await itemComparisonApi.downloadComparisonPdf(params);
      }
      toast.success(`ดาวน์โหลดรายงาน ${format.toUpperCase()} สำเร็จ`);
    } catch (error: any) {
      toast.error(`ไม่สามารถสร้างรายงาน ${format.toUpperCase()} ได้: ${error.message}`);
    }
  };

  const calculateSummary = (): SummaryData => {
    return {
      total: totalItems,
      matched: filteredList.filter(item => item.status === 'MATCHED').length,
      notMatched: filteredList.filter(item => item.status !== 'MATCHED').length
    };
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchComparisonList(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  const getItemTypes = () => {
    const types = new Map();
    comparisonList.forEach(item => {
      if (item.itemTypeId && item.itemTypeName) {
        types.set(item.itemTypeId, item.itemTypeName);
      }
    });
    return Array.from(types.entries()).map(([id, name]) => ({ id: id.toString(), name }));
  };

  const summary = calculateSummary();
  const selectedItem = filteredList.find(item => item.itemcode === selectedItemCode);

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
              รายงานเปรียบเทียบตามเวชภัณฑ์
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              เปรียบเทียบจำนวนเบิกกับการใช้งานจริงแยกตามรายการเวชภัณฑ์
            </p>
          </div>
        </div>

        {/* Filter Section */}
        <FilterSection
          filters={filters}
          onFilterChange={handleFilterChange}
          onSearch={handleSearch}
          onClear={handleClearSearch}
          onRefresh={() => fetchComparisonList(currentPage)}
          itemTypes={getItemTypes()}
          departments={departments}
          loading={loadingList}
          items={comparisonList}
          departmentDisabled={false}
        />

        {/* Comparison List Table */}
        <ComparisonTable
          loading={loadingList}
          items={filteredList}
          selectedItemCode={selectedItemCode}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          searchItemCode={filters.searchItemCode}
          itemTypeFilter={filters.itemTypeFilter}
          startDate={filters.startDate}
          endDate={filters.endDate}
          departmentCode={filters.departmentCode}
          onSelectItem={handleSelectItem}
          onPageChange={handlePageChange}
          onExportExcel={() => handleExportReport('excel')}
          onExportPdf={() => handleExportReport('pdf')}
        />

        {/* Detail Section - Only show when item is selected */}
        {selectedItemCode && selectedItem && (
          <>
            {/* Item Info */}
            <ItemInfoCard
              item={selectedItem}
              loading={false}
              onExportExcel={() => handleExportReport('excel', selectedItemCode)}
              onExportPdf={() => handleExportReport('pdf', selectedItemCode)}
              onRefresh={() => { }}
            />

            {/* Summary Cards */}
            <SummaryCards
              selectedItem={selectedItem}
              summary={summary}
            />

            {/* Comparison Details */}
            <ComparisonDetailsCard item={selectedItem} />

            {/* Usage Items List */}
            <UsageItemsTable
              itemCode={selectedItemCode}
              itemName={selectedItem.itemname}
              startDate={filters.startDate}
              endDate={filters.endDate}
            />
          </>
        )}
      </div>
    </>
  );
}
