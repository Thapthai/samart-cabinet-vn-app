'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { itemComparisonApi } from '@/lib/staffApi/itemComparisonApi';
import { staffCabinetApi, staffCabinetDepartmentApi } from '@/lib/staffApi/cabinetApi';
import { getStaffAllowedDepartmentIds } from '@/lib/staffDepartmentScope';

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
  const [comparisonCabinets, setComparisonCabinets] = useState<CabinetFilterOption[]>([]);

  const [filters, setFilters] = useState<FilterState>({
    searchItemCode: '',
    startDate: getTodayDate(),
    endDate: getTodayDate(),
    itemTypeFilter: 'all',
    departmentCode: '',
    subDepartmentId: '',
    cabinetId: '',
  });
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    searchItemCode: '',
    startDate: getTodayDate(),
    endDate: getTodayDate(),
    itemTypeFilter: 'all',
    departmentCode: '',
    subDepartmentId: '',
    cabinetId: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const resolveCabinetsForComparison = useCallback(
    async (departmentIdStr: string): Promise<CabinetFilterOption[]> => {
      try {
        let next: CabinetFilterOption[] = [];
        if (!departmentIdStr) {
          const allowed = await getStaffAllowedDepartmentIds();
          if (allowed != null && Array.isArray(allowed) && allowed.length === 0) {
            return [];
          }
          if (allowed != null && Array.isArray(allowed) && allowed.length > 0) {
            const unique = new Map<number, CabinetFilterOption>();
            for (const deptId of allowed) {
              const res = await staffCabinetDepartmentApi.getAll({ departmentId: deptId });
              const mappings = (res as { success?: boolean; data?: unknown[] }).data;
              if (!Array.isArray(mappings)) continue;
              for (const row of mappings) {
                if (!row || typeof row !== 'object') continue;
                const m = row as { status?: string; cabinet?: unknown };
                if (m.status != null && m.status !== 'ACTIVE') continue;
                const mapped = mapCabinetRow(m.cabinet);
                if (mapped && !unique.has(mapped.id)) unique.set(mapped.id, mapped);
              }
            }
            next = Array.from(unique.values()).sort((a, b) => a.id - b.id);
            return next;
          }
          const res = await staffCabinetApi.getAll({ page: 1, limit: 500 });
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
          const res = await staffCabinetDepartmentApi.getAll({ departmentId: deptId });
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

  const fetchComparisonList = async (page: number = 1, customFilters?: FilterState) => {
    try {
      setLoadingList(true);
      const activeFilters = customFilters || filters;
      const params: Record<string, string | number> = {
        page,
        limit: itemsPerPage,
      };
      if (activeFilters.startDate) params.startDate = activeFilters.startDate;
      if (activeFilters.endDate) params.endDate = activeFilters.endDate;
      if (activeFilters.searchItemCode) params.keyword = activeFilters.searchItemCode;
      if (activeFilters.itemTypeFilter && activeFilters.itemTypeFilter !== 'all') {
        params.itemTypeId = parseInt(activeFilters.itemTypeFilter, 10);
      }
      if (activeFilters.departmentCode) params.departmentCode = activeFilters.departmentCode;
      if (activeFilters.subDepartmentId?.trim()) {
        params.subDepartmentId = activeFilters.subDepartmentId.trim();
      }
      if (activeFilters.cabinetId?.trim()) {
        params.cabinetId = activeFilters.cabinetId.trim();
      }

      const response = await itemComparisonApi.compareDispensedVsUsage(params);

      if (response.success === false) {
        toast.error(
          (response as { message?: string }).message || 'ไม่สามารถโหลดข้อมูลได้',
        );
        return;
      }

      const responseData: any = response.data || response;

      const comparisonData = Array.isArray(responseData)
        ? responseData
        : (responseData.data || responseData.comparison || []);

      let paginationData: any = {};
      if (responseData.pagination) {
        paginationData = {
          page: responseData.pagination.page || page,
          limit: responseData.pagination.limit || itemsPerPage,
          total: responseData.pagination.total || 0,
          totalPages:
            responseData.pagination.totalPages ||
            Math.ceil(
              (responseData.pagination.total || 0) / (responseData.pagination.limit || itemsPerPage),
            ),
        };
      } else {
        const totalFromResponse = responseData.total || comparisonData.length;
        const limitFromResponse = responseData.limit || itemsPerPage;
        paginationData = {
          page: responseData.page || page,
          limit: limitFromResponse,
          total: totalFromResponse,
          totalPages: responseData.totalPages || Math.ceil(totalFromResponse / limitFromResponse),
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
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    const initialFilters: FilterState = {
      searchItemCode: '',
      startDate: getTodayDate(),
      endDate: getTodayDate(),
      itemTypeFilter: 'all',
      departmentCode: '',
      subDepartmentId: '',
      cabinetId: '',
    };
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    void fetchComparisonList(1, initialFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  const handleSearch = (keywordOverride?: string) => {
    setCurrentPage(1);
    if (keywordOverride !== undefined) {
      setFilters((prev) => {
        const updated = { ...prev, searchItemCode: keywordOverride };
        setAppliedFilters(updated);
        fetchComparisonList(1, updated);
        return updated;
      });
    } else {
      setAppliedFilters(filters);
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
    setAppliedFilters(clearedFilters);
    setCurrentPage(1);
    fetchComparisonList(1, clearedFilters);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
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
      matched: filteredList.filter((item) => item.status === 'MATCHED').length,
      notMatched: filteredList.filter((item) => item.status !== 'MATCHED').length,
    };
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchComparisonList(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getItemTypes = () => {
    const types = new Map();
    comparisonList.forEach((item) => {
      if (item.itemTypeId && item.itemTypeName) {
        types.set(item.itemTypeId, item.itemTypeName);
      }
    });
    return Array.from(types.entries()).map(([id, name]) => ({ id: id.toString(), name }));
  };

  const summary = calculateSummary();
  const selectedItem = filteredList.find((item) => item.itemcode === selectedItemCode);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Package className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">รายงานเปรียบเทียบตามเวชภัณฑ์</h1>
            <p className="text-sm text-gray-500 mt-1">
              เปรียบเทียบจำนวนเบิกกับการใช้งานจริงแยกตามรายการเวชภัณฑ์
            </p>
          </div>
        </div>

        <FilterSection
          filters={filters}
          appliedFilters={appliedFilters}
          onFilterChange={handleFilterChange}
          onSearch={handleSearch}
          onClear={handleClearSearch}
          onRefresh={() => fetchComparisonList(currentPage)}
          itemTypes={getItemTypes()}
          cabinets={comparisonCabinets}
          loading={loadingList}
          items={comparisonList}
          departmentDisabled={false}
        />

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

        {selectedItemCode && selectedItem && (
          <>
            <ItemInfoCard
              item={selectedItem}
              loading={false}
              onExportExcel={() => handleExportReport('excel', selectedItemCode)}
              onExportPdf={() => handleExportReport('pdf', selectedItemCode)}
              onRefresh={() => {}}
            />

            <SummaryCards selectedItem={selectedItem} summary={summary} />

            <ComparisonDetailsCard item={selectedItem} />

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
    </>
  );
}
