'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer, Zap, LayoutList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { cabinetApi, cabinetDepartmentApi, departmentApi, itemsApi, itemStockApi, stickerPrintApi } from '@/lib/api';
import type { Item } from '@/types/item';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import SearchableSelect from '@/app/admin/cabinet-departments/components/SearchableSelect';
import { PrintStickerItemListCard } from './components/PrintStickerItemListCard';
import { PrintStickerOrderCard } from './components/PrintStickerOrderCard';
import {
  AUTO_FETCH_LIMIT,
  MAX_PRINT,
  MAX_TOTAL_LABELS,
  PAGE_SIZE,
} from './constants';
import type { SelectedLine } from './types';
import { clampCopies } from './utils';

type CabinetDepartmentMapping = {
  id: number;
  cabinet_id: number;
  department_id: number;
  status?: string;
  cabinet?: {
    id: number;
    cabinet_name?: string;
    cabinet_code?: string;
    cabinet_status?: string;
  };
};

function mapCabinetFromMapping(cabinet: CabinetDepartmentMapping['cabinet']) {
  if (!cabinet || typeof cabinet.id !== 'number') return null;
  return {
    id: cabinet.id,
    cabinet_name: cabinet.cabinet_name,
    cabinet_code: cabinet.cabinet_code,
    cabinet_status: cabinet.cabinet_status,
  };
}

type DepartmentOpt = { ID: number; DepName?: string; DepName2?: string };
type CabinetOpt = { id: number; cabinet_name?: string; cabinet_code?: string; cabinet_status?: string };

function manualRefillCap(row: Item): number {
  void row;
  // Manual ไม่จำกัดเพดานต่อรายการจาก refill/max ของตู้
  // จำกัดสูงสุดด้วยเพดานระบบต่อคำขอแทน (MAX_TOTAL_LABELS)
  return MAX_TOTAL_LABELS;
}

type PrintStickerWorkspaceProps = {
  variant?: 'admin' | 'staff';
};

export default function PrintStickerWorkspace({ variant = 'admin' }: PrintStickerWorkspaceProps) {
  type PreparedStockRow = { RowID: number; ItemCode?: string | null; RfidCode?: string | null };

  const [mode, setMode] = useState<'auto' | 'manual'>('manual');

  const [departments, setDepartments] = useState<DepartmentOpt[]>([]);
  const [cabinets, setCabinets] = useState<CabinetOpt[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCabinets, setLoadingCabinets] = useState(false);

  const [departmentId, setDepartmentId] = useState('');
  const [cabinetId, setCabinetId] = useState('');
  const [cabinetStockId, setCabinetStockId] = useState<number | null>(null);

  const [items, setItems] = useState<Item[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const [activeKeyword, setActiveKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [selectedLines, setSelectedLines] = useState<SelectedLine[]>([]);
  const selectedItemcodes = useMemo(() => new Set(selectedLines.map((l) => l.itemcode)), [selectedLines]);

  const [printing, setPrinting] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [preparedRows, setPreparedRows] = useState<PreparedStockRow[]>([]);
  const [selectedPreparedRowIds, setSelectedPreparedRowIds] = useState<number[]>([]);
  const [deletingPrepared, setDeletingPrepared] = useState(false);

  const displayItems = useMemo(() => {
    if (mode !== 'auto') return items;
    return items.filter((i) => (i.refill_qty ?? 0) > 0);
  }, [items, mode]);

  const listTotal = mode === 'auto' ? displayItems.length : total;
  const listTotalPages = mode === 'auto' ? 1 : totalPages;
  const hidePagination = mode === 'auto';

  const loadDepartments = useCallback(async (keyword?: string) => {
    try {
      setLoadingDepartments(true);
      const response = await departmentApi.getAll({ limit: 80, keyword });
      if (response.success && response.data) {
        setDepartments(response.data as DepartmentOpt[]);
      }
    } catch {
      toast.error('โหลด Division ไม่สำเร็จ');
    } finally {
      setLoadingDepartments(false);
    }
  }, []);

  const resolveCabinets = useCallback(async (departmentIdStr: string, keyword?: string) => {
    try {
      setLoadingCabinets(true);
      let next: CabinetOpt[] = [];
      if (!departmentIdStr) {
        setCabinets([]);
        return;
      }
      const deptId = parseInt(departmentIdStr, 10);
      if (Number.isNaN(deptId)) {
        setCabinets([]);
        return;
      }
      const response = await cabinetDepartmentApi.getAll({
        departmentId: deptId,
        keyword: keyword || undefined,
      });
      if (response.success && response.data) {
        const mappings = response.data as CabinetDepartmentMapping[];
        const unique = new Map<number, CabinetOpt>();
        mappings
          .filter((mapping) => mapping.status === 'ACTIVE')
          .forEach((mapping) => {
            const mapped = mapCabinetFromMapping(mapping.cabinet);
            if (mapped && !unique.has(mapped.id)) unique.set(mapped.id, mapped);
          });
        next = Array.from(unique.values());
      }
      setCabinets(next);
    } catch {
      toast.error('โหลดตู้ไม่สำเร็จ');
      setCabinets([]);
    } finally {
      setLoadingCabinets(false);
    }
  }, []);

  useEffect(() => {
    void loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    void resolveCabinets(departmentId);
  }, [departmentId, resolveCabinets]);

  useEffect(() => {
    if (cabinetId && cabinets.length > 0) {
      const ok = cabinets.some((c) => c.id.toString() === cabinetId);
      if (!ok) setCabinetId('');
    }
  }, [cabinets, cabinetId]);

  useEffect(() => {
    let cancelled = false;
    async function loadStock() {
      if (!cabinetId) {
        setCabinetStockId(null);
        return;
      }
      const id = parseInt(cabinetId, 10);
      if (Number.isNaN(id)) {
        setCabinetStockId(null);
        return;
      }
      try {
        const res = await cabinetApi.getById(id);
        const sid = res?.data?.stock_id;
        const n = typeof sid === 'number' ? sid : null;
        if (!cancelled) setCabinetStockId(n ?? null);
      } catch {
        if (!cancelled) setCabinetStockId(null);
      }
    }
    void loadStock();
    return () => {
      cancelled = true;
    };
  }, [cabinetId]);

  useEffect(() => {
    setPage(1);
    setKeywordInput('');
    setActiveKeyword('');
    setSelectedLines([]);
    setItems([]);
    setTotal(0);
    setTotalPages(1);
    setCabinetId('');
    setCabinetStockId(null);
  }, [departmentId]);

  const buildLineFromRow = useCallback(
    (row: Item, copies: number, refillCap: number): SelectedLine => ({
      itemcode: row.itemcode,
      itemname: (row.itemname ?? '—').trim() || '—',
      copies: refillCap <= 0 ? 0 : clampCopies(copies, refillCap),
      refillCap,
      expireDate: '',
      lotNo: '',
      SubUnitQty: row.SubUnitQty,
      unit: row.unit,
      subUnit: row.subUnit,
    }),
    [],
  );

  const fetchCabinetItems = useCallback(async () => {
    // Manual — รายการ Item ทั้งระบบ: ต้องปล่อย Division + ตู้ ว่างทั้งคู่
    if (mode === 'manual' && !departmentId && !cabinetId) {
      try {
        setLoadingList(true);
        const res = (await itemsApi.getMasterList({
          page,
          limit: PAGE_SIZE,
          sort_by: 'itemcode',
          sort_order: 'asc',
          item_status_filter: 'active',
          ...(activeKeyword.trim() ? { keyword: activeKeyword.trim() } : {}),
        })) as {
          success?: boolean;
          data?: Item[];
          total?: number;
          lastPage?: number;
          message?: string;
        };
        if (res?.success === false) {
          toast.error(res.message || 'โหลดรายการไม่สำเร็จ');
          setItems([]);
          setTotal(0);
          setTotalPages(1);
          return;
        }
        const list = Array.isArray(res?.data) ? res.data : [];
        const t = res?.total ?? list.length;
        setItems(list);
        setTotal(t);
        setTotalPages(res?.lastPage ?? Math.max(1, Math.ceil(t / PAGE_SIZE)));
      } catch {
        toast.error('โหลดรายการไม่สำเร็จ');
        setItems([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        setLoadingList(false);
      }
      return;
    }

    // Manual — เลือกกรองแต่ยังไม่ครบ
    if (mode === 'manual' && departmentId && !cabinetId) {
      toast.error('เลือกตู้ให้ครบ หรือกดล้าง Division/ตู้ เพื่อโหลดรายการ Item ทั้งหมด');
      return;
    }

    if (!departmentId || !cabinetId) {
      toast.error('เลือก Division และตู้');
      return;
    }
    const dep = parseInt(departmentId, 10);
    const cab = parseInt(cabinetId, 10);
    if (Number.isNaN(dep) || Number.isNaN(cab)) {
      toast.error('Division หรือตู้ไม่ถูกต้อง');
      return;
    }

    // Manual + เลือกตู้แล้ว: ใช้รายการแบบหน้า Items (มี RFID / meta ครบ)
    // — ไม่ใช้ endpoint slot เพราะของในตู้อาจไม่มีใน itemslotincabinet
    if (mode === 'manual') {
      try {
        setLoadingList(true);
        const res = (await itemsApi.getAll({
          page,
          limit: PAGE_SIZE,
          cabinet_id: cab,
          department_id: dep,
          status: 'ACTIVE',
          sort_by: 'itemcode',
          sort_order: 'asc',
          ...(activeKeyword.trim() ? { keyword: activeKeyword.trim() } : {}),
        })) as {
          success?: boolean;
          data?: Item[];
          total?: number;
          lastPage?: number;
          message?: string;
        };

        if (res?.success === false) {
          toast.error(res.message || 'โหลดรายการในตู้ไม่สำเร็จ');
          setItems([]);
          setTotal(0);
          setTotalPages(1);
          return;
        }

        const list = Array.isArray(res?.data) ? res.data : [];
        const t = res?.total ?? list.length;
        setItems(list);
        setTotal(t);
        setTotalPages(res?.lastPage ?? Math.max(1, Math.ceil(t / PAGE_SIZE)));
      } catch {
        toast.error('โหลดรายการในตู้ไม่สำเร็จ');
        setItems([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        setLoadingList(false);
      }
      return;
    }

    try {
      setLoadingList(true);
      const res = (await itemsApi.getCabinetSlotItems({
        page: 1,
        limit: AUTO_FETCH_LIMIT,
        cabinet_id: cab,
        department_id: dep,
        ...(activeKeyword.trim() ? { keyword: activeKeyword.trim() } : {}),
      })) as {
        success?: boolean;
        data?: Item[];
        total?: number;
        lastPage?: number;
        message?: string;
      };

      if (res?.success === false) {
        toast.error(res.message || 'โหลดรายการไม่สำเร็จ');
        setItems([]);
        setTotal(0);
        setTotalPages(1);
        return;
      }

      let list = Array.isArray(res?.data) ? res.data : [];

      // ถ้า endpoint slot ไม่คืนรายการที่ต้องเติมเลย → fallback ไปใช้รายการที่คำนวณ refill_qty
      if (list.filter((i) => Number(i.refill_qty ?? 0) > 0).length === 0) {
        const fallback = (await itemsApi.getAll({
          page: 1,
          limit: AUTO_FETCH_LIMIT,
          cabinet_id: cab,
          department_id: dep,
          status: 'ACTIVE',
          sort_by: 'itemcode',
          sort_order: 'asc',
          ...(activeKeyword.trim() ? { keyword: activeKeyword.trim() } : {}),
        })) as {
          success?: boolean;
          data?: Item[];
          total?: number;
          lastPage?: number;
          message?: string;
        };

        if (fallback?.success !== false) {
          list = Array.isArray(fallback?.data) ? fallback.data : list;
        }
      }

      setItems(list);
      setTotal(list.filter((i) => Number(i.refill_qty ?? 0) > 0).length);
      setTotalPages(1);

      const need = list.filter((i) => Number(i.refill_qty ?? 0) > 0);
      setSelectedLines(
        need.map((row) =>
          buildLineFromRow(
            row,
            Math.max(1, Number(row.refill_qty ?? 0)),
            Math.max(0, Number(row.refill_qty ?? 0)),
          ),
        ),
      );
    } catch {
      toast.error('โหลดรายการไม่สำเร็จ');
      setItems([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoadingList(false);
    }
  }, [departmentId, cabinetId, mode, page, activeKeyword, buildLineFromRow]);

  useEffect(() => {
    const manualAllItems = mode === 'manual' && !departmentId && !cabinetId;
    if (manualAllItems) {
      void fetchCabinetItems();
      return;
    }
    // โหลดจากตู้ทันทีเมื่อเลือก Division + ตู้ (ไม่ต้องรอ stock_id — ใช้แค่ตอนบันทึกเตรียมพิมพ์)
    if (!departmentId || !cabinetId) {
      return;
    }
    void fetchCabinetItems();
  }, [mode, departmentId, cabinetId, page, activeKeyword, fetchCabinetItems]);

  const toggleRow = (row: Item) => {
    const code = row.itemcode;
    if (mode === 'auto') {
      const ref = Math.max(0, Number(row.refill_qty ?? 0));
      if (ref <= 0) return;
      setSelectedLines((prev) => {
        const i = prev.findIndex((l) => l.itemcode === code);
        if (i >= 0) return prev.filter((l) => l.itemcode !== code);
        return [
          ...prev,
          buildLineFromRow(row, Math.max(1, ref), ref),
        ];
      });
      return;
    }

    const cap = manualRefillCap(row);
    setSelectedLines((prev) => {
      const i = prev.findIndex((l) => l.itemcode === code);
      if (i >= 0) return prev.filter((l) => l.itemcode !== code);
      return [...prev, buildLineFromRow(row, 1, cap)];
    });
  };

  const selectAllOnPage = () => {
    const capFor = mode === 'auto' ? (r: Item) => Math.max(0, Number(r.refill_qty ?? 0)) : manualRefillCap;
    setSelectedLines((prev) => {
      const have = new Set(prev.map((l) => l.itemcode));
      const next = [...prev];
      for (const row of displayItems) {
        const ref = mode === 'auto' ? Number(row.refill_qty ?? 0) : 0;
        if (mode === 'auto' && ref <= 0) continue;
        if (!have.has(row.itemcode)) {
          const cap = capFor(row);
          if (cap <= 0) continue;
          have.add(row.itemcode);
          next.push(
            buildLineFromRow(
              row,
              mode === 'auto' ? Math.max(1, ref) : 1,
              cap,
            ),
          );
        }
      }
      return next;
    });
  };

  const clearSelectionOnPage = () => {
    const onPage = new Set(displayItems.map((i) => i.itemcode));
    setSelectedLines((prev) => prev.filter((l) => !onPage.has(l.itemcode)));
  };

  const setCopiesFor = (itemcode: string, raw: number) => {
    setSelectedLines((prev) =>
      prev.map((l) => {
        if (l.itemcode !== itemcode) return l;
        return { ...l, copies: clampCopies(raw, l.refillCap) };
      }),
    );
  };

  const setExpireDateFor = (itemcode: string, ymd: string) => {
    setSelectedLines((prev) =>
      prev.map((l) => (l.itemcode === itemcode ? { ...l, expireDate: ymd } : l)),
    );
  };

  const setLotNoFor = (itemcode: string, lotNo: string) => {
    const v = lotNo.slice(0, 50);
    setSelectedLines((prev) =>
      prev.map((l) => (l.itemcode === itemcode ? { ...l, lotNo: v } : l)),
    );
  };

  const removeLine = (itemcode: string) => {
    setSelectedLines((prev) => prev.filter((l) => l.itemcode !== itemcode));
  };

  const handleSearch = () => {
    setActiveKeyword(keywordInput);
    setPage(1);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const departmentSelectOptions = useMemo(
    () => [
      {
        value: '',
        label: '— ไม่เลือก Division —',
        subLabel:
          mode === 'manual'
            ? 'โหลดรายการ Item ที่ใช้งาน (ไม่กรองตามแผนก/ตู้)'
            : 'ในโหมด Auto ต้องเลือก Division จริง',
      },
      ...departments.map((d) => ({
        value: String(d.ID),
        label: `${d.DepName ?? ''} ${d.DepName2 ? `(${d.DepName2})` : ''}`.trim() || `ID ${d.ID}`,
        subLabel: `ID ${d.ID}`,
      })),
    ],
    [mode, departments],
  );

  const cabOptions = cabinets.map((c) => ({
    value: String(c.id),
    label: `${c.cabinet_name ?? c.cabinet_code ?? 'ตู้'}`.trim(),
    subLabel: c.cabinet_code ?? undefined,
  }));

  const buildLinesWithCopies = () => {
    const hasFilter = Boolean(departmentId && cabinetId);
    const depNum = departmentId ? parseInt(departmentId, 10) : undefined;

    let targetStockId = 0;
    if (hasFilter) {
      if (!cabinetStockId || cabinetStockId <= 0) {
        toast.error('ตู้นี้ยังไม่มี stock_id — ใช้เตรียมพิมพ์จากตู้นี้ไม่ได้');
        return null;
      }
      targetStockId = cabinetStockId;
    } else if (mode === 'auto') {
      toast.error('โหมด Auto ต้องเลือก Division และตู้ก่อน');
      return null;
    }

    if (selectedLines.length === 0) {
      toast.error('เลือกอย่างน้อย 1 รายการ');
      return null;
    }
    if (selectedLines.length > MAX_PRINT) {
      toast.error(`เลือกได้ไม่เกิน ${MAX_PRINT} รายการต่อครั้ง`);
      return null;
    }

    const linesWithCopies = selectedLines
      .map((l) => {
        const copies = clampCopies(l.copies, l.refillCap);
        const exp = (l.expireDate ?? '').trim();
        const lot = (l.lotNo ?? '').trim();
        return {
          itemcode: l.itemcode,
          copies,
          stock_id: targetStockId,
          ...(exp ? { expire_date: exp } : {}),
          ...(lot ? { lot_no: lot.slice(0, 50) } : {}),
        };
      })
      .filter((l) => l.copies > 0);

    if (linesWithCopies.length === 0) {
      toast.error('ไม่มีแผ่นที่พิมพ์ได้ — ตรวจสอบจำนวนและเพดานต่อรายการ');
      return null;
    }

    const totalSheets = linesWithCopies.reduce((s, l) => s + l.copies, 0);
    if (totalSheets > MAX_TOTAL_LABELS) {
      toast.error(`จำนวนฉลากรวมเกิน ${MAX_TOTAL_LABELS} แผ่น (ตอนนี้รวม ${totalSheets})`);
      return null;
    }

    return {
      lines: linesWithCopies,
      department_id: hasFilter && depNum && Number.isFinite(depNum) ? depNum : undefined,
    };
  };

  const handlePrepare = async () => {
    const built = buildLinesWithCopies();
    if (!built) return;

    try {
      setPreparing(true);
      const stockRes = await itemStockApi.createForPrintByStock({
        ...(built.department_id ? { department_id: built.department_id } : {}),
        lines: built.lines.map(
          ({ itemcode, stock_id, copies, expire_date, lot_no }) => ({
            itemcode,
            stock_id,
            copies,
            ...(expire_date ? { expire_date } : {}),
            ...(lot_no ? { lot_no } : {}),
          }),
        ),
      });

      if (stockRes?.success === false) {
        const msg =
          typeof stockRes.message === 'string'
            ? stockRes.message
            : stockRes.error ?? 'บันทึก stock ไม่สำเร็จ';
        toast.error(msg);
        return;
      }

      const createdRows = (stockRes?.data?.rows ?? []).map((r) => ({
        RowID: Number(r.RowID),
        ItemCode: r.ItemCode ?? null,
        RfidCode: r.RfidCode ?? null,
      }));
      setPreparedRows(createdRows);
      setSelectedPreparedRowIds(createdRows.map((r) => r.RowID));
      toast.success(`บันทึก itemstock สำเร็จ ${createdRows.length} แถว`);
      setSelectedLines([]);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message ??
        (e as Error)?.message ??
        'บันทึก itemstock ไม่สำเร็จ';
      const text = Array.isArray(msg) ? msg.join(', ') : String(msg);
      toast.error(text);
    } finally {
      setPreparing(false);
    }
  };

  const handleDeletePrepared = async () => {
    if (selectedPreparedRowIds.length === 0) {
      toast.error('เลือกแถวที่ต้องการลบก่อน');
      return;
    }
    try {
      setDeletingPrepared(true);
      const res = await itemStockApi.deleteForPrintRows(selectedPreparedRowIds);
      if (res?.success === false) {
        toast.error(res.message || res.error || 'ลบรายการไม่สำเร็จ');
        return;
      }

      const deleted = new Set(selectedPreparedRowIds);
      const nextRows = preparedRows.filter((r) => !deleted.has(r.RowID));
      setPreparedRows(nextRows);
      setSelectedPreparedRowIds(nextRows.map((r) => r.RowID));
      toast.success(`ลบสำเร็จ ${res?.data?.count ?? selectedPreparedRowIds.length} แถว`);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message ??
        (e as Error)?.message ??
        'ลบรายการไม่สำเร็จ';
      const text = Array.isArray(msg) ? msg.join(', ') : String(msg);
      toast.error(text);
    } finally {
      setDeletingPrepared(false);
    }
  };

  const handlePrint = async () => {
    if (preparedRows.length === 0) {
      toast.error('ยังไม่มีรายการที่บันทึกไว้สำหรับพิมพ์');
      return;
    }

    const grouped = new Map<string, number>();
    for (const row of preparedRows) {
      const code = row.ItemCode?.trim();
      if (!code) continue;
      grouped.set(code, (grouped.get(code) ?? 0) + 1);
    }
    const payloadItems = [...grouped.entries()].map(([itemcode, copies]) => ({ itemcode, copies }));
    if (payloadItems.length === 0) {
      toast.error('ไม่มี itemcode ที่พิมพ์ได้ในรายการที่บันทึก');
      return;
    }

    try {
      setPrinting(true);
      const res = await stickerPrintApi.printLabelItems({ items: payloadItems });
      toast.success(res.message, {
        description: `${res.lineCount} แถว · ${res.count} แผ่น · ${res.totalBytesSent} bytes → ${res.host}:${res.port} · ${res.template} · ${new Date(res.printedAt).toLocaleString('th-TH')}`,
      });
      setPreparedRows([]);
      setSelectedPreparedRowIds([]);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message ??
        (e as Error)?.message ??
        'ส่งพิมพ์ไม่สำเร็จ';
      const text = Array.isArray(msg) ? msg.join(', ') : String(msg);
      toast.error(text);
    } finally {
      setPrinting(false);
    }
  };

  useEffect(() => {
    setPage(1);
    setKeywordInput('');
    setActiveKeyword('');
    setSelectedLines([]);
  }, [mode]);

  const manualShowsAllItems = mode === 'manual' && !departmentId && !cabinetId;
  const manualFilterIncomplete = mode === 'manual' && !!departmentId && !cabinetId;
  const cabinetPairSelected = !!departmentId && !!cabinetId;

  const reloadButtonLabel = (() => {
    if (loadingList) return 'กำลังโหลด…';
    if (manualShowsAllItems) return 'โหลดรายการ Item';
    return 'โหลดรายการจากตู้';
  })();

  const reloadDisabled =
    loadingList ||
    (mode === 'auto' && !cabinetPairSelected) ||
    manualFilterIncomplete;

  return (
    <div className="flex w-full flex-col gap-6">
      {variant === 'staff' ? (
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="shrink-0 -ml-2">
            <Link href="/staff/management" aria-label="กลับการจัดการ">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 p-2.5 shadow-lg">
            <Printer className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">พิมพ์สติ๊กเกอร์</h1>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 p-2.5 shadow-lg">
            <Printer className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">พิมพ์สติ๊กเกอร์</h1>
          </div>
        </div>
      )}

      <Card className="border-slate-200 shadow-sm">

        <CardContent className="flex flex-col gap-6 pt-1">
          <div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMode('auto')}
                className={cn(
                  'flex gap-3 rounded-xl border bg-background p-3.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  mode === 'auto'
                    ? 'border-primary bg-primary/[0.06] shadow-sm ring-2 ring-primary/15'
                    : 'border-slate-200 hover:bg-muted/40',
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                  <Zap className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 space-y-0.5">
                  <span className="block text-lg font-medium text-slate-900">Auto</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={cn(
                  'flex gap-3 rounded-xl border bg-background p-3.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  mode === 'manual'
                    ? 'border-primary bg-primary/[0.06] shadow-sm ring-2 ring-primary/15'
                    : 'border-slate-200 hover:bg-muted/40',
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <LayoutList className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 space-y-0.5">
                  <span className="block text-lg font-medium text-slate-900">Manual</span>
                </span>
              </button>
            </div>
          </div>

          <div
            className={cn(
              'rounded-xl border px-4 py-4 transition-colors sm:px-5',
              mode === 'auto' ? 'border-amber-200/90 bg-amber-50/40' : 'border-slate-200 bg-slate-50/60',
            )}
          >
            <div className="mb-3 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
              <p className="text-sm font-semibold text-slate-900">
                {mode === 'auto' ? 'ระบุ Division และตู้' : 'กรองตู้'}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <SearchableSelect
                label={
                  mode === 'auto'
                    ? 'Division'
                    : 'Division'
                }
                placeholder={mode === 'manual' ? 'ไม่เลือก = โหลด Item ใช้งาน' : 'เลือก Division'}
                value={departmentId}
                required={mode === 'auto'}
                allowClear={mode === 'manual'}
                clearLabel="ไม่เลือก"
                onValueChange={(v) => setDepartmentId(v)}
                options={departmentSelectOptions}
                loading={loadingDepartments}
                onSearch={(kw) => void loadDepartments(kw)}
              />
              <SearchableSelect
                label={
                  mode === 'auto'
                    ? 'ตู้'
                    : 'ตู้'
                }
                placeholder={
                  departmentId ? 'เลือกตู้' : mode === 'manual' ? 'เลือก Division' : 'เลือก Division ก่อน'
                }
                value={cabinetId}
                required={mode === 'auto'}
                disabled={!departmentId}
                allowClear={mode === 'manual' && !!departmentId}
                clearLabel="ไม่เลือก"
                onValueChange={(v) => setCabinetId(v)}
                options={cabOptions}
                loading={loadingCabinets}
                onSearch={(kw) =>
                  departmentId ? void resolveCabinets(departmentId, kw) : undefined
                }
              />
            </div>
            {(mode === 'auto' || cabinetId) && (
              <div className="mt-3 rounded-md bg-background/80 px-3 py-2 text-xs text-muted-foreground">
                {cabinetStockId != null ? (
                  <span>
                    Stock ID ตู้:{' '}
                    <span className="font-mono font-medium text-slate-800">{cabinetStockId}</span>
                  </span>
                ) : cabinetId ? (
                  <span className="text-amber-800">
                    กำลังโหลด Stock ID...
                  </span>
                ) : mode === 'auto' ? (
                  <span>เลือกตู้เมื่อเลือก Division แล้ว</span>
                ) : null}
              </div>
            )}
            {manualFilterIncomplete && (
              <p className="mt-2 text-xs font-medium text-amber-900">
                เลือก Division อยู่ — ให้เลือกตู้ให้ครบ
              </p>
            )}
          </div>

          <div className="flex justify-end border-t pt-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0"
              disabled={reloadDisabled}
              onClick={() => void fetchCabinetItems()}
            >
              {reloadButtonLabel}
            </Button>
          </div>
        </CardContent>
      </Card>

      <PrintStickerItemListCard
        items={displayItems}
        loadingList={loadingList}
        total={listTotal}
        page={mode === 'auto' ? 1 : page}
        totalPages={listTotalPages}
        keywordInput={keywordInput}
        onKeywordInputChange={setKeywordInput}
        onSearch={handleSearch}
        onRefresh={fetchCabinetItems}
        onSelectAllOnPage={selectAllOnPage}
        onClearSelectionOnPage={clearSelectionOnPage}
        onPageChange={handlePageChange}
        selectedItemcodes={selectedItemcodes}
        onToggleRow={toggleRow}
        variant="cabinet"
        hidePagination={hidePagination}
      />

      <PrintStickerOrderCard
        selectedLines={selectedLines}
        preparing={preparing}
        emptyHint={
          mode === 'auto'
            ? 'โหลดแล้วแต่ยังไม่มีรายการต้องเติม (หรือ Max=0)'
            : 'ยังไม่มีรายการ — ติ๊กเวชภัณฑ์จากตารางในตู้'
        }
        onSetCopies={setCopiesFor}
        onExpireDateChange={setExpireDateFor}
        onLotNoChange={setLotNoFor}
        onRemoveLine={removeLine}
        onClearAll={() => setSelectedLines([])}
        onPrepare={handlePrepare}
      />

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardDescription>ลบรายการที่ไม่ต้องการก่อน</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {preparedRows.length === 0 ? (
            <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
              ยังไม่มีรายการที่บันทึกไว้
            </p>
          ) : (
            <div className="max-h-[360px] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">เลือก</TableHead>
                    <TableHead className="w-[120px]">RowID</TableHead>
                    <TableHead>itemcode</TableHead>
                    <TableHead>RFID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preparedRows.map((r) => {
                    const checked = selectedPreparedRowIds.includes(r.RowID);
                    return (
                      <TableRow key={r.RowID}>
                        <TableCell>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              setSelectedPreparedRowIds((prev) =>
                                v ? [...prev, r.RowID] : prev.filter((id) => id !== r.RowID),
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.RowID}</TableCell>
                        <TableCell className="font-mono text-xs">{r.ItemCode ?? '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{r.RfidCode ?? '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleDeletePrepared}
              disabled={deletingPrepared || selectedPreparedRowIds.length === 0}
            >
              {deletingPrepared ? 'กำลังลบ…' : 'ลบที่เลือก'}
            </Button>
            <Button onClick={handlePrint} disabled={printing || preparing || preparedRows.length === 0}>
              {printing ? 'กำลังส่ง…' : `พิมพ์จากรายการที่บันทึกแล้ว (${preparedRows.length})`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
