'use client';

import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, History } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { staffItemsApi } from '@/lib/staffApi/itemsApi';
import { staffMedicalSuppliesApi } from '@/lib/staffApi/medicalSuppliesApi';
import { fetchStaffDepartmentsForFilter } from '@/lib/staffDepartmentScope';
import { staffCabinetDepartmentApi } from '@/lib/staffApi/cabinetApi';
import { toast } from 'sonner';
import StaffWillReturnFilterCard from './components/StaffWillReturnFilterCard';
import StaffReturnFormTab from './components/StaffReturnFormTab';
import type { WillReturnItem } from './types';
import ReturnHistoryFilter from './components/ReturnHistoryFilter';
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
  const [filterItemCode, setFilterItemCode] = useState('');
  const [filterStartDate, setFilterStartDate] = useState(() => getTodayDate());
  const [filterEndDate, setFilterEndDate] = useState(() => getTodayDate());

  const [departments, setDepartments] = useState<{ ID: number; DepName: string }[]>([]);
  const [cabinets, setCabinets] = useState<Array<{ id: number; cabinet_name?: string; cabinet_code?: string }>>([]);

  const [returnHistoryDateFrom, setReturnHistoryDateFrom] = useState(() => getTodayDate());
  const [returnHistoryDateTo, setReturnHistoryDateTo] = useState(() => getTodayDate());
  const [returnHistoryReason, setReturnHistoryReason] = useState<string>('ALL');
  const [returnHistoryDepartmentCode, setReturnHistoryDepartmentCode] = useState<string>('');
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
      item_code?: string;
      start_date?: string;
      end_date?: string;
    }) => {
      const cabinetFromOverride = override?.cabinet_id;
      const cabinetFromFilter = filterCabinetId.trim()
        ? parseInt(filterCabinetId, 10)
        : NaN;
      const cabinet_id =
        cabinetFromOverride != null && cabinetFromOverride !== undefined
          ? cabinetFromOverride
          : Number.isFinite(cabinetFromFilter)
            ? cabinetFromFilter
            : NaN;
      if (!Number.isFinite(cabinet_id) || cabinet_id < 1) {
        setWillReturnItems([]);
        return;
      }

      try {
        setLoadingWillReturn(true);
        const params: {
          department_id?: number;
          cabinet_id: number;
          item_code?: string;
          start_date?: string;
          end_date?: string;
        } = { cabinet_id };
        if (override) {
          if (override.department_id != null && override.department_id !== undefined)
            params.department_id = override.department_id;
          if (override.item_code != null && override.item_code !== '') params.item_code = override.item_code;
          if (override.start_date != null && override.start_date !== '') params.start_date = override.start_date;
          if (override.end_date != null && override.end_date !== '') params.end_date = override.end_date;
        } else {
          if (filterDepartmentId) params.department_id = parseInt(filterDepartmentId, 10);
          if (filterItemCode.trim()) params.item_code = filterItemCode.trim();
          if (filterStartDate.trim()) params.start_date = filterStartDate.trim();
          if (filterEndDate.trim()) params.end_date = filterEndDate.trim();
        }
        const res = await staffItemsApi.getItemStocksWillReturn(params);
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
    [filterDepartmentId, filterCabinetId, filterItemCode, filterStartDate, filterEndDate],
  );

  const loadCabinetsForFilter = useCallback(async (departmentIdStr: string) => {
    try {
      let next: CabinetFilterOption[] = [];
      if (!departmentIdStr) {
        setCabinets([]);
        return;
      } else {
        const deptId = parseInt(departmentIdStr, 10);
        if (Number.isNaN(deptId)) {
          setCabinets([]);
          return;
        }
        const res = await staffCabinetDepartmentApi.getAll({ departmentId: deptId });
        const mappings = (res as { success?: boolean; data?: unknown[] }).data;
        if (!Array.isArray(mappings)) {
          setCabinets([]);
          return;
        }
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
      setCabinets(next);
      setFilterCabinetId((prev) => {
        if (!prev) return prev;
        const id = parseInt(prev, 10);
        if (Number.isNaN(id)) return '';
        return next.some((c) => c.id === id) ? prev : '';
      });
    } catch {
      setCabinets([]);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
    setFilterDepartmentId('');
    setFilterCabinetId('');
    const start = getTodayDate();
    setFilterStartDate(start);
    setFilterEndDate(start);
    setWillReturnItems([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadCabinetsForFilter(filterDepartmentId);
  }, [filterDepartmentId, loadCabinetsForFilter]);

  useEffect(() => {
    if (departments.length === 0) return;
    setReturnHistoryDepartmentCode((prev) => (prev ? prev : String(departments[0].ID)));
  }, [departments]);

  const fetchDepartments = async () => {
    try {
      const list = await fetchStaffDepartmentsForFilter({ limit: 500 });
      if (list.length > 0) {
        setDepartments(list.map((d) => ({ ID: d.ID, DepName: d.DepName || d.DepName2 || String(d.ID) })));
      }
    } catch {
      // ignore
    }
  };

  const handleWillReturnFilterReset = () => {
    const start = getTodayDate();
    setFilterDepartmentId('');
    setFilterCabinetId('');
    setFilterItemCode('');
    setFilterStartDate(start);
    setFilterEndDate(start);
    setWillReturnItems([]);
  };

  const handleWillReturnSearch = () => {
    if (!filterDepartmentId.trim()) {
      toast.error('กรุณาเลือกแผนก');
      return;
    }
    if (!filterCabinetId.trim()) {
      toast.error('กรุณาเลือกตู้ Cabinet');
      return;
    }
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

  const fetchReturnHistory = async () => {
    try {
      setHistoryLoading(true);
      const params: any = {
        page: returnHistoryPage,
        limit: returnHistoryLimit,
      };
      if (returnHistoryDateFrom) params.date_from = returnHistoryDateFrom;
      if (returnHistoryDateTo) params.date_to = returnHistoryDateTo;
      if (returnHistoryReason && returnHistoryReason !== 'ALL') params.return_reason = returnHistoryReason;
      if (returnHistoryDepartmentCode) params.department_code = returnHistoryDepartmentCode;

      const result = (await staffMedicalSuppliesApi.getReturnHistory(params)) as {
        success?: boolean;
        message?: string;
        data?: any[];
        total?: number;
        page?: number;
        limit?: number;
      };

      console.log(result);
      if (result.success === false) {
        toast.error(result.message || 'ไม่สามารถโหลดประวัติการแจ้งคืนได้');
        setReturnHistoryData({ data: [], total: 0, page: 1, limit: returnHistoryLimit });
        return;
      }
      const list = Array.isArray(result.data) ? result.data : [];
      const totalNum = Number(result.total);
      setReturnHistoryData({
        data: list,
        total: Number.isFinite(totalNum) ? totalNum : list.length,
        page: Number(result.page) || returnHistoryPage,
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
          <TabsList className="grid w-full grid-cols-2 h-11 rounded-lg bg-slate-100 p-1">
            <TabsTrigger
              value="return"
              className="flex items-center gap-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <RotateCcw className="h-4 w-4" />
              แจ้งอุปกรณ์ที่ไม่ถูกใช้งาน
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex items-center gap-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <History className="h-4 w-4" />
              ประวัติการแจ้งอุปกรณ์ที่ไม่ถูกใช้งาน
            </TabsTrigger>
          </TabsList>

          <TabsContent value="return" className="space-y-4">
            <StaffWillReturnFilterCard
              departmentId={filterDepartmentId}
              cabinetId={filterCabinetId}
              itemCode={filterItemCode}
              startDate={filterStartDate}
              endDate={filterEndDate}
              departments={departments}
              cabinets={cabinets}
              onDepartmentChange={setFilterDepartmentId}
              onCabinetChange={setFilterCabinetId}
              onItemCodeChange={setFilterItemCode}
              onStartDateChange={setFilterStartDate}
              onEndDateChange={setFilterEndDate}
              onSearch={handleWillReturnSearch}
              onReset={handleWillReturnFilterReset}
              onRefresh={handleWillReturnSearch}
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
              departments={departments}
              loading={historyLoading}
              onDateFromChange={setReturnHistoryDateFrom}
              onDateToChange={setReturnHistoryDateTo}
              onReasonChange={setReturnHistoryReason}
              onDepartmentChange={setReturnHistoryDepartmentCode}
              onSearch={fetchReturnHistory}
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
