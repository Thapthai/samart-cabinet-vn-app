'use client';

import { useCallback, useEffect, useState } from 'react';
import { employeeApi, type EmployeeRow } from '@/lib/api';
import { toast } from 'sonner';
import { IdCard } from 'lucide-react';
import CreateEmployeeDialog from '@/app/admin/management/employee/components/CreateEmployeeDialog';
import EditEmployeeDialog from '@/app/admin/management/employee/components/EditEmployeeDialog';
import DeleteEmployeeDialog from '@/app/admin/management/employee/components/DeleteEmployeeDialog';
import EmployeeSearchCard from '@/app/admin/management/employee/components/EmployeeSearchCard';
import EmployeeTable from '@/app/admin/management/employee/components/EmployeeTable';

const PAGE_SIZE = 10;

export default function EmployeeTab() {
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

  const handleClearFilters = () => {
    setKeywordInput('');
    setActiveKeyword('');
    setPage(1);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-teal-100 p-2.5">
          <IdCard className="h-7 w-7 text-teal-700" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">จัดการ Employee</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            รายชื่อพนักงาน (EmpCode) สำหรับผูกกับ Staff User และผู้ใช้ตู้ Cabinet
          </p>
        </div>
      </div>

      <EmployeeSearchCard
        keywordInput={keywordInput}
        activeKeyword={activeKeyword}
        onKeywordInputChange={setKeywordInput}
        onSearch={handleSearch}
        onClearFilters={handleClearFilters}
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
        onCreateClick={() => setCreateOpen(true)}
        onEdit={(row) => {
          setSelected(row);
          setEditOpen(true);
        }}
        onDelete={(row) => {
          setSelected(row);
          setDeleteOpen(true);
        }}
      />

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
    </div>
  );
}
