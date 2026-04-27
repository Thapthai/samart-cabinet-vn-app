'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer, RefreshCw, Search, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { itemsApi, stickerPrintApi } from '@/lib/api';
import type { Item } from '@/types/item';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

/** ตรงกับ admin/management/items */
const PAGE_SIZE = 10;

function generatePageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  const pages: (number | string)[] = [];
  const maxVisible = 5;
  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else if (currentPage <= 3) {
    for (let i = 1; i <= 4; i++) pages.push(i);
    pages.push('...');
    pages.push(totalPages);
  } else if (currentPage >= totalPages - 2) {
    pages.push(1);
    pages.push('...');
    for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    pages.push('...');
    for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
    pages.push('...');
    pages.push(totalPages);
  }
  return pages;
}

const MAX_PRINT = 80;
const MAX_COPIES_PER_ITEM = 50;
const MAX_TOTAL_LABELS = 2000;

type SelectedLine = { itemcode: string; itemname: string; copies: number };

function clampCopies(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_COPIES_PER_ITEM, Math.max(1, Math.floor(n)));
}

export default function AdminPrintStickerPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [keywordInput, setKeywordInput] = useState('');
  const [activeKeyword, setActiveKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [selectedLines, setSelectedLines] = useState<SelectedLine[]>([]);
  const selectedSet = new Set(selectedLines.map((l) => l.itemcode));

  const [printing, setPrinting] = useState(false);

  const toggleRow = (row: Item) => {
    const code = row.itemcode;
    setSelectedLines((prev) => {
      const i = prev.findIndex((l) => l.itemcode === code);
      if (i >= 0) return prev.filter((l) => l.itemcode !== code);
      return [
        ...prev,
        { itemcode: code, itemname: (row.itemname ?? '—').trim() || '—', copies: 1 },
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
    const copies = clampCopies(raw);
    setSelectedLines((prev) => prev.map((l) => (l.itemcode === itemcode ? { ...l, copies } : l)));
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
    fetchList();
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
    if (selectedLines.length > MAX_PRINT) {
      toast.error(`เลือกได้ไม่เกิน ${MAX_PRINT} รายการต่อครั้ง`);
      return;
    }
    const payloadItems = selectedLines.map((l) => ({
      itemcode: l.itemcode,
      copies: clampCopies(l.copies),
    }));
    const totalSheets = payloadItems.reduce((s, l) => s + l.copies, 0);
    if (totalSheets > MAX_TOTAL_LABELS) {
      toast.error(`จำนวนฉลากรวมเกิน ${MAX_TOTAL_LABELS} แผ่น (ตอนนี้รวม ${totalSheets})`);
      return;
    }
    try {
      setPrinting(true);
      const res = await stickerPrintApi.printLabelItems({ items: payloadItems });
      toast.success(res.message, {
        description: `${res.lineCount} แถว · ${res.count} แผ่น · ${res.totalBytesSent} bytes → ${res.host}:${res.port} · ${res.template} · ${new Date(res.printedAt).toLocaleString('th-TH')}`,
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

  const onPageSelectedCount = items.filter((r) => selectedSet.has(r.itemcode)).length;

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
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 shadow-lg">
              <Printer className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">พิมพ์สติกเกอร์</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                เลือกหลาย Item จาก master แล้วส่งไปเครื่องปริ้นเพื่อพิมพ์
              </p>
            </div>
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-3">
            <Card className="border-slate-200 shadow-sm min-w-0 lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">รายการ Item (ใช้งาน)</CardTitle>
                <CardDescription>
                  {loadingList && items.length === 0
                    ? 'กำลังโหลด…'
                    : `แสดง ${items.length} รายการในหน้านี้ จากทั้งหมด ${total} รายการ · ติ๊กเลือกได้หลายแถว ลำดับพิมพ์ตามลำดับที่เลือก`}
                </CardDescription>
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Input
                    placeholder="ค้นหา itemcode / ชื่อ…"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="sm:max-w-xs"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" size="sm" className="gap-1" onClick={handleSearch}>
                      <Search className="h-4 w-4" />
                      ค้นหา
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => fetchList()}
                      disabled={loadingList}
                    >
                      <RefreshCw className={cn('h-4 w-4', loadingList && 'animate-spin')} />
                      รีเฟรช
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={selectAllOnPage}
                      disabled={loadingList || items.length === 0}
                    >
                      เลือกทั้งหน้า
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearSelectionOnPage}
                      disabled={loadingList || onPageSelectedCount === 0}
                    >
                      ยกเลิกในหน้านี้
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="min-h-0 pt-0">
                <div className="max-h-[min(70vh,calc(100dvh-15rem))] overflow-y-auto overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 pl-3">เลือก</TableHead>
                        <TableHead>itemcode</TableHead>
                        <TableHead>ชื่อ</TableHead>
                        <TableHead className="hidden md:table-cell">Barcode</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingList ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-slate-500 py-10">
                            กำลังโหลด…
                          </TableCell>
                        </TableRow>
                      ) : items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-slate-500 py-10">
                            ไม่มีรายการ
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((row) => {
                          const sel = selectedSet.has(row.itemcode);
                          return (
                            <TableRow
                              key={row.itemcode}
                              className={cn(sel && 'bg-rose-50/90')}
                              onClick={() => toggleRow(row)}
                            >
                              <TableCell className="w-12 pl-3" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={sel}
                                  onCheckedChange={() => toggleRow(row)}
                                  aria-label={`เลือก ${row.itemcode}`}
                                />
                              </TableCell>
                              <TableCell className="font-mono text-sm">{row.itemcode}</TableCell>
                              <TableCell className="text-sm max-w-[220px] truncate" title={row.itemname}>
                                {row.itemname ?? '—'}
                              </TableCell>
                              <TableCell className="hidden md:table-cell font-mono text-xs text-slate-600">
                                {row.Barcode ?? '—'}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && (
                  <div className="mt-6 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-muted-foreground">
                      หน้า {page} จาก {totalPages} ({total} รายการ)
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(1)}
                        disabled={page === 1 || loadingList}
                      >
                        แรกสุด
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1 || loadingList}
                      >
                        ก่อนหน้า
                      </Button>
                      {generatePageNumbers(page, totalPages).map((pNum, idx) =>
                        pNum === '...' ? (
                          <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                            ...
                          </span>
                        ) : (
                          <Button
                            key={pNum}
                            type="button"
                            variant={page === pNum ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handlePageChange(pNum as number)}
                            disabled={loadingList}
                          >
                            {pNum}
                          </Button>
                        ),
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === totalPages || loadingList}
                      >
                        ถัดไป
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(totalPages)}
                        disabled={page === totalPages || loadingList}
                      >
                        สุดท้าย
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4 lg:col-span-1">
              <Card className="border-slate-200 shadow-sm lg:sticky lg:top-4">
                <CardHeader>
                  <CardTitle className="text-lg">สั่งพิมพ์</CardTitle>
                  <CardDescription>
                    <p className="text-sm text-muted-foreground">
                      เลือกจากตารางซ้าย แล้วตั้งจำนวนแผ่นต่อรายการ (1–{MAX_COPIES_PER_ITEM}) รวมไม่เกิน {MAX_TOTAL_LABELS}{' '}
                      แผ่น · เลือกได้สูงสุด {MAX_PRINT} แถว
                    </p>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">

                  {selectedLines.length === 0 ? (
                    <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
                      ยังไม่มีรายการ — ติ๊กจากตาราง Item
                    </p>
                  ) : (
                    <div className="max-h-[min(55vh,24rem)] overflow-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10 px-2" />
                            <TableHead>itemcode</TableHead>
                            <TableHead className="min-w-[120px]">ชื่อ</TableHead>
                            <TableHead className="w-[100px] text-right">จำนวนแผ่น</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedLines.map((line) => (
                            <TableRow key={line.itemcode}>
                              <TableCell className="px-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  aria-label={`เอา ${line.itemcode} ออก`}
                                  onClick={() => removeLine(line.itemcode)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                              <TableCell className="font-mono text-sm">{line.itemcode}</TableCell>
                              <TableCell className="max-w-[140px] truncate text-sm" title={line.itemname}>
                                {line.itemname}
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  min={1}
                                  max={MAX_COPIES_PER_ITEM}
                                  className="ml-auto h-8 w-[4.5rem] text-right font-mono text-sm"
                                  value={line.copies}
                                  onChange={(e) => {
                                    const n = parseInt(e.target.value, 10);
                                    setCopiesFor(line.itemcode, Number.isFinite(n) ? n : 1);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span>
                      {selectedLines.length} แถว · รวม{' '}
                      <span className="font-medium text-slate-800">
                        {selectedLines.reduce((s, l) => s + clampCopies(l.copies), 0)}
                      </span>{' '}
                      แผ่น
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setSelectedLines([])}
                    disabled={selectedLines.length === 0}
                  >
                    ล้างการเลือกทั้งหมด
                  </Button>
                  <Button
                    type="button"
                    className="w-full gap-2"
                    onClick={handlePrint}
                    disabled={printing || selectedLines.length === 0}
                  >
                    <Send className="h-4 w-4" />
                    {printing ? 'กำลังส่ง…' : 'สั่งพิมพ์ฉลาก'}
                  </Button>

                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
