'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { medicalSupplySubDepartmentsApi, departmentApi } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import { Building2, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SubDepartmentsFilters from './components/SubDepartmentsFilters';
import SubDepartmentsTable from './components/SubDepartmentsTable';
import SubDepartmentFormDialog from './components/SubDepartmentFormDialog';
import SubDepartmentDeleteDialog from './components/SubDepartmentDeleteDialog';
import type { DeptRow, StatusFilter, SubDepartmentRow } from './types';

export default function SubDepartmentsManagementPage() {
  const [rows, setRows] = useState<SubDepartmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [keywordInput, setKeywordInput] = useState('');
  const [activeKeyword, setActiveKeyword] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<'all' | string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [filterDepartments, setFilterDepartments] = useState<DeptRow[]>([]);
  const [filterDeptLoading, setFilterDeptLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SubDepartmentRow | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const [departments, setDepartments] = useState<DeptRow[]>([]);
  const [formDepartmentId, setFormDepartmentId] = useState<number | null>(null);
  const [formDeptLoading, setFormDeptLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<SubDepartmentRow | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await medicalSupplySubDepartmentsApi.getAll();
      if (res.success === false || !Array.isArray(res.data)) {
        toast.error(res.message || 'โหลดรายการไม่สำเร็จ');
        setRows([]);
        return;
      }
      setRows(res.data as SubDepartmentRow[]);
    } catch {
      toast.error('โหลดรายการไม่สำเร็จ');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setFilterDeptLoading(true);
        const response = await departmentApi.getAll({ limit: 500 });
        if (cancelled) return;
        if (response.success && response.data) {
          const list = (response.data as DeptRow[]).slice().sort((a, b) => {
            const an = (a.DepName || a.DepName2 || '').localeCompare(b.DepName || b.DepName2 || '');
            return an;
          });
          setFilterDepartments(list);
        }
      } catch {
        if (!cancelled) toast.error('โหลดรายการแผนกสำหรับตัวกรองไม่สำเร็จ');
      } finally {
        if (!cancelled) setFilterDeptLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRows = useMemo(() => {
    let list = rows;
    const q = activeKeyword.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const code = (r.code || '').toLowerCase();
        const name = (r.name || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        return code.includes(q) || name.includes(q) || desc.includes(q);
      });
    }
    if (departmentFilter !== 'all') {
      const id = Number(departmentFilter);
      list = list.filter((r) => r.department_id === id);
    }
    if (statusFilter === 'active') list = list.filter((r) => r.status);
    if (statusFilter === 'inactive') list = list.filter((r) => !r.status);
    return list;
  }, [rows, activeKeyword, departmentFilter, statusFilter]);

  const handleSearch = () => {
    setActiveKeyword(keywordInput);
  };

  const loadDepartments = async (keyword?: string) => {
    try {
      setFormDeptLoading(true);
      const response = await departmentApi.getAll({ limit: 10, keyword });
      if (response.success && response.data) {
        setDepartments(response.data as DeptRow[]);
      }
    } catch {
      toast.error('โหลดรายการแผนกไม่สำเร็จ');
      setDepartments([]);
    } finally {
      setFormDeptLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormCode('');
    setFormLabel('');
    setFormDescription('');
    setFormDepartmentId(null);
    setFormActive(true);
    setDepartments([]);
    setFormOpen(true);
  };

  const openEdit = (r: SubDepartmentRow) => {
    setEditing(r);
    setFormCode(r.code);
    setFormLabel(r.name || '');
    setFormDescription(r.description || '');
    setFormDepartmentId(r.department_id);
    setFormActive(r.status);
    setDepartments([]);
    setFormOpen(true);
  };

  const submitForm = async () => {
    const code = formCode.trim();
    if (!code) {
      toast.error('กรุณากรอกรหัสแผนกย่อย (code)');
      return;
    }
    if (formDepartmentId == null) {
      toast.error('กรุณาเลือกแผนกหลัก');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const res = await medicalSupplySubDepartmentsApi.update(editing.id, {
          department_id: formDepartmentId,
          code,
          name: formLabel.trim() || undefined,
          description: formDescription.trim() ? formDescription.trim() : null,
          status: formActive,
        });
        if (res.success === false) {
          toast.error(res.message || 'อัปเดตไม่สำเร็จ');
          return;
        }
        toast.success('บันทึกแล้ว');
      } else {
        const res = await medicalSupplySubDepartmentsApi.create({
          department_id: formDepartmentId,
          code,
          name: formLabel.trim() || undefined,
          description: formDescription.trim() ? formDescription.trim() : null,
          status: formActive,
        });
        if (res.success === false) {
          toast.error(res.message || 'สร้างไม่สำเร็จ');
          return;
        }
        toast.success('บันทึกแล้ว');
      }
      setFormOpen(false);
      load();
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await medicalSupplySubDepartmentsApi.delete(deleteTarget.id);
      if (res.success === false) {
        toast.error(res.message || 'ลบไม่สำเร็จ');
        return;
      }
      toast.success('ลบแล้ว');
      setDeleteTarget(null);
      load();
    } catch {
      toast.error('ลบไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 shadow-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">แผนกย่อย (Sub department)</h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  แต่ละแถวคือแผนกย่อยภายใต้แผนกหลักหนึ่งแผนก เช่น emergency-opd, emergency-ipd — ใช้เป็นค่าเริ่มต้นเมื่อ Location
                  เป็นรูปแบบ DepName2-รหัสแผนกย่อย
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                รีเฟรช
              </Button>
              <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-teal-600" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มแผนกย่อย
              </Button>
            </div>
          </div>

          <SubDepartmentsFilters
            keyword={keywordInput}
            onKeywordChange={setKeywordInput}
            onSearch={handleSearch}
            departmentFilter={departmentFilter}
            onDepartmentFilterChange={setDepartmentFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            filterDepartments={filterDepartments}
            departmentsLoading={filterDeptLoading}
          />

          <SubDepartmentsTable
            rows={filteredRows}
            loading={loading}
            totalLoaded={rows.length}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
          />
        </div>

        <SubDepartmentFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          editing={editing}
          formCode={formCode}
          onFormCodeChange={setFormCode}
          formLabel={formLabel}
          onFormLabelChange={setFormLabel}
          formDescription={formDescription}
          onFormDescriptionChange={setFormDescription}
          formActive={formActive}
          onFormActiveChange={setFormActive}
          formDepartmentId={formDepartmentId}
          onFormDepartmentIdChange={setFormDepartmentId}
          departments={departments}
          formDeptLoading={formDeptLoading}
          onSearchDepartments={loadDepartments}
          saving={saving}
          onSubmit={submitForm}
        />

        <SubDepartmentDeleteDialog
          target={deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          saving={saving}
          onConfirm={confirmDelete}
        />
      </AppLayout>
    </ProtectedRoute>
  );
}
