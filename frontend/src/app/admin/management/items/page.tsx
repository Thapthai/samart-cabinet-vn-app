'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { itemsApi } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import type { Item } from '@/types/item';
import { toast } from 'sonner';
import {
  Boxes,
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
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
import CreateItemDialog from './components/CreateItemDialog';
import EditItemDialog from '@/app/admin/items/components/EditItemDialog';
import DeleteItemDialog from '@/app/admin/items/components/DeleteItemDialog';

const PAGE_SIZE = 20;

function StatusBadge({ status }: { status: number | null | undefined }) {
  if (status === 0) {
    return (
      <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-800">
        ใช้งาน
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
      ไม่ใช้งาน
    </span>
  );
}

export default function AdminItemManagementPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [keywordInput, setKeywordInput] = useState('');
  const [activeKeyword, setActiveKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Item | null>(null);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {
        page,
        limit: PAGE_SIZE,
        sort_by: 'itemcode',
        sort_order: 'asc',
      };
      if (activeKeyword.trim()) params.keyword = activeKeyword.trim();
      if (statusFilter !== 'all') params.item_status_filter = statusFilter;

      const res = (await itemsApi.getMasterList(params)) as {
        success?: boolean;
        data?: Item[];
        total?: number;
        lastPage?: number;
        message?: string;
      };

      if (res?.success === false) {
        toast.error((res as { message?: string }).message || 'โหลดรายการไม่สำเร็จ');
        setItems([]);
        setTotal(0);
        setTotalPages(1);
        return;
      }

      const list = Array.isArray(res?.data) ? res.data : [];
      setItems(list);
      setTotal(res?.total ?? list.length);
      setTotalPages(res?.lastPage ?? Math.max(1, Math.ceil((res?.total ?? 0) / PAGE_SIZE)));
    } catch (e) {
      console.error(e);
      toast.error('โหลดรายการไม่สำเร็จ');
      setItems([]);
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

  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-amber-100 p-2.5">
                <Boxes className="h-7 w-7 text-amber-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">จัดการ Item (Master)</h1>
                <p className="mt-0.5 text-sm text-slate-600">
                  รายการรหัสเวชภัณฑ์ในฐานข้อมูล รวมรายการที่ยังไม่มีในตู้ ·{' '}
                  <Link
                    href="/admin/items"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    ไปหน้าสต๊อกในตู้
                  </Link>
                </p>
              </div>
            </div>
            <Button type="button" onClick={() => setCreateOpen(true)} className="shrink-0 gap-2">
              <Plus className="h-4 w-4" />
              เพิ่ม Item
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">ค้นหา</CardTitle>
              <CardDescription>ค้นจากรหัส ชื่อ หรือบาร์โค้ด</CardDescription>
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
                    setStatusFilter(v as 'all' | 'active' | 'inactive');
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    <SelectItem value="active">ใช้งาน</SelectItem>
                    <SelectItem value="inactive">ไม่ใช้งาน</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => fetchList()}
                aria-label="รีเฟรช"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
              <div>
                <CardTitle>รายการ Item</CardTitle>
                <CardDescription>
                  {loading && items.length === 0
                    ? 'กำลังโหลด…'
                    : `ทั้งหมด ${total} รายการ · หน้า ${page} / ${totalPages}`}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {loading && items.length === 0 ? (
                <div className="flex justify-center py-12 text-muted-foreground">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                </div>
              ) : items.length === 0 ? (
                <p className="py-10 text-center text-muted-foreground">ไม่พบรายการ</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14">#</TableHead>
                        <TableHead>รหัส Item</TableHead>
                        <TableHead>ชื่อ</TableHead>
                        <TableHead>บาร์โค้ด</TableHead>
                        <TableHead>สถานะ</TableHead>
                        <TableHead className="w-[120px] text-right">จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((it, i) => (
                        <TableRow key={it.itemcode}>
                          <TableCell className="text-muted-foreground">
                            {(page - 1) * PAGE_SIZE + i + 1}
                          </TableCell>
                          <TableCell>
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{it.itemcode}</code>
                          </TableCell>
                          <TableCell className="max-w-[280px] truncate font-medium" title={it.itemname}>
                            {it.itemname || '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{it.Barcode || '—'}</TableCell>
                          <TableCell>
                            <StatusBadge status={it.item_status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => {
                                setSelected(it);
                                setEditOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => {
                                setSelected(it);
                                setDeleteOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-2 text-sm text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <CreateItemDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          userId={user?.id}
          onSuccess={fetchList}
        />
        <EditItemDialog open={editOpen} onOpenChange={setEditOpen} item={selected} onSuccess={fetchList} />
        <DeleteItemDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          item={selected}
          onSuccess={fetchList}
        />
      </AppLayout>
    </ProtectedRoute>
  );
}
