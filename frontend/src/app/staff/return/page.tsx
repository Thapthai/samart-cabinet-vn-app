'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/hooks/useAuth';
import { RotateCcw, History, RefreshCw, Search, ChevronDown, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { staffItemsApi } from '@/lib/staffApi/itemsApi';
import { staffMedicalSuppliesApi } from '@/lib/staffApi/medicalSuppliesApi';
import { staffDepartmentApi } from '@/lib/staffApi/departmentApi';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ReturnHistoryFilter from './components/ReturnHistoryFilter';
import ReturnHistoryTable from './components/ReturnHistoryTable';
import type { ReturnHistoryData } from './types';

const ITEM_PAGE_SIZE = 15;

/** รายการจาก GET /item-stocks/will-return (แยกตามตู้ + ItemCode) */
interface WillReturnItem {
  ItemCode: string;
  StockID?: number;
  cabinet_name?: string | null;
  cabinet_code?: string | null;
  department_id?: number | null;
  department_name?: string | null;
  itemname: string | null;
  withdraw_qty: number;
  used_qty: number;
  return_qty: number;
  max_available_qty: number;
}

export default function ReturnMedicalSuppliesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('return');

  // Departments for filter (ต้องอยู่ก่อน filteredItems useMemo)
  const [departments, setDepartments] = useState<{ ID: number; DepName: string }[]>([]);
  const [staffDepartmentCode, setStaffDepartmentCode] = useState<string>('');
  /** ถ้า role มีคำว่า warehouse ให้เลือกแผนกได้ */
  const [canSelectDepartment, setCanSelectDepartment] = useState(false);

  // รายการจาก /item-stocks/will-return (สรุปตาม ItemCode: max_available_qty)
  const [willReturnItems, setWillReturnItems] = useState<WillReturnItem[]>([]);
  const [loadingWillReturn, setLoadingWillReturn] = useState(false);
  // ฟอร์มแจ้งอุปกรณ์ที่ไม่ถูกใช้งาน (เลือกตาม ItemCode + StockID เพื่อระบุตู้)
  const [selectedItemCode, setSelectedItemCode] = useState<string>('');
  const [selectedStockID, setSelectedStockID] = useState<number | null>(null);
  const [qty, setQty] = useState<number>(1);
  const [reason, setReason] = useState<string>('UNWRAPPED_UNUSED');
  const [note, setNote] = useState<string>('');
  // Dropdown รายการอุปกรณ์: ค้นหา + แบ่งหน้า
  const [itemSearch, setItemSearch] = useState('');
  const [itemDropdownPage, setItemDropdownPage] = useState(0);
  const [itemDropdownOpen, setItemDropdownOpen] = useState(false);
  const itemTriggerRef = useRef<HTMLButtonElement>(null);
  const itemPanelRef = useRef<HTMLDivElement>(null);
  const [itemDropdownRect, setItemDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const filteredItems = useMemo(() => {
    let items = willReturnItems;
    // auto-filter ตามแผนก staff
    if (staffDepartmentCode) {
      const deptId = parseInt(staffDepartmentCode, 10);
      items = items.filter((i) => i.department_id === deptId);
    }
    const q = itemSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        (i.itemname ?? '').toLowerCase().includes(q) ||
        (i.ItemCode ?? '').toLowerCase().includes(q) ||
        (i.cabinet_code ?? '').toLowerCase().includes(q) ||
        (i.cabinet_name ?? '').toLowerCase().includes(q) ||
        (i.department_name ?? '').toLowerCase().includes(q),
    );
  }, [willReturnItems, itemSearch, staffDepartmentCode]);

  const totalItemPages = Math.max(1, Math.ceil(filteredItems.length / ITEM_PAGE_SIZE));
  const paginatedItems = useMemo(
    () =>
      filteredItems.slice(
        itemDropdownPage * ITEM_PAGE_SIZE,
        itemDropdownPage * ITEM_PAGE_SIZE + ITEM_PAGE_SIZE,
      ),
    [filteredItems, itemDropdownPage],
  );

  // ปิด dropdown เมื่อคลิกนอกปุ่มหรือนอก panel (panel อยู่ใน portal)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        itemDropdownOpen &&
        itemTriggerRef.current &&
        !itemTriggerRef.current.contains(target) &&
        itemPanelRef.current &&
        !itemPanelRef.current.contains(target)
      ) {
        setItemDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [itemDropdownOpen]);

  // อัปเดตตำแหน่ง dropdown เมื่อเปิด หรือเมื่อ scroll/resize
  useEffect(() => {
    if (!itemDropdownOpen || !itemTriggerRef.current) {
      setItemDropdownRect(null);
      return;
    }
    const updateRect = () => {
      if (itemTriggerRef.current) {
        const r = itemTriggerRef.current.getBoundingClientRect();
        setItemDropdownRect({ top: r.bottom + 4, left: r.left, width: r.width });
      }
    };
    updateRect();
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [itemDropdownOpen]);

  useEffect(() => {
    setItemDropdownPage(0);
  }, [itemSearch]);

  // Return history (default date from/to = today)
  const [returnHistoryDateFrom, setReturnHistoryDateFrom] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [returnHistoryDateTo, setReturnHistoryDateTo] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [returnHistoryReason, setReturnHistoryReason] = useState<string>('ALL');
  const [returnHistoryDepartmentCode, setReturnHistoryDepartmentCode] = useState<string>('');
  const [returnHistoryData, setReturnHistoryData] = useState<ReturnHistoryData | null>(null);
  const [returnHistoryPage, setReturnHistoryPage] = useState(1);
  const [returnHistoryLimit] = useState(10);

  const loadWillReturnItems = useCallback(async () => {
    try {
      setLoadingWillReturn(true);
      const res = await staffItemsApi.getItemStocksWillReturn();
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
  }, []);

  useEffect(() => {
    loadWillReturnItems();
    // Load staff_user จาก localStorage: department_id และ role (warehouse = เลือกแผนกได้)
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('staff_user');
        if (raw) {
          const staffUser = JSON.parse(raw.trim());
          const roleCode = (staffUser?.role ?? '').toString().toLowerCase();
          if (roleCode.includes('warehouse')) setCanSelectDepartment(true);
          if (staffUser?.department_id) {
            const deptCode = String(staffUser.department_id);
            setStaffDepartmentCode(deptCode);
            setReturnHistoryDepartmentCode(deptCode);
          }
        }
      } catch {
        // ignore
      }
    }
    fetchDepartments();
  }, [loadWillReturnItems]);

  const fetchDepartments = async () => {
    try {
      const res = await staffDepartmentApi.getAll({ limit: 1000 });
      if (res.success && Array.isArray(res.data)) {
        setDepartments(res.data.map((d: any) => ({ ID: d.ID, DepName: d.DepName || d.DepName2 || String(d.ID) })));
      }
    } catch {
      // ignore
    }
  };

  const selectedItem = willReturnItems.find(
    (i) => i.ItemCode === selectedItemCode && (selectedStockID == null || i.StockID === selectedStockID),
  );
  const maxQty = selectedItem?.max_available_qty ?? 0;

  const handleReturnSubmit = async () => {
    if (!selectedItemCode || !selectedItem) {
      toast.error('กรุณาเลือกรายการอุปกรณ์');
      return;
    }
    const qtyToSubmit = Math.min(Math.max(1, qty), maxQty);
    if (qtyToSubmit < 1 || maxQty < 1) {
      toast.error('จำนวนที่แจ้งต้องอยู่ระหว่าง 1 ถึงจำนวนสูงสุดที่สามารถใส่ได้');
      return;
    }

    try {
      setLoading(true);

      const listRes: any = await staffMedicalSuppliesApi.getItemStocksForReturnToCabinet({
        itemCode: selectedItemCode,
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
        return_reason: reason,
        return_note: note?.trim() || undefined,
      }));

      const resp: any = await staffMedicalSuppliesApi.recordStockReturn({
        items,
        return_by_user_id: user?.id != null ? `admin:${user.id}` : undefined,
        ...(selectedItem?.StockID != null && { stock_id: selectedItem.StockID }),
      });

      if (resp?.success) {
        toast.success(
          resp.message ||
          `บันทึกการแจ้งอุปกรณ์ที่ไม่ถูกใช้งาน / ชำรุดสำเร็จ ${resp.updatedCount ?? items.length} รายการ`,
        );
        setSelectedItemCode('');
        setSelectedStockID(null);
        setQty(1);
        setNote('');
        await loadWillReturnItems();
      } else {
        toast.error(resp?.error || 'ไม่สามารถบันทึกการแจ้งอุปกรณ์ได้');
      }
    } catch (error: any) {
      toast.error(`เกิดข้อผิดพลาด: ${error.message || error}`);
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

      const result = await staffMedicalSuppliesApi.getReturnHistory(params);
      if (result.success && result.data) {
        setReturnHistoryData({
          data: result.data,
          total: (result as any).total || 0,
          page: (result as any).page || returnHistoryPage,
          limit: (result as any).limit || returnHistoryLimit,
        });
      } else if (result.data) {
        setReturnHistoryData({
          data: result.data,
          total: (result as any).total || 0,
          page: (result as any).page || returnHistoryPage,
          limit: (result as any).limit || returnHistoryLimit,
        });
      } else {
        toast.error('ไม่สามารถดึงข้อมูลประวัติการคืนได้');
      }
    } catch (error: any) {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') fetchReturnHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, returnHistoryPage]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateString;
    }
  };

  const getReturnReasonLabel = (reason: string) => {
    const labels: { [key: string]: string } = {
      UNWRAPPED_UNUSED: 'ยังไม่ได้แกะซอง หรือยังอยู่ในสภาพเดิม',
      EXPIRED: 'อุปกรณ์หมดอายุ',
      CONTAMINATED: 'อุปกรณ์มีการปนเปื้อน',
      DAMAGED: 'อุปกรณ์ชำรุด',
    };
    return labels[reason] || reason;
  };

  return (
    < >
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
            {/* Filter Card — same style as ReturnHistoryFilter */}
            <Card className="border-0 shadow-sm bg-white rounded-xl overflow-hidden">
              <CardHeader className="border-b bg-slate-50/50 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-100">
                    <Filter className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-slate-800">กรองรายการอุปกรณ์</CardTitle>
                    <CardDescription className="text-slate-500 mt-0.5">
                      แสดงเฉพาะรายการในแผนกของคุณ
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-medium">แผนก</Label>
                    <Button
                      variant="outline"
                      className="w-full justify-between font-normal rounded-lg border-slate-200 cursor-default"
                      type="button"
                      disabled
                    >
                      <span className="truncate">
                        {staffDepartmentCode
                          ? (departments.find((d) => String(d.ID) === staffDepartmentCode)?.DepName ?? `แผนก ${staffDepartmentCode}`)
                          : 'ไม่ระบุแผนก'}
                      </span>
                    </Button>
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={loadWillReturnItems}
                      disabled={loadingWillReturn}
                      className="gap-2 rounded-lg border-slate-200"
                    >
                      <RefreshCw className={`h-4 w-4 ${loadingWillReturn ? 'animate-spin' : ''}`} />
                      รีเฟรช
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="border-b bg-slate-50/50">
                <CardTitle className="text-lg font-semibold text-slate-800">แจ้งอุปกรณ์ที่ไม่ถูกใช้งาน / ชำรุด</CardTitle>
                <CardDescription className="text-slate-500 mt-1">
                  เลือกรายการจากตู้ที่ยังไม่ได้แจ้งอุปกรณ์ที่ไม่ถูกใช้งาน แล้วกดปุ่มด้านล่างเพื่อบันทึก
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {loadingWillReturn ? (
                  <div className="flex items-center justify-center py-10 text-slate-500">
                    <span className="h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mr-3" />
                    กำลังโหลดรายการ...
                  </div>
                ) : willReturnItems.length === 0 ? (
                  <div className="py-10 text-center text-slate-500">
                    ไม่มีรายการที่ต้องแจ้งอุปกรณ์ที่ไม่ถูกใช้งาน
                  </div>
                ) : (
                  <div className="flex flex-wrap items-end gap-4">
                    {/* รายการอุปกรณ์ 40% */}
                    <div className="w-[40%] min-w-0 shrink-0">
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        รายการอุปกรณ์
                      </label>
                      <div>
                        <button
                          ref={itemTriggerRef}
                          type="button"
                          onClick={() => setItemDropdownOpen((o) => !o)}
                          className={cn(
                            'flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm transition-colors hover:border-slate-300',
                            itemDropdownOpen && 'border-emerald-400 ring-2 ring-emerald-500/20',
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate text-slate-800">
                            {selectedItem
                              ? (() => {
                                const name = selectedItem.itemname ?? selectedItem.ItemCode;
                                const cabinet = selectedItem.cabinet_code || selectedItem.cabinet_name;
                                const dept = selectedItem.department_name;
                                if (cabinet || dept)
                                  return `${name} — ตู้ ${cabinet ?? '-'}${dept ? ` (แผนก ${dept})` : ''}`;
                                return name;
                              })()
                              : 'เลือกรายการอุปกรณ์ (ระบุตู้)'}
                          </span>
                          <ChevronDown
                            className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', itemDropdownOpen && 'rotate-180')}
                          />
                        </button>

                        {typeof document !== 'undefined' &&
                          itemDropdownOpen &&
                          itemDropdownRect &&
                          createPortal(
                            <div
                              ref={itemPanelRef}
                              className="fixed z-[9999] w-[320px] rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
                              style={{
                                top: itemDropdownRect.top,
                                left: itemDropdownRect.left,
                              }}
                            >
                              <div className="sticky top-0 w-full border-b border-slate-100 bg-white px-2 py-2">
                                <div className="relative w-full">
                                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                  <Input
                                    placeholder="ค้นหาชื่อ, รหัส, ตู้ หรือแผนก..."
                                    value={itemSearch}
                                    onChange={(e) => setItemSearch(e.target.value)}
                                    className="h-9 w-full border-slate-200 bg-slate-50/50 pl-9 text-sm focus-visible:ring-2"
                                    autoFocus
                                  />
                                </div>
                              </div>
                              <div className="max-h-[280px] overflow-y-auto overscroll-contain">
                                {paginatedItems.length === 0 ? (
                                  <div className="px-3 py-8 text-center text-sm text-slate-500">
                                    ไม่พบรายการ
                                  </div>
                                ) : (
                                  <ul className="py-1">
                                    {paginatedItems.map((item) => {
                                      const isSelected =
                                        item.ItemCode === selectedItemCode &&
                                        (item.StockID == null || item.StockID === selectedStockID);
                                      const cabinetLabel = item.cabinet_code || item.cabinet_name || 'ตู้ไม่ระบุ';
                                      const deptLabel = item.department_name ? `แผนก ${item.department_name}` : '';
                                      return (
                                        <li key={`${item.ItemCode}-${item.StockID ?? 0}`}>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedItemCode(item.ItemCode);
                                              setSelectedStockID(item.StockID ?? null);
                                              setQty(Math.min(qty, item.max_available_qty || 1));
                                              setItemDropdownOpen(false);
                                              setItemSearch('');
                                              setItemDropdownPage(0);
                                            }}
                                            className={cn(
                                              'flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-slate-50',
                                              isSelected && 'bg-emerald-50 hover:bg-emerald-50',
                                            )}
                                          >
                                            <span className="line-clamp-2 text-sm font-medium text-slate-800">
                                              {item.itemname ?? item.ItemCode}
                                            </span>
                                            <span className="text-xs font-medium text-blue-700">
                                              ตู้: {cabinetLabel}
                                              {deptLabel ? ` · ${deptLabel}` : ''}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                              {item.ItemCode} · สูงสุดแจ้งได้ {item.max_available_qty}
                                            </span>
                                          </button>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}
                              </div>
                              {totalItemPages > 1 && (
                                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-3 py-2 text-xs text-slate-500">
                                  <span>
                                    หน้า {itemDropdownPage + 1} / {totalItemPages} ({filteredItems.length} รายการ)
                                  </span>
                                  <div className="flex gap-0.5">
                                    <button
                                      type="button"
                                      onClick={() => setItemDropdownPage((p) => Math.max(0, p - 1))}
                                      disabled={itemDropdownPage === 0}
                                      className="rounded p-1.5 hover:bg-slate-200 disabled:opacity-40"
                                    >
                                      <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setItemDropdownPage((p) => Math.min(totalItemPages - 1, p + 1))
                                      }
                                      disabled={itemDropdownPage >= totalItemPages - 1}
                                      className="rounded p-1.5 hover:bg-slate-200 disabled:opacity-40"
                                    >
                                      <ChevronRight className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>,
                            document.body,
                          )}
                      </div>
                    </div>

                    {/* จำนวน 10% */}
                    <div className="w-[10%] min-w-0 shrink-0">
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        จำนวน (สูงสุด {maxQty})
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={maxQty}
                        value={qty}
                        onChange={(e) =>
                          setQty(Math.min(maxQty, Math.max(1, parseInt(e.target.value, 10) || 1)))
                        }
                        className="rounded-lg border-slate-200"
                      />
                    </div>

                    {/* สาเหตุ 20% */}
                    <div className="w-[20%] min-w-0 shrink-0 [&_[data-slot=select-trigger]]:w-full">
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">สาเหตุ</label>
                      <Select value={reason} onValueChange={setReason}>
                        <SelectTrigger className="w-full rounded-lg border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UNWRAPPED_UNUSED">
                            ยังไม่ได้แกะซอง / อยู่ในสภาพเดิม
                          </SelectItem>
                          <SelectItem value="EXPIRED">อุปกรณ์หมดอายุ</SelectItem>
                          <SelectItem value="CONTAMINATED">อุปกรณ์มีการปนเปื้อน</SelectItem>
                          <SelectItem value="DAMAGED">อุปกรณ์ชำรุด</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* หมายเหตุ (ถ้ามี) 20% */}
                    <div className="w-[15%] min-w-0 shrink-0">
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        หมายเหตุ (ถ้ามี)
                      </label>
                      <Input
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="รายละเอียดเพิ่มเติม"
                        className="w-full rounded-lg border-slate-200"
                      />
                    </div>

                    {/* ปุ่มบันทึก 10% */}
                    <button
                      type="button"
                      onClick={handleReturnSubmit}
                      disabled={loading || !selectedItemCode || maxQty < 1}
                      className="inline-flex w-[10%] min-w-0 shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-2 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          กำลังบันทึก...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-4 w-4" />
                          แจ้งอุปกรณ์
                        </>
                      )}
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <ReturnHistoryFilter
              dateFrom={returnHistoryDateFrom}
              dateTo={returnHistoryDateTo}
              reason={returnHistoryReason}
              departmentCode={returnHistoryDepartmentCode}
              departments={departments}
              departmentDisabled={!!staffDepartmentCode && !canSelectDepartment}
              loading={historyLoading}
              onDateFromChange={setReturnHistoryDateFrom}
              onDateToChange={setReturnHistoryDateTo}
              onReasonChange={setReturnHistoryReason}
              onDepartmentChange={setReturnHistoryDepartmentCode}
              onSearch={fetchReturnHistory}
            />
            {returnHistoryData && (
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
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
