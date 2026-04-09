'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  medicalSuppliesApi,
  departmentApi,
  cabinetApi,
  cabinetDepartmentApi,
  medicalSupplySubDepartmentsApi,
} from '@/lib/api';
import type {
  DepartmentOption,
  SubDepartmentOption,
} from '@/app/admin/medical-supplies/components/MedicalSuppliesSearchFilters';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
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
import type { ComparisonItem, FilterState, SummaryData } from './types';

type CabinetFilterOption = { id: number; cabinet_name?: string; cabinet_code?: string };
function mapCabinetRow(c: unknown): CabinetFilterOption | null {
  if (!c || typeof c !== 'object') return null;
  const o = c as Record<string, unknown>;
  const id = o.id;
  if (typeof id !== 'number') return null;
  return {
    id,
    cabinet_name: typeof o.cabinet_name === 'string' ? o.cabinet_name : undefined,
    cabinet_code: typeof o.cabinet_code === 'string' ? o.cabinet_code : undefined,
  };
}

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ItemComparisonPage() {
  const { user } = useAuth();
  const [loadingList, setLoadingList] = useState(true);
  const [selectedItemCode, setSelectedItemCode] = useState<string | null>(null);
  const [comparisonList, setComparisonList] = useState<ComparisonItem[]>([]);
  const [filteredList, setFilteredList] = useState<ComparisonItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [subDepartmentsMaster, setSubDepartmentsMaster] = useState<SubDepartmentOption[]>([]);
  const [comparisonCabinets, setComparisonCabinets] = useState<CabinetFilterOption[]>([]);

  // Filters - default to today's date
  const [filters, setFilters] = useState<FilterState>({
    searchItemCode: '',
    startDate: getTodayDate(),
    endDate: getTodayDate(),
    itemTypeFilter: 'all',
    departmentCode: '',
    subDepartmentId: '',
    cabinetId: '',
  });

  // Pagination for comparison list
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    if (user?.id) {
      fetchComparisonList();
      fetchDepartments();
      void fetchSubDepartmentsMaster();
    }
  }, [user?.id]);

  const resolveCabinetsForComparison = useCallback(
    async (departmentIdStr: string): Promise<CabinetFilterOption[]> => {
      try {
        let next: CabinetFilterOption[] = [];
        if (!departmentIdStr) {
          const res = await cabinetApi.getAll({ page: 1, limit: 500 });
          const raw = (res as { success?: boolean; data?: unknown[] }).data;
          if (Array.isArray(raw)) {
            next = raw
              .filter((cabinet) => {
                if (!cabinet || typeof cabinet !== 'object') return false;
                const c = cabinet as {
                  cabinetDepartments?: Array<{ status: string }>;
                  cabinet_status?: string;
                };
                if (c.cabinetDepartments && c.cabinetDepartments.length > 0) {
                  return c.cabinetDepartments.some((cd) => cd.status === 'ACTIVE');
                }
                return c.cabinet_status === 'ACTIVE';
              })
              .map(mapCabinetRow)
              .filter((x): x is CabinetFilterOption => x != null);
          }
        } else {
          const deptId = parseInt(departmentIdStr, 10);
          if (Number.isNaN(deptId)) return [];
          const res = await cabinetDepartmentApi.getAll({ departmentId: deptId });
          const mappings = (res as { success?: boolean; data?: unknown[] }).data;
          if (!Array.isArray(mappings)) return [];
          const unique = new Map<number, CabinetFilterOption>();
          for (const row of mappings) {
            if (!row || typeof row !== 'object') continue;
            const m = row as { status?: string; cabinet?: unknown };
            if (m.status != null && m.status !== 'ACTIVE') continue;
            const mapped = mapCabinetRow(m.cabinet);
            if (mapped && !unique.has(mapped.id)) unique.set(mapped.id, mapped);
          }
          next = Array.from(unique.values());
        }
        return next;
      } catch {
        return [];
      }
    },
    [],
  );

  const loadComparisonCabinets = useCallback(
    async (departmentIdStr: string) => {
      const next = await resolveCabinetsForComparison(departmentIdStr);
      setComparisonCabinets(next);
      setFilters((prev) => {
        if (!prev.cabinetId) return prev;
        const id = parseInt(prev.cabinetId, 10);
        if (Number.isNaN(id)) return { ...prev, cabinetId: '' };
        return next.some((c) => c.id === id) ? prev : { ...prev, cabinetId: '' };
      });
    },
    [resolveCabinetsForComparison],
  );

  useEffect(() => {
    void loadComparisonCabinets(filters.departmentCode);
  }, [filters.departmentCode, loadComparisonCabinets]);

  const fetchSubDepartmentsMaster = async () => {
    try {
      const res = await medicalSupplySubDepartmentsApi.getAll();
      if (res.success && Array.isArray(res.data)) {
        setSubDepartmentsMaster(
          res.data.map((s) => ({
            id: s.id,
            department_id: s.department_id,
            code: s.code,
            name: s.name ?? null,
            status: s.status,
          })),
        );
      }
    } catch {
      // ignore
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await departmentApi.getAll({ limit: 1000 });
      if (res.success && Array.isArray(res.data)) {
        setDepartments(
          res.data.map((d: { ID: number; DepName?: string | null; DepName2?: string | null }) => ({
            ID: d.ID,
            DepName: d.DepName ?? null,
            DepName2: d.DepName2 ?? null,
          })),
        );
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
      if (activeFilters.subDepartmentId?.trim()) {
        params.subDepartmentId = activeFilters.subDepartmentId.trim();
      }
      if (activeFilters.cabinetId?.trim()) {
        params.cabinetId = activeFilters.cabinetId.trim();
      }

      const response = await medicalSuppliesApi.compareDispensedVsUsage(params) as { success?: boolean; data?: any; message?: string; error?: string };

      if (response?.success || response?.data) {
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
        toast.error((response as any)?.error || (response as any)?.message || 'ไม่สามารถโหลดข้อมูลได้');
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
      // ใช้ functional update เพื่อให้ได้ filters เวอร์ชันล่าสุดตอนยิง API
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
      subDepartmentId: '',
      cabinetId: '',
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
        subDepartmentId: filters.subDepartmentId?.trim() || undefined,
        cabinetId: filters.cabinetId?.trim() || undefined,
        includeUsageDetails: itemCode ? 'true' : undefined,
      };
      if (format === 'excel') {
        await medicalSuppliesApi.downloadMedicalSuppliesComparisonExcel(params);
      } else {
        await medicalSuppliesApi.downloadMedicalSuppliesComparisonPdf(params);
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
    <ProtectedRoute>
      <AppLayout fullWidth>
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
            subDepartments={subDepartmentsMaster}
            cabinets={comparisonCabinets}
            loading={loadingList}
            items={comparisonList}
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
            subDepartmentId={filters.subDepartmentId}
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
                onRefresh={() => {}}
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
                departmentCode={filters.departmentCode}
                subDepartmentId={filters.subDepartmentId}
              />
            </>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
