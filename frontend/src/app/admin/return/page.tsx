'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { RotateCcw, History } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  medicalSuppliesApi,
  itemsApi,
  departmentApi,
  cabinetApi,
  cabinetDepartmentApi,
  medicalSupplySubDepartmentsApi,
} from '@/lib/api';
import { toast } from 'sonner';
import ReturnFormTab from './components/ReturnFormTab';
import ReturnHistoryTab from './components/ReturnHistoryTab';
import WillReturnFilterCard from './components/WillReturnFilterCard';
import type {
  DepartmentOption,
  SubDepartmentOption,
} from '@/app/admin/medical-supplies/components/MedicalSuppliesSearchFilters';
import type { ReturnHistoryData, WillReturnItem } from './types';
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
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('return');

  // รายการจาก /item-stocks/will-return (สรุปตาม ItemCode: max_available_qty)
  const [willReturnItems, setWillReturnItems] = useState<WillReturnItem[]>([]);
  const [loadingWillReturn, setLoadingWillReturn] = useState(false);

  // Filter สำหรับรายการแจ้งคืน — เริ่มว่าง ให้ผู้ใช้เลือกเอง
  const [filterDepartmentId, setFilterDepartmentId] = useState('');
  const [filterCabinetId, setFilterCabinetId] = useState('');
  const [filterSubDepartmentId, setFilterSubDepartmentId] = useState('');
  const [filterItemCode, setFilterItemCode] = useState('');
  const [filterStartDate, setFilterStartDate] = useState(() => getTodayDate());
  const [filterEndDate, setFilterEndDate] = useState(() => getTodayDate());

  // Departments และ Cabinets สำหรับ dropdown กรอง
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [cabinets, setCabinets] = useState<Array<{ id: number; cabinet_name?: string; cabinet_code?: string }>>([]);
  const [subDepartmentsMaster, setSubDepartmentsMaster] = useState<SubDepartmentOption[]>([]);

  // Return history — ค่าเริ่มต้นเป็นวันนี้ (ทั้งจาก–ถึง)
  const [returnHistoryDateFrom, setReturnHistoryDateFrom] = useState(() => getTodayDate());
  const [returnHistoryDateTo, setReturnHistoryDateTo] = useState(() => getTodayDate());
  const [returnHistoryReason, setReturnHistoryReason] = useState<string>('ALL');
  const [returnHistoryDepartmentCode, setReturnHistoryDepartmentCode] = useState<string>('');
  const [returnHistorySubDepartmentId, setReturnHistorySubDepartmentId] = useState('');
  const [returnHistoryCabinetId, setReturnHistoryCabinetId] = useState('');
  const [returnHistoryItemKeyword, setReturnHistoryItemKeyword] = useState('');
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
        const res = await itemsApi.getItemStocksWillReturn(
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
  }, []);

  const loadCabinetsForFilter = useCallback(async (departmentIdStr: string) => {
    const next = await resolveCabinetsForFilter(departmentIdStr);
    setCabinets(next);
    setFilterCabinetId((prev) => {
      if (!prev) return prev;
      const id = parseInt(prev, 10);
      if (Number.isNaN(id)) return '';
      return next.some((c) => c.id === id) ? prev : '';
    });
  }, [resolveCabinetsForFilter]);

  const loadHistoryCabinets = useCallback(async (departmentIdStr: string) => {
    const next = await resolveCabinetsForFilter(departmentIdStr);
    setHistoryCabinets(next);
    setReturnHistoryCabinetId((prev) => {
      if (!prev) return prev;
      const id = parseInt(prev, 10);
      if (Number.isNaN(id)) return '';
      return next.some((c) => c.id === id) ? prev : '';
    });
  }, [resolveCabinetsForFilter]);

  useEffect(() => {
    fetchDepartments();
    void fetchSubDepartmentsMaster();
    loadWillReturnItems();
    // โหลดรายการและตัวเลือกกรองเฉพาะตอน mount; การกดค้นหา/รีเซ็ตเรียก loadWillReturnItems เอง
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadCabinetsForFilter(filterDepartmentId);
  }, [filterDepartmentId, loadCabinetsForFilter]);

  useEffect(() => {
    void loadHistoryCabinets(returnHistoryDepartmentCode);
  }, [returnHistoryDepartmentCode, loadHistoryCabinets]);

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
      // ignore
    }
  };

  const handleWillReturnFilterReset = () => {
    const start = getTodayDate();
    setFilterDepartmentId('');
    setFilterCabinetId('');
    setFilterSubDepartmentId('');
    setFilterItemCode('');
    setFilterStartDate(start);
    setFilterEndDate(start);
    loadWillReturnItems({
      start_date: start,
      end_date: start,
    });
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

      const listRes: any = await medicalSuppliesApi.getItemStocksForReturnToCabinet({
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

      const resp = await medicalSuppliesApi.recordStockReturn({
        items,
        return_by_user_id: user?.id != null ? `admin:${user.id}` : undefined,
        ...(selectedItem?.StockID != null && { stock_id: selectedItem.StockID }),
      });

      if (resp?.success) {
        toast.success(
          resp.message ||
          `บันทึกการแจ้งอุปกรณ์ที่ไม่ถูกใช้งาน / ชำรุดสำเร็จ ${resp.data?.updatedCount ?? items.length} รายการ`,
        );
        await loadWillReturnItems();
      } else {
        toast.error(resp?.message || 'ไม่สามารถบันทึกการแจ้งอุปกรณ์ได้');
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

      const result = await medicalSuppliesApi.getReturnHistory(params);
      const raw = result as {
        success?: boolean;
        message?: string;
        data?: any[] | { data?: any[]; total?: number; page?: number; limit?: number };
        total?: number;
        page?: number;
        limit?: number;
      };
      if (raw.success === false) {
        toast.error(raw.message || 'ไม่สามารถโหลดประวัติการแจ้งคืนได้');
        setReturnHistoryData({ data: [], total: 0, page: 1, limit: returnHistoryLimit });
        return;
      }
      const list = Array.isArray(raw.data)
        ? raw.data
        : raw.data && typeof raw.data === 'object' && Array.isArray((raw.data as { data?: any[] }).data)
          ? (raw.data as { data: any[] }).data
          : [];
      const payload =
        raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)
          ? (raw.data as { total?: number; page?: number; limit?: number })
          : null;
      const total = raw.total ?? payload?.total ?? (Array.isArray(list) ? list.length : 0);
      const pageNum = raw.page ?? payload?.page ?? page;
      const limitVal = raw.limit ?? payload?.limit ?? returnHistoryLimit;
      setReturnHistoryData({
        data: Array.isArray(list) ? list : [],
        total: Number(total) || 0,
        page: Number(pageNum) || 1,
        limit: Number(limitVal) || returnHistoryLimit,
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

  const handleReturnHistoryReset = () => {
    const start = getTodayDate();
    setReturnHistoryDateFrom(start);
    setReturnHistoryDateTo(start);
    setReturnHistoryReason('ALL');
    setReturnHistoryDepartmentCode('');
    setReturnHistorySubDepartmentId('');
    setReturnHistoryCabinetId('');
    setReturnHistoryItemKeyword('');
    setReturnHistoryPage(1);
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

  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-sm">
              <RotateCcw className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">แจ้งอุปกรณ์ที่ไม่ถูกใช้งาน</h1>
              <p className="text-slate-500 mt-1">
                แจ้งอุปกรณ์ที่ไม่ถูกใช้งาน
              </p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 h-11 rounded-lg bg-slate-100 p-1">
              <TabsTrigger value="return" className="flex items-center gap-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <RotateCcw className="h-4 w-4" />
                แจ้งอุปกรณ์ที่ไม่ถูกใช้งาน
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <History className="h-4 w-4" />
                ประวัติการแจ้งอุปกรณ์ที่ไม่ถูกใช้งาน
              </TabsTrigger>
            </TabsList>

            <TabsContent value="return" className="space-y-4">
              <WillReturnFilterCard
                departmentId={filterDepartmentId}
                cabinetId={filterCabinetId}
                subDepartmentId={filterSubDepartmentId}
                itemCode={filterItemCode}
                startDate={filterStartDate}
                endDate={filterEndDate}
                departments={departments}
                cabinets={cabinets}
                subDepartments={subDepartmentsMaster}
                onDepartmentChange={setFilterDepartmentId}
                onCabinetChange={setFilterCabinetId}
                onSubDepartmentChange={setFilterSubDepartmentId}
                onItemCodeChange={setFilterItemCode}
                onStartDateChange={setFilterStartDate}
                onEndDateChange={setFilterEndDate}
                onSearch={() => loadWillReturnItems()}
                onReset={handleWillReturnFilterReset}
                onRefresh={() => loadWillReturnItems()}
                loading={loadingWillReturn}
              />
              <ReturnFormTab
                willReturnItems={willReturnItems}
                loadingWillReturn={loadingWillReturn}
                loadWillReturnItems={() => loadWillReturnItems()}
                onSubmit={handleReturnSubmit}
                isSubmitting={loading}
              />
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <ReturnHistoryTab
                dateFrom={returnHistoryDateFrom}
                dateTo={returnHistoryDateTo}
                reason={returnHistoryReason}
                departmentCode={returnHistoryDepartmentCode}
                subDepartmentId={returnHistorySubDepartmentId}
                cabinetId={returnHistoryCabinetId}
                itemKeyword={returnHistoryItemKeyword}
                departments={departments}
                subDepartments={subDepartmentsMaster}
                cabinets={historyCabinets}
                data={returnHistoryData}
                currentPage={returnHistoryPage}
                limit={returnHistoryLimit}
                loading={historyLoading}
                onDateFromChange={setReturnHistoryDateFrom}
                onDateToChange={setReturnHistoryDateTo}
                onReasonChange={setReturnHistoryReason}
                onDepartmentChange={setReturnHistoryDepartmentCode}
                onSubDepartmentChange={setReturnHistorySubDepartmentId}
                onCabinetChange={setReturnHistoryCabinetId}
                onItemKeywordChange={setReturnHistoryItemKeyword}
                onPageChange={setReturnHistoryPage}
                onSearch={fetchReturnHistory}
                onReset={handleReturnHistoryReset}
                onRefresh={fetchReturnHistory}
                formatDate={formatDate}
                getReturnReasonLabel={getReturnReasonLabel}
              />
            </TabsContent>
          </Tabs>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
