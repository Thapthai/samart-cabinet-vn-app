'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { staffUnitsApi } from '@/lib/staffApi/unitsApi';
import type { UnitRow } from '@/lib/api';
import { toast } from 'sonner';
import { Ruler, Plus, Pencil, Ban, Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CreateUnitDialog from './components/CreateUnitDialog';
import EditUnitDialog from './components/EditUnitDialog';
import CancelUnitDialog from './components/CancelUnitDialog';

/** ตรงกับ staff/management/items */
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

function UnitStatusBadge({ isCancel }: { isCancel: boolean }) {
  if (isCancel) {
    return (
      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
        ยกเลิกแล้ว
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800">
      ใช้งาน
    </span>
  );
}

export default function StaffUnitsManagementPage() {
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [keywordInput, setKeywordInput] = useState('');
  const [activeKeyword, setActiveKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'cancelled'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [selected, setSelected] = useState<UnitRow | null>(null);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      const params: Parameters<typeof staffUnitsApi.getAll>[0] = {
        page,
        limit: PAGE_SIZE,
        keyword: activeKeyword.trim() || undefined,
      };
      if (statusFilter === 'cancelled') {
        params.only_cancelled = true;
      } else if (statusFilter === 'all') {
        params.include_cancelled = true;
      }

      const res = await staffUnitsApi.getAll(params);

      if (res.success === false) {
        toast.error('โหลดรายการหน่วยนับไม่สำเร็จ');
        setUnits([]);
        setTotal(0);
        setTotalPages(1);
        return;
      }

      const list = Array.isArray(res?.data) ? res.data : [];
      setUnits(list);
      setTotal(res?.total ?? list.length);
      setTotalPages(res?.lastPage ?? Math.max(1, Math.ceil((res?.total ?? 0) / PAGE_SIZE)));
    } catch (e) {
      console.error(e);
      toast.error('โหลดรายการหน่วยนับไม่สำเร็จ');
      setUnits([]);
    } finally {
      setLoading(false);
    }
  }, [page, activeKeyword, statusFilter]);

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

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-violet-100 p-2.5">
              <Ruler className="h-7 w-7 text-violet-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">จัดการหน่วยนับ (Unit)</h1>
              <p className="mt-0.5 text-sm text-slate-600">
                รายการหน่วย (API Staff) ·{' '}
                <Link
                  href="/staff/management/items"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  ไปหน้าจัดการ Item (Master)
                </Link>
              </p>
            </div>
          </div>
          <Button type="button" onClick={() => setCreateOpen(true)} className="shrink-0 gap-2">
            <Plus className="h-4 w-4" />
            เพิ่มหน่วย
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">ค้นหา</CardTitle>
            <CardDescription>ค้นจากชื่อหน่วย (UnitName)</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="flex min-w-[200px] flex-1 gap-2">
              <Input
                placeholder="คำค้น..."
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="max-w-md"
              />
              <Button type="button" variant="secondary" onClick={handleSearch} className="gap-1.5">
                <Search className="h-4 w-4" />
                ค้นหา
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap text-sm text-muted-foreground">สถานะ</span>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v as 'all' | 'active' | 'cancelled');
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="active">ใช้งาน</SelectItem>
                  <SelectItem value="cancelled">ยกเลิกแล้ว</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="outline" size="icon" onClick={() => fetchList()} aria-label="รีเฟรช">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
            <div>
              <CardTitle>รายการหน่วยนับ</CardTitle>
              <CardDescription>
                {loading && units.length === 0
                  ? 'กำลังโหลด…'
                  : `แสดง ${units.length} รายการ จากทั้งหมด ${total} รายการ`}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {loading && units.length === 0 ? (
              <div className="flex justify-center py-12 text-muted-foreground">
                <RefreshCw className="h-8 w-8 animate-spin" />
              </div>
            ) : units.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">ไม่พบรายการ</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">#</TableHead>
                      <TableHead className="w-20">ID</TableHead>
                      <TableHead>ชื่อหน่วย</TableHead>
                      <TableHead className="w-24">B_ID</TableHead>
                      <TableHead>สถานะ</TableHead>
                      <TableHead className="w-[120px] text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {units.map((u, i) => (
                      <TableRow key={u.id}>
                        <TableCell className="text-muted-foreground">
                          {(page - 1) * PAGE_SIZE + i + 1}
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{u.id}</code>
                        </TableCell>
                        <TableCell className="max-w-[280px] truncate font-medium" title={u.unitName}>
                          {u.unitName || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.bId ?? '—'}</TableCell>
                        <TableCell>
                          <UnitStatusBadge isCancel={u.isCancel} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => {
                              setSelected(u);
                              setEditOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {!u.isCancel && (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => {
                                setSelected(u);
                                setCancelOpen(true);
                              }}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

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
                    disabled={page === 1 || loading}
                  >
                    แรกสุด
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1 || loading}
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
                        disabled={loading}
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
                    disabled={page === totalPages || loading}
                  >
                    ถัดไป
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={page === totalPages || loading}
                  >
                    สุดท้าย
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateUnitDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={fetchList} />
      <EditUnitDialog open={editOpen} onOpenChange={setEditOpen} unit={selected} onSuccess={fetchList} />
      <CancelUnitDialog open={cancelOpen} onOpenChange={setCancelOpen} unit={selected} onSuccess={fetchList} />
    </>
  );
}
