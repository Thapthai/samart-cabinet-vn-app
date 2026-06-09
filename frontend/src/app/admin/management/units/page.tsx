'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { unitsApi, type UnitRow } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import { Ruler, Plus, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import CreateUnitDialog from './components/CreateUnitDialog';
import EditUnitDialog from './components/EditUnitDialog';
import CancelUnitDialog from './components/CancelUnitDialog';
import UnitsSearchCard, { type UnitStatusFilter } from './components/UnitsSearchCard';

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

export default function AdminUnitsManagementPage() {
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [keywordInput, setKeywordInput] = useState('');
  const [activeKeyword, setActiveKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<UnitStatusFilter>('all');
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
      const params: Parameters<typeof unitsApi.getAll>[0] = {
        page,
        limit: PAGE_SIZE,
        keyword: activeKeyword.trim() || undefined,
      };
      if (statusFilter === 'cancelled') {
        params.only_cancelled = true;
      } else if (statusFilter === 'all') {
        params.include_cancelled = true;
      }

      const res = await unitsApi.getAll(params);

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

  const handleClearFilters = () => {
    setKeywordInput('');
    setActiveKeyword('');
    setStatusFilter('all');
    setPage(1);
  };

  const handleStatusFilterChange = (value: UnitStatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-violet-100 p-2.5">
              <Ruler className="h-7 w-7 text-violet-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">จัดการหน่วยนับ (Unit)</h1>
              <p className="mt-0.5 text-sm text-slate-600">
                รายการหน่วยในฐานข้อมูลสำหรับผูกกับ Item ·{' '}
                <Link
                  href="/admin/management/items"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  ไปหน้าจัดการ Item (Master)
                </Link>
              </p>
            </div>
          </div>

          <UnitsSearchCard
            keywordInput={keywordInput}
            activeKeyword={activeKeyword}
            statusFilter={statusFilter}
            onKeywordInputChange={setKeywordInput}
            onStatusFilterChange={handleStatusFilterChange}
            onSearch={handleSearch}
            onClearFilters={handleClearFilters}
            onRefresh={fetchList}
            loading={loading}
          />

          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-2">
              <div>
                <CardTitle>รายการหน่วยนับ</CardTitle>
                <CardDescription>
                  {loading && units.length === 0
                    ? 'กำลังโหลด…'
                    : `แสดง ${units.length} รายการ จากทั้งหมด ${total} รายการ`}
                </CardDescription>
              </div>
              <Button type="button" onClick={() => setCreateOpen(true)} className="shrink-0 gap-2">
                <Plus className="h-4 w-4" />
                เพิ่มหน่วย
              </Button>
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
                        <TableHead className="w-14">ลำดับ</TableHead>

                        <TableHead>ชื่อหน่วย</TableHead>

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
                          <TableCell className="max-w-[280px] truncate font-medium" title={u.unitName}>
                            {u.unitName || '—'}
                          </TableCell>

                          <TableCell>
                            <UnitStatusBadge isCancel={u.isCancel} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelected(u);
                                  setEditOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {!u.isCancel && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelected(u);
                                    setCancelOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
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
      </AppLayout>
    </ProtectedRoute>
  );
}
