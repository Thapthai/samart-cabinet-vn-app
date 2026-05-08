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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PrintStickerItemListCard } from './components/PrintStickerItemListCard';
import { PrintStickerOrderCard } from './components/PrintStickerOrderCard';
import { PAGE_SIZE, MAX_PRINT, MAX_TOTAL_LABELS, MAX_COPIES_WHEN_NO_REFILL } from './constants';
import type { SelectedLine } from './types';
import { clampCopies } from './utils';

export default function AdminPrintStickerPage() {
  type PreparedStockRow = { RowID: number; ItemCode?: string | null; RfidCode?: string | null };

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
  const [preparing, setPreparing] = useState(false);
  const [preparedRows, setPreparedRows] = useState<PreparedStockRow[]>([]);
  const [selectedPreparedRowIds, setSelectedPreparedRowIds] = useState<number[]>([]);
  const [deletingPrepared, setDeletingPrepared] = useState(false);

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
          refillCap: MAX_COPIES_WHEN_NO_REFILL,
          expireDate: '',
          SubUnitQty: row.SubUnitQty,
          unit: row.unit,
          subUnit: row.subUnit,
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
            refillCap: MAX_COPIES_WHEN_NO_REFILL,
            expireDate: '',
            SubUnitQty: row.SubUnitQty,
            unit: row.unit,
            subUnit: row.subUnit,
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

  const buildLinesWithCopies = () => {
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
        return {
          itemcode: l.itemcode,
          copies,
          stock_id: 0,
          ...(exp ? { expire_date: exp } : {}),
        };
      })
      .filter((l) => l.copies > 0);

    if (linesWithCopies.length === 0) {
      toast.error('ไม่มีแผ่นที่พิมพ์ได้ — ตรวจสอบจำนวนแผ่นต่อรายการ');
      return null;
    }

    const totalSheets = linesWithCopies.reduce((s, l) => s + l.copies, 0);
    if (totalSheets > MAX_TOTAL_LABELS) {
      toast.error(`จำนวนฉลากรวมเกิน ${MAX_TOTAL_LABELS} แผ่น (ตอนนี้รวม ${totalSheets})`);
      return null;
    }

    return linesWithCopies;
  };

  const handlePrepare = async () => {
    const linesWithCopies = buildLinesWithCopies();
    if (!linesWithCopies) return;
    try {
      setPreparing(true);
      const stockRes = await itemStockApi.createForPrintByStock({
        lines: linesWithCopies.map(
          ({ itemcode, stock_id, copies, expire_date }) => ({
            itemcode,
            stock_id,
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

  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <div className="flex w-full flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 p-2.5 shadow-lg">
              <Printer className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">พิมพ์สติกเกอร์</h1>
            
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
              preparing={preparing}
              onSetCopies={setCopiesFor}
              onExpireDateChange={setExpireDateFor}
              onRemoveLine={removeLine}
              onClearAll={() => setSelectedLines([])}
              onPrepare={handlePrepare}
            />

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">รายการ itemstock ที่สร้างแล้ว</CardTitle>
                <CardDescription>
                  ลบรายการที่ไม่ต้องการก่อน แล้วค่อยกดพิมพ์
                </CardDescription>
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
                  <Button
                    onClick={handlePrint}
                    disabled={printing || preparing || preparedRows.length === 0}
                  >
                    {printing ? 'กำลังส่ง…' : `พิมพ์จากรายการที่บันทึกแล้ว (${preparedRows.length})`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
