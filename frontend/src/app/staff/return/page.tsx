'use client';

import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, History, Undo2 } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { staffItemsApi } from '@/lib/staffApi/itemsApi';
import { staffMedicalSuppliesApi } from '@/lib/staffApi/medicalSuppliesApi';
import { getStaffAllowedDepartmentIds } from '@/lib/staffDepartmentScope';
import { staffCabinetApi, staffCabinetDepartmentApi } from '@/lib/staffApi/cabinetApi';
import { staffMedicalSupplySubDepartmentsApi } from '@/lib/staffApi/medicalSupplySubDepartmentsApi';
import type { SubDepartmentOption } from '@/app/admin/medical-supplies/components/MedicalSuppliesSearchFilters';
import { toast } from 'sonner';
import StaffWillReturnFilterCard, { type AppliedWillReturnFilters } from './components/StaffWillReturnFilterCard';
import StaffReturnFormTab from './components/StaffReturnFormTab';
import type { WillReturnItem } from './types';
import ReturnHistoryFilter, { type AppliedReturnHistoryFilters } from './components/ReturnHistoryFilter';
import ReturnHistoryTable from './components/ReturnHistoryTable';
import type { ReturnHistoryData } from './types';
import { formatUtcDateTime } from '@/lib/formatThaiDateTime';

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

export default function ReturnMedicalSuppliesPage() {
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('return');

  const [willReturnItems, setWillReturnItems] = useState<WillReturnItem[]>([]);
  const [loadingWillReturn, setLoadingWillReturn] = useState(false);

  const [filterDepartmentId, setFilterDepartmentId] = useState('');
  const [filterCabinetId, setFilterCabinetId] = useState('');
  const [filterSubDepartmentId, setFilterSubDepartmentId] = useState('');
  const [filterItemCode, setFilterItemCode] = useState('');
  const [filterStartDate, setFilterStartDate] = useState(() => getTodayDate());
  const [filterEndDate, setFilterEndDate] = useState(() => getTodayDate());
  const [appliedWillReturnFilters, setAppliedWillReturnFilters] = useState<AppliedWillReturnFilters>(
    () => ({
      departmentId: '',
      cabinetId: '',
      subDepartmentId: '',
      itemCode: '',
      startDate: getTodayDate(),
      endDate: getTodayDate(),
    }),
  );

  const [subDepartmentsMaster, setSubDepartmentsMaster] = useState<SubDepartmentOption[]>([]);
  const [cabinets, setCabinets] = useState<Array<{ id: number; cabinet_name?: string; cabinet_code?: string }>>([]);

  const [returnHistoryDateFrom, setReturnHistoryDateFrom] = useState(() => getTodayDate());
  const [returnHistoryDateTo, setReturnHistoryDateTo] = useState(() => getTodayDate());
  const [returnHistoryReason, setReturnHistoryReason] = useState<string>('ALL');
  const [returnHistoryDepartmentCode, setReturnHistoryDepartmentCode] = useState<string>('');
  const [returnHistorySubDepartmentId, setReturnHistorySubDepartmentId] = useState('');
  const [returnHistoryCabinetId, setReturnHistoryCabinetId] = useState('');
  const [returnHistoryItemKeyword, setReturnHistoryItemKeyword] = useState('');
  const [appliedHistoryFilters, setAppliedHistoryFilters] = useState<AppliedReturnHistoryFilters>(
    () => ({
      dateFrom: getTodayDate(),
      dateTo: getTodayDate(),
      reason: 'ALL',
      departmentCode: '',
      subDepartmentId: '',
      cabinetId: '',
      itemKeyword: '',
    }),
  );
  const [historyCabinets, setHistoryCabinets] = useState<CabinetFilterOption[]>([]);
  const [returnHistoryData, setReturnHistoryData] = useState<ReturnHistoryData | null>({
    data: [],
    total: 0,
    page: 1,
    limit: 10,
  });
  const [returnHistoryPage, setReturnHistoryPage] = useState(1);
  const [returnHistoryLimit] = useState(10);

  const loadWillReturnItems = useCallback(
    async (override?: {
      department_id?: number;
      cabinet_id?: number;
      sub_department_id?: number;
      item_code?: string;
      start_date?: string;
      end_date?: string;
    }) => {
      try {
        setLoadingWillReturn(true);
        const params: {
          department_id?: number;
          cabinet_id?: number;
          sub_department_id?: number;
          item_code?: string;
          start_date?: string;
          end_date?: string;
        } = {};
        if (override) {
          if (override.department_id != null && override.department_id !== undefined)
            params.department_id = override.department_id;
          if (override.cabinet_id != null && override.cabinet_id !== undefined)
            params.cabinet_id = override.cabinet_id;
          if (override.sub_department_id != null && override.sub_department_id !== undefined)
            params.sub_department_id = override.sub_department_id;
          if (override.item_code != null && override.item_code !== '') params.item_code = override.item_code;
          if (override.start_date != null && override.start_date !== '') params.start_date = override.start_date;
          if (override.end_date != null && override.end_date !== '') params.end_date = override.end_date;
        } else {
          if (filterDepartmentId) params.department_id = parseInt(filterDepartmentId, 10);
          if (filterCabinetId) params.cabinet_id = parseInt(filterCabinetId, 10);
          if (filterSubDepartmentId.trim()) {
            const sid = parseInt(filterSubDepartmentId.trim(), 10);
            if (!Number.isNaN(sid)) params.sub_department_id = sid;
          }
          if (filterItemCode.trim()) params.item_code = filterItemCode.trim();
          if (filterStartDate.trim()) params.start_date = filterStartDate.trim();
          if (filterEndDate.trim()) params.end_date = filterEndDate.trim();
        }
        const res = await staffItemsApi.getItemStocksWillReturn(
          Object.keys(params).length > 0 ? params : undefined,
        );
        if (res?.success && Array.isArray(res.data)) {
          setWillReturnItems(res.data as WillReturnItem[]);
        } else {
          setWillReturnItems([]);
        }
      } catch {
        setWillReturnItems([]);
      } finally {
        setLoadingWillReturn(false);
      }
    },
    [filterDepartmentId, filterCabinetId, filterSubDepartmentId, filterItemCode, filterStartDate, filterEndDate],
  );

  const resolveCabinetsForFilter = useCallback(async (departmentIdStr: string): Promise<CabinetFilterOption[]> => {
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
  }, []);

  const loadCabinetsForFilter = useCallback(
    async (departmentIdStr: string) => {
      const next = await resolveCabinetsForFilter(departmentIdStr);
      setCabinets(next);
      setFilterCabinetId((prev) => {
        if (next.length === 0) return '';
        if (next.length === 1) return String(next[0].id);
        if (!prev?.trim()) return '';
        const id = parseInt(prev, 10);
        if (Number.isNaN(id)) return '';
        return next.some((c) => c.id === id) ? prev : '';
      });
    },
    [resolveCabinetsForFilter],
  );

  useEffect(() => {
    (async () => {
      try {
        const allowed = await getStaffAllowedDepartmentIds();
        const res = await staffMedicalSupplySubDepartmentsApi.getAll();
        let raw = res.data ?? [];
        if (allowed != null && Array.isArray(allowed) && allowed.length > 0) {
          const allowSet = new Set(allowed);
          raw = raw.filter((s) => allowSet.has(s.department_id));
        } else if (allowed != null && Array.isArray(allowed) && allowed.length === 0) {
          raw = [];
        }
        setSubDepartmentsMaster(
          raw.map((s) => ({
            id: s.id,
            department_id: s.department_id,
            code: s.code,
            name: s.name ?? null,
            status: s.status,
          })),
        );
      } catch {
        setSubDepartmentsMaster([]);
      }
      setFilterDepartmentId('');
      setFilterCabinetId('');
      setFilterSubDepartmentId('');
      const start = getTodayDate();
      setFilterStartDate(start);
      setFilterEndDate(start);
      loadWillReturnItems({ start_date: start, end_date: start });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadCabinetsForFilter(filterDepartmentId);
  }, [filterDepartmentId, loadCabinetsForFilter]);

  const loadHistoryCabinets = useCallback(
    async (departmentIdStr: string) => {
      const next = await resolveCabinetsForFilter(departmentIdStr);
      setHistoryCabinets(next);
      setReturnHistoryCabinetId((prev) => {
        if (next.length === 0) return '';
        if (next.length === 1) return String(next[0].id);
        if (!prev?.trim()) return '';
        const id = parseInt(prev, 10);
        if (Number.isNaN(id)) return '';
        return next.some((c) => c.id === id) ? prev : '';
      });
    },
    [resolveCabinetsForFilter],
  );

  useEffect(() => {
    void loadHistoryCabinets(returnHistoryDepartmentCode);
  }, [returnHistoryDepartmentCode, loadHistoryCabinets]);

  const handleWillReturnFilterReset = () => {
    const start = getTodayDate();
    const reset: AppliedWillReturnFilters = {
      departmentId: '',
      cabinetId: '',
      subDepartmentId: '',
      itemCode: '',
      startDate: start,
      endDate: start,
    };
    setFilterDepartmentId('');
    setFilterCabinetId('');
    setFilterSubDepartmentId('');
    setFilterItemCode('');
    setFilterStartDate(start);
    setFilterEndDate(start);
    setAppliedWillReturnFilters(reset);
    loadWillReturnItems({
      start_date: start,
      end_date: start,
    });
  };

  const handleWillReturnSearch = () => {
    setAppliedWillReturnFilters({
      departmentId: filterDepartmentId,
      cabinetId: filterCabinetId,
      subDepartmentId: filterSubDepartmentId,
      itemCode: filterItemCode,
      startDate: filterStartDate,
      endDate: filterEndDate,
    });
    loadWillReturnItems();
  };

  const handleReturnSubmit = async (params: {
    itemCode: string;
    stockId: number | null;
    qty: number;
    reason: string;
    note: string;
  }) => {
    const { itemCode, stockId, qty: qtyToSubmit, reason: reasonParam, note: noteParam } = params;
    const selectedItem = willReturnItems.find(
      (i) => i.ItemCode === itemCode && (stockId == null || i.StockID === stockId),
    );
    if (!selectedItem) {
      toast.error('กรุณาเลือกรายการอุปกรณ์');
      return;
    }
    const maxQty = selectedItem.max_available_qty ?? 0;
    if (qtyToSubmit < 1 || maxQty < 1) {
      toast.error('จำนวนที่แจ้งต้องอยู่ระหว่าง 1 ถึงจำนวนสูงสุดที่สามารถใส่ได้');
      return;
    }

    try {
      setLoading(true);

      const listRes: any = await staffMedicalSuppliesApi.getItemStocksForReturnToCabinet({
        itemCode,
        page: 1,
        limit: qtyToSubmit,
      });

      const rows = listRes?.success && Array.isArray(listRes.data) ? listRes.data : [];
      const rowIds = rows
        .slice(0, qtyToSubmit)
        .map((r: { RowID?: number }) => r.RowID)
        .filter((id: unknown): id is number => typeof id === 'number');

      if (rowIds.length === 0) {
        toast.error('ไม่พบรายการ stock สำหรับรหัสนี้ในตู้ที่รอแจ้ง');
        return;
      }

      const items = rowIds.map((item_stock_id: number) => ({
        item_stock_id,
        return_reason: reasonParam,
        return_note:
          reasonParam === 'OTHER' && noteParam?.trim() ? noteParam.trim() : undefined,
      }));

      const resp: any = await staffMedicalSuppliesApi.recordStockReturn({
        items,
        ...(selectedItem?.StockID != null && { stock_id: selectedItem.StockID }),
      });

      if (resp?.success) {
        toast.success(
          resp.message ||
          `บันทึกการแจ้งอุปกรณ์ที่ไม่ถูกใช้งาน / ชำรุดสำเร็จ ${resp.data?.updatedCount ?? resp.updatedCount ?? items.length} รายการ`,
        );
        await loadWillReturnItems();
      } else {
        toast.error(resp?.message || resp?.error || 'ไม่สามารถบันทึกการแจ้งอุปกรณ์ได้');
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error(`เกิดข้อผิดพลาด: ${msg}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const fetchReturnHistory = async (
    opts?: Partial<{
      page: number;
      dateFrom: string;
      dateTo: string;
      reason: string;
      departmentCode: string;
      subDepartmentId: string;
      cabinetId: string;
      itemKeyword: string;
    }>,
  ) => {
    try {
      setHistoryLoading(true);
      const page = opts?.page ?? returnHistoryPage;
      const dateFrom = opts?.dateFrom ?? returnHistoryDateFrom;
      const dateTo = opts?.dateTo ?? returnHistoryDateTo;
      const reason = opts?.reason ?? returnHistoryReason;
      const departmentCode = opts?.departmentCode ?? returnHistoryDepartmentCode;
      const subDepartmentId = opts?.subDepartmentId ?? returnHistorySubDepartmentId;
      const cabinetId = opts?.cabinetId ?? returnHistoryCabinetId;
      const itemKeyword = opts?.itemKeyword ?? returnHistoryItemKeyword;

      setAppliedHistoryFilters({
        dateFrom,
        dateTo,
        reason,
        departmentCode,
        subDepartmentId,
        cabinetId,
        itemKeyword,
      });

      const params: Record<string, string | number> = {
        page,
        limit: returnHistoryLimit,
      };
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (reason && reason !== 'ALL') params.return_reason = reason;
      if (departmentCode) params.department_code = departmentCode;
      if (subDepartmentId.trim()) {
        const sid = parseInt(subDepartmentId.trim(), 10);
        if (!Number.isNaN(sid)) params.sub_department_id = String(sid);
      }
      if (cabinetId.trim()) {
        const cid = parseInt(cabinetId.trim(), 10);
        if (!Number.isNaN(cid)) params.cabinet_id = String(cid);
      }
      const kw = itemKeyword.trim();
      if (kw) params.item_keyword = kw;

      const result = (await staffMedicalSuppliesApi.getReturnHistory(params)) as {
        success?: boolean;
        message?: string;
        data?: any[];
        total?: number;
        page?: number;
        limit?: number;
      };

      if (result.success !== true) {
        toast.error(result.message || 'ไม่สามารถโหลดประวัติการแจ้งคืนได้');
        setReturnHistoryData({ data: [], total: 0, page: 1, limit: returnHistoryLimit });
        return;
      }
      const list = Array.isArray(result.data) ? result.data : [];
      const totalNum = Number(result.total);
      setReturnHistoryData({
        data: list,
        total: Number.isFinite(totalNum) ? totalNum : list.length,
        page: Number(result.page) || page,
        limit: Number(result.limit) || returnHistoryLimit,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error(`เกิดข้อผิดพลาด: ${msg}`);
      setReturnHistoryData({ data: [], total: 0, page: 1, limit: returnHistoryLimit });
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') fetchReturnHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, returnHistoryPage]);

  const handleReturnHistoryReset = () => {
    const start = getTodayDate();
    const reset: AppliedReturnHistoryFilters = {
      dateFrom: start,
      dateTo: start,
      reason: 'ALL',
      departmentCode: '',
      subDepartmentId: '',
      cabinetId: '',
      itemKeyword: '',
    };
    setReturnHistoryDateFrom(start);
    setReturnHistoryDateTo(start);
    setReturnHistoryReason('ALL');
    setReturnHistoryDepartmentCode('');
    setReturnHistorySubDepartmentId('');
    setReturnHistoryCabinetId('');
    setReturnHistoryItemKeyword('');
    setReturnHistoryPage(1);
    setAppliedHistoryFilters(reset);
    void fetchReturnHistory({
      page: 1,
      dateFrom: start,
      dateTo: start,
      reason: 'ALL',
      departmentCode: '',
      subDepartmentId: '',
      cabinetId: '',
      itemKeyword: '',
    });
  };

  const formatDate = (dateString: string) => formatUtcDateTime(dateString);

  const getReturnReasonLabel = (reason: string) => {
    const labels: { [key: string]: string } = {
      OTHER: 'อื่นๆ',
      UNWRAPPED_UNUSED: 'อื่นๆ (ข้อมูลเก่า)',
      EXPIRED: 'อุปกรณ์หมดอายุ',
      CONTAMINATED: 'อุปกรณ์มีการปนเปื้อน',
      DAMAGED: 'อุปกรณ์ชำรุด',
    };
    return labels[reason] || reason;
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-sm">
            <RotateCcw className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">แจ้งอุปกรณ์ที่ไม่ถูกใช้งาน</h1>
            <p className="text-slate-500 mt-1">แจ้งอุปกรณ์ที่ไม่ถูกใช้งาน</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('return')}
                  className={cn(
                    'flex gap-3 rounded-xl border bg-background p-3.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    activeTab === 'return'
                      ? 'border-primary bg-primary/[0.06] shadow-sm ring-2 ring-primary/15'
                      : 'border-slate-200 hover:bg-muted/40',
                  )}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                    <Undo2 className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 space-y-0.5">
                    <span className="block text-base font-medium text-slate-900 sm:text-lg">
                      แจ้งอุปกรณ์ที่ไม่ถูกใช้งาน
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={cn(
                    'flex gap-3 rounded-xl border bg-background p-3.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    activeTab === 'history'
                      ? 'border-primary bg-primary/[0.06] shadow-sm ring-2 ring-primary/15'
                      : 'border-slate-200 hover:bg-muted/40',
                  )}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <History className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 space-y-0.5">
                    <span className="block text-base font-medium text-slate-900 sm:text-lg">
                      ประวัติการแจ้งอุปกรณ์ที่ไม่ถูกใช้งาน
                    </span>
                  </span>
                </button>
              </div>
            </CardContent>
          </Card>

          <TabsContent value="return" className="space-y-4">
            <StaffWillReturnFilterCard
              departmentId={filterDepartmentId}
              cabinetId={filterCabinetId}
              subDepartmentId={filterSubDepartmentId}
              itemCode={filterItemCode}
              startDate={filterStartDate}
              endDate={filterEndDate}
              appliedFilters={appliedWillReturnFilters}
              cabinets={cabinets}
              subDepartments={subDepartmentsMaster}
              onDepartmentChange={setFilterDepartmentId}
              onCabinetChange={setFilterCabinetId}
              onSubDepartmentChange={setFilterSubDepartmentId}
              onItemCodeChange={setFilterItemCode}
              onStartDateChange={setFilterStartDate}
              onEndDateChange={setFilterEndDate}
              onSearch={handleWillReturnSearch}
              onReset={handleWillReturnFilterReset}
              onRefresh={() => loadWillReturnItems()}
              loading={loadingWillReturn}
              departmentLocked={false}
            />
            <StaffReturnFormTab
              willReturnItems={willReturnItems}
              loadingWillReturn={loadingWillReturn}
              onSubmit={handleReturnSubmit}
              isSubmitting={loading}
            />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <ReturnHistoryFilter
              dateFrom={returnHistoryDateFrom}
              dateTo={returnHistoryDateTo}
              reason={returnHistoryReason}
              departmentCode={returnHistoryDepartmentCode}
              subDepartmentId={returnHistorySubDepartmentId}
              cabinetId={returnHistoryCabinetId}
              itemKeyword={returnHistoryItemKeyword}
              appliedFilters={appliedHistoryFilters}
              subDepartments={subDepartmentsMaster}
              cabinets={historyCabinets}
              loading={historyLoading}
              onDateFromChange={setReturnHistoryDateFrom}
              onDateToChange={setReturnHistoryDateTo}
              onReasonChange={setReturnHistoryReason}
              onDepartmentChange={setReturnHistoryDepartmentCode}
              onSubDepartmentChange={setReturnHistorySubDepartmentId}
              onCabinetChange={setReturnHistoryCabinetId}
              onItemKeywordChange={setReturnHistoryItemKeyword}
              onSearch={() => {
                setReturnHistoryPage(1);
                void fetchReturnHistory({ page: 1 });
              }}
              onReset={handleReturnHistoryReset}
              onRefresh={() => fetchReturnHistory()}
            />
            <ReturnHistoryTable
              data={returnHistoryData}
              currentPage={returnHistoryPage}
              limit={returnHistoryLimit}
              dateFrom={returnHistoryDateFrom}
              dateTo={returnHistoryDateTo}
              reason={returnHistoryReason}
              formatDate={formatDate}
              getReturnReasonLabel={getReturnReasonLabel}
              onPageChange={setReturnHistoryPage}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
