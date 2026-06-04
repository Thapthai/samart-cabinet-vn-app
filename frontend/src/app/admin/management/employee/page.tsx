'use client';

import { useCallback, useEffect, useState } from 'react';
import { employeeApi, type EmployeeRow } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import { Plus, IdCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CreateEmployeeDialog from './components/CreateEmployeeDialog';
import EditEmployeeDialog from './components/EditEmployeeDialog';
import DeleteEmployeeDialog from './components/DeleteEmployeeDialog';
import EmployeeSearchCard from './components/EmployeeSearchCard';
import EmployeeTable from './components/EmployeeTable';

const PAGE_SIZE = 10;

export default function EmployeeManagementPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [keywordInput, setKeywordInput] = useState('');
  const [activeKeyword, setActiveKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<EmployeeRow | null>(null);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      const res = await employeeApi.getAll({
        page,
        limit: PAGE_SIZE,
        keyword: activeKeyword.trim() || undefined,
      });

      if (res.success === false) {
        toast.error('โหลดรายการพนักงานไม่สำเร็จ');
        setEmployees([]);
        setTotal(0);
        setTotalPages(1);
        return;
      }

      const list = Array.isArray(res?.data) ? res.data : [];
      setEmployees(list);
      setTotal(res?.total ?? list.length);
      setTotalPages(res?.lastPage ?? Math.max(1, Math.ceil((res?.total ?? 0) / PAGE_SIZE)));
    } catch (e) {
      console.error(e);
      toast.error('โหลดรายการพนักงานไม่สำเร็จ');
      setEmployees([]);
    } finally {
      setLoading(false);
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

  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-teal-100 p-2.5">
                <IdCard className="h-7 w-7 text-teal-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">จัดการ Employee</h1>
                <p className="mt-0.5 text-sm text-slate-600">
                  รายชื่อพนักงาน (EmpCode) สำหรับผูกกับ Staff User และผู้ใช้ตู้ Cabinet
                </p>
              </div>
            </div>
            <Button type="button" onClick={() => setCreateOpen(true)} className="shrink-0 gap-2">
              <Plus className="h-4 w-4" />
              เพิ่มพนักงาน
            </Button>
          </div>

          <EmployeeSearchCard
            keyword={keywordInput}
            onKeywordChange={setKeywordInput}
            onSearch={handleSearch}
            onRefresh={fetchList}
            loading={loading}
          />

          <EmployeeTable
            employees={employees}
            loading={loading}
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onEdit={(row) => {
              setSelected(row);
              setEditOpen(true);
            }}
            onDelete={(row) => {
              setSelected(row);
              setDeleteOpen(true);
            }}
          />
        </div>

        <CreateEmployeeDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={fetchList} />
        <EditEmployeeDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          employee={selected}
          onSuccess={fetchList}
        />
        <DeleteEmployeeDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          employee={selected}
          onSuccess={fetchList}
        />
      </AppLayout>
    </ProtectedRoute>
  );
}
