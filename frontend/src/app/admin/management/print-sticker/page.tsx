'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { itemsApi, itemStockApi, stickerPrintApi } from '@/lib/api';
import type { Item } from '@/types/item';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { PrintStickerItemListCard } from './components/PrintStickerItemListCard';
import { PrintStickerOrderCard } from './components/PrintStickerOrderCard';
import { PAGE_SIZE, MAX_PRINT, MAX_TOTAL_LABELS, MAX_COPIES_WHEN_NO_REFILL } from './constants';
import type { SelectedLine } from './types';
import { clampCopies, maxCopiesFromRefillLookup } from './utils';

export default function AdminPrintStickerPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [keywordInput, setKeywordInput] = useState('');
  const [activeKeyword, setActiveKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [selectedLines, setSelectedLines] = useState<SelectedLine[]>([]);
  const selectedItemcodes = new Set(selectedLines.map((l) => l.itemcode));

  const [printing, setPrinting] = useState(false);
  const [fetchingItemcode, setFetchingItemcode] = useState<string | null>(null);

  const refreshRefillForLine = useCallback(async (itemcode: string, departmentId: string, cabinetId: string) => {
    if (!departmentId || !cabinetId) {
      setSelectedLines((prev) =>
        prev.map((l) =>
          l.itemcode === itemcode
            ? {
                ...l,
                refillCap: MAX_COPIES_WHEN_NO_REFILL,
                copies: clampCopies(l.copies, MAX_COPIES_WHEN_NO_REFILL),
              }
            : l,
        ),
      );
      return;
    }

    const deptId = parseInt(departmentId, 10);
    const cabId = parseInt(cabinetId, 10);
    if (Number.isNaN(deptId) || Number.isNaN(cabId)) return;

    setFetchingItemcode(itemcode);
    try {
      const res = (await itemsApi.getAll({
        page: 1,
        limit: 100,
        keyword: itemcode,
        department_id: deptId,
        cabinet_id: cabId,
        status: 'ACTIVE',
        sort_by: 'itemcode',
        sort_order: 'asc',
      })) as {
        success?: boolean;
        data?: Item[];
        message?: string;
      };

      if (res?.success === false) {
        toast.error(res.message || 'โหลดข้อมูลตู้ไม่สำเร็จ');
        return;
      }

      const list = Array.isArray(res?.data) ? res.data : [];
      const row = list.find((i) => i.itemcode === itemcode);
      const cap = maxCopiesFromRefillLookup(row);
      setSelectedLines((prev) =>
        prev.map((l) =>
          l.itemcode === itemcode ? { ...l, refillCap: cap, copies: clampCopies(l.copies, cap) } : l,
        ),
      );
    } catch {
      toast.error('โหลดจำนวนเติมไม่สำเร็จ');
    } finally {
      setFetchingItemcode(null);
    }
  }, []);

  const onLineDepartmentChange = (itemcode: string, departmentId: string) => {
    setSelectedLines((prev) =>
      prev.map((l) =>
        l.itemcode === itemcode
          ? {
              ...l,
              departmentId,
              cabinetId: '',
              refillCap: MAX_COPIES_WHEN_NO_REFILL,
              copies: clampCopies(l.copies, MAX_COPIES_WHEN_NO_REFILL),
            }
          : l,
      ),
    );
  };

  const onLineCabinetChange = (itemcode: string, cabinetId: string) => {
    setSelectedLines((prev) => {
      const next = prev.map((l) => {
        if (l.itemcode !== itemcode) return l;
        if (!cabinetId) {
          return {
            ...l,
            cabinetId: '',
            refillCap: MAX_COPIES_WHEN_NO_REFILL,
            copies: clampCopies(l.copies, MAX_COPIES_WHEN_NO_REFILL),
          };
        }
        return { ...l, cabinetId };
      });
      const line = next.find((x) => x.itemcode === itemcode);
      if (line?.departmentId && cabinetId) {
        queueMicrotask(() => void refreshRefillForLine(itemcode, line.departmentId, cabinetId));
      }
      return next;
    });
  };

  const toggleRow = (row: Item) => {
    const code = row.itemcode;
    setSelectedLines((prev) => {
      const i = prev.findIndex((l) => l.itemcode === code);
      if (i >= 0) return prev.filter((l) => l.itemcode !== code);
      return [
        ...prev,
        {
          itemcode: code,
          itemname: (row.itemname ?? '—').trim() || '—',
          copies: 1,
          departmentId: '',
          cabinetId: '',
          refillCap: MAX_COPIES_WHEN_NO_REFILL,
          expireDate: '',
        },
      ];
    });
  };

  const selectAllOnPage = () => {
    setSelectedLines((prev) => {
      const have = new Set(prev.map((l) => l.itemcode));
      const next = [...prev];
      for (const row of items) {
        if (!have.has(row.itemcode)) {
          have.add(row.itemcode);
          next.push({
            itemcode: row.itemcode,
            itemname: (row.itemname ?? '—').trim() || '—',
            copies: 1,
            departmentId: '',
            cabinetId: '',
            refillCap: MAX_COPIES_WHEN_NO_REFILL,
            expireDate: '',
          });
        }
      }
      return next;
    });
  };

  const clearSelectionOnPage = () => {
    const onPage = new Set(items.map((i) => i.itemcode));
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

  const removeLine = (itemcode: string) => {
    setSelectedLines((prev) => prev.filter((l) => l.itemcode !== itemcode));
  };

  const fetchList = useCallback(async () => {
    try {
      setLoadingList(true);
      const params: Record<string, string | number> = {
        page,
        limit: PAGE_SIZE,
        sort_by: 'itemcode',
        sort_order: 'asc',
        item_status_filter: 'active',
      };
      if (activeKeyword.trim()) params.keyword = activeKeyword.trim();

      const res = (await itemsApi.getMasterList(params)) as {
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
      setItems(list);
      setTotal(res?.total ?? list.length);
      setTotalPages(res?.lastPage ?? Math.max(1, Math.ceil((res?.total ?? 0) / PAGE_SIZE)));
    } catch {
      toast.error('โหลดรายการไม่สำเร็จ');
      setItems([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoadingList(false);
    }
  }, [page, activeKeyword]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const handleSearch = () => {
    setActiveKeyword(keywordInput);
    setPage(1);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrint = async () => {
    if (selectedLines.length === 0) {
      toast.error('เลือกอย่างน้อย 1 รายการ');
      return;
    }
    if (selectedLines.some((l) => !l.departmentId || !l.cabinetId)) {
      toast.error('ทุกแถวต้องเลือก Division และ ตู้ Cabinet');
      return;
    }
    if (selectedLines.length > MAX_PRINT) {
      toast.error(`เลือกได้ไม่เกิน ${MAX_PRINT} รายการต่อครั้ง`);
      return;
    }

    const linesWithCopies = selectedLines
      .map((l) => {
        const copies = clampCopies(l.copies, l.refillCap);
        const exp = (l.expireDate ?? '').trim();
        return {
          itemcode: l.itemcode,
          copies,
          cabinet_id: parseInt(l.cabinetId, 10),
          department_id: parseInt(l.departmentId, 10),
          ...(exp ? { expire_date: exp } : {}),
        };
      })
      .filter((l) => l.copies > 0);

    if (linesWithCopies.length === 0) {
      toast.error('ไม่มีแผ่นที่พิมพ์ได้ — ตรวจสอบจำนวนแผ่นต่อรายการ');
      return;
    }

    const totalSheets = linesWithCopies.reduce((s, l) => s + l.copies, 0);
    if (totalSheets > MAX_TOTAL_LABELS) {
      toast.error(`จำนวนฉลากรวมเกิน ${MAX_TOTAL_LABELS} แผ่น (ตอนนี้รวม ${totalSheets})`);
      return;
    }

    const payloadItems = linesWithCopies.map(({ itemcode, copies, expire_date }) => ({
      itemcode,
      copies,
      ...(expire_date ? { expire_date } : {}),
    }));

    try {
      setPrinting(true);
      const res = await stickerPrintApi.printLabelItems({ items: payloadItems });

      const stockRes = await itemStockApi.createForPrint({
        lines: linesWithCopies.map(
          ({ itemcode, cabinet_id, department_id, copies, expire_date }) => ({
            itemcode,
            cabinet_id,
            department_id,
            copies,
            ...(expire_date ? { expire_date } : {}),
          }),
        ),
      });

      if (stockRes?.success === false) {
        const msg =
          typeof stockRes.message === 'string'
            ? stockRes.message
            : stockRes.error ?? 'บันทึก stock ไม่สำเร็จ';
        toast.error(msg, {
          description:
            'ส่งพิมพ์ไปเครื่องแล้ว แต่บันทึก RFID/stock ไม่สำเร็จ — ตรวจสอบและบันทึกซ้ำถ้าจำเป็น',
        });
        return;
      }

      const stockN = stockRes?.data?.count;
      toast.success(res.message, {
        description: [
          stockN != null ? `บันทึก stock ${stockN} แถว (RFID เฮกซ์ 24 ตัว)` : null,
          `${res.lineCount} แถว · ${res.count} แผ่น · ${res.totalBytesSent} bytes → ${res.host}:${res.port} · ${res.template} · ${new Date(res.printedAt).toLocaleString('th-TH')}`,
        ]
          .filter(Boolean)
          .join(' · '),
      });
      setSelectedLines([]);
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

  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <div className="flex w-full flex-col gap-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="shrink-0 -ml-2">
              <Link href="/admin/management" aria-label="กลับการจัดการ">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 p-2.5 shadow-lg">
              <Printer className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">พิมพ์สติกเกอร์</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                เลือก Item ด้านบน แล้วระบุ Division / ตู้และจำนวนแผ่นต่อแถว — สูงสุดตามจำนวนเติม หรือ 10 แผ่นเมื่อไม่มีข้อมูลเติม
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <PrintStickerItemListCard
              items={items}
              loadingList={loadingList}
              total={total}
              page={page}
              totalPages={totalPages}
              keywordInput={keywordInput}
              onKeywordInputChange={setKeywordInput}
              onSearch={handleSearch}
              onRefresh={fetchList}
              onSelectAllOnPage={selectAllOnPage}
              onClearSelectionOnPage={clearSelectionOnPage}
              onPageChange={handlePageChange}
              selectedItemcodes={selectedItemcodes}
              onToggleRow={toggleRow}
            />

            <PrintStickerOrderCard
              selectedLines={selectedLines}
              printing={printing}
              fetchingItemcode={fetchingItemcode}
              onLineDepartmentChange={onLineDepartmentChange}
              onLineCabinetChange={onLineCabinetChange}
              onSetCopies={setCopiesFor}
              onExpireDateChange={setExpireDateFor}
              onRemoveLine={removeLine}
              onClearAll={() => setSelectedLines([])}
              onPrint={handlePrint}
            />
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
