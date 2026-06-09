'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { itemsApi, departmentApi } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import type { Item } from '@/types/item';
import { toast } from 'sonner';
import { Boxes } from 'lucide-react';
import CreateItemDialog from './components/CreateItemDialog';
import EditItemDialog from '@/app/admin/items/components/EditItemDialog';
import DeleteItemDialog from '@/app/admin/items/components/DeleteItemDialog';
import ItemsSearchCard, { type ItemStatusFilter } from './components/ItemsSearchCard';
import ItemsMasterTableCard from './components/ItemsMasterTableCard';
import { ITEMS_PAGE_SIZE } from './components/itemPagination';
import type { DeptRow } from './components/itemHelpers';

export default function AdminItemManagementPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [keywordInput, setKeywordInput] = useState('');
  const [activeKeyword, setActiveKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<ItemStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Item | null>(null);
  const [departments, setDepartments] = useState<DeptRow[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await departmentApi.getAll({ limit: 500 });
        if (res.success && Array.isArray(res.data)) {
          setDepartments(res.data as DeptRow[]);
        }
      } catch {
        setDepartments([]);
      }
    })();
  }, []);

  const deptMap = useMemo(() => {
    const m = new Map<number, DeptRow>();
    departments.forEach((d) => m.set(d.ID, d));
    return m;
  }, [departments]);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {
        page,
        limit: ITEMS_PAGE_SIZE,
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
      setTotalPages(res?.lastPage ?? Math.max(1, Math.ceil((res?.total ?? 0) / ITEMS_PAGE_SIZE)));
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

  const handleClearFilters = () => {
    setKeywordInput('');
    setActiveKeyword('');
    setStatusFilter('all');
    setPage(1);
  };

  const handleStatusFilterChange = (value: ItemStatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEdit = (item: Item) => {
    setSelected(item);
    setEditOpen(true);
  };

  const handleDelete = (item: Item) => {
    setSelected(item);
    setDeleteOpen(true);
  };

  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-amber-100 p-2.5">
              <Boxes className="h-7 w-7 text-amber-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">จัดการ Item (Master)</h1>
              <p className="mt-0.5 text-sm text-slate-600">
                รายการรหัสเวชภัณฑ์ในฐานข้อมูล รวมรายการที่ยังไม่มีในตู้
              </p>
            </div>
          </div>

          <ItemsSearchCard
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

          <ItemsMasterTableCard
            items={items}
            loading={loading}
            page={page}
            pageSize={ITEMS_PAGE_SIZE}
            total={total}
            totalPages={totalPages}
            deptMap={deptMap}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCreateClick={() => setCreateOpen(true)}
            onPageChange={handlePageChange}
          />
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
