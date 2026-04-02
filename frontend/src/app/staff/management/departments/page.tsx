'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { staffMedicalSupplySubDepartmentsApi } from '@/lib/staffApi/medicalSupplySubDepartmentsApi';
import { staffDepartmentApi } from '@/lib/staffApi/departmentApi';
import { toast } from 'sonner';
import { Building2, Plus, RefreshCw, RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SubDepartmentFormDialog from '@/app/admin/management/departments/components/SubDepartmentFormDialog';
import SubDepartmentDeleteDialog from '@/app/admin/management/departments/components/SubDepartmentDeleteDialog';
import DepartmentFormDialog, {
  type DepartmentFormPayload,
} from '@/app/admin/management/departments/components/DepartmentFormDialog';
import DepartmentMasterTable from '@/app/admin/management/departments/components/DepartmentMasterTable';
import DepartmentDetailsCard from '@/app/admin/management/departments/components/DepartmentDetailsCard';
import type { DeptRow, StatusFilter, SubDepartmentRow } from '@/app/admin/management/departments/types';

export default function StaffDepartmentManagementPage() {
  const [rows, setRows] = useState<SubDepartmentRow[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);

  const [deptKwInput, setDeptKwInput] = useState('');
  const [subKwInput, setSubKwInput] = useState('');
  const [activeDeptKw, setActiveDeptKw] = useState('');
  const [activeSubKw, setActiveSubKw] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchVersion, setSearchVersion] = useState(0);

  const [filterDepartments, setFilterDepartments] = useState<DeptRow[]>([]);
  const [filterDeptLoading, setFilterDeptLoading] = useState(false);

  const [selectedDept, setSelectedDept] = useState<DeptRow | null>(null);

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

  const [deptMainOpen, setDeptMainOpen] = useState(false);
  const [deptMainMode, setDeptMainMode] = useState<'create' | 'edit'>('create');
  const [deptMainEditDept, setDeptMainEditDept] = useState<DeptRow | null>(null);
  const [creatingDept, setCreatingDept] = useState(false);

  const loadSubs = useCallback(async () => {
    try {
      setLoadingSubs(true);
      const res = await staffMedicalSupplySubDepartmentsApi.getAll();
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
      setLoadingSubs(false);
    }
  }, []);

  useEffect(() => {
    loadSubs();
  }, [loadSubs]);

  const loadFilterDepartments = useCallback(async () => {
    try {
      setFilterDeptLoading(true);
      const response = await staffDepartmentApi.getAll({ limit: 500 });
      if (response.success && response.data) {
        const list = (response.data as DeptRow[]).slice().sort((a, b) =>
          (a.DepName || a.DepName2 || '').localeCompare(b.DepName || b.DepName2 || ''),
        );
        setFilterDepartments(list);
      }
    } catch {
      toast.error('โหลดรายการแผนกไม่สำเร็จ');
    } finally {
      setFilterDeptLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFilterDepartments();
  }, [loadFilterDepartments]);

  const subRowsFiltered = useMemo(() => {
    let list = rows;
    const q = activeSubKw.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const code = (r.code || '').toLowerCase();
        const name = (r.name || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        return code.includes(q) || name.includes(q) || desc.includes(q);
      });
    }
    if (statusFilter === 'active') list = list.filter((r) => r.status);
    if (statusFilter === 'inactive') list = list.filter((r) => !r.status);
    return list;
  }, [rows, activeSubKw, statusFilter]);

  const departmentsForTable = useMemo(() => {
    const qd = activeDeptKw.trim().toLowerCase();
    let base = filterDepartments.filter((d) => {
      if (!qd) return true;
      const idStr = String(d.ID);
      return (
        idStr.includes(qd) ||
        (d.DepName || '').toLowerCase().includes(qd) ||
        (d.DepName2 || '').toLowerCase().includes(qd) ||
        (d.RefDepID || '').toLowerCase().includes(qd)
      );
    });
    const hasSubFilters = activeSubKw.trim().length > 0 || statusFilter !== 'all';
    if (hasSubFilters) {
      const ids = new Set(subRowsFiltered.map((r) => r.department_id));
      base = base.filter((d) => ids.has(d.ID));
    }
    return base;
  }, [filterDepartments, activeDeptKw, activeSubKw, statusFilter, subRowsFiltered]);

  useEffect(() => {
    if (selectedDept && !departmentsForTable.some((d) => d.ID === selectedDept.ID)) {
      setSelectedDept(null);
    }
  }, [departmentsForTable, selectedDept]);

  const applySearch = () => {
    setActiveDeptKw(deptKwInput);
    setActiveSubKw(subKwInput);
    setSearchVersion((v) => v + 1);
  };

  const resetFilters = () => {
    setDeptKwInput('');
    setSubKwInput('');
    setActiveDeptKw('');
    setActiveSubKw('');
    setStatusFilter('all');
    setSearchVersion((v) => v + 1);
  };

  const openDeptMainCreate = () => {
    setDeptMainMode('create');
    setDeptMainEditDept(null);
    setDeptMainOpen(true);
  };

  const openDeptMainEdit = (d: DeptRow) => {
    setDeptMainMode('edit');
    setDeptMainEditDept(d);
    setDeptMainOpen(true);
  };

  const submitDeptMainForm = async (payload: DepartmentFormPayload) => {
    const body = {
      DepName: payload.DepName,
      DepName2: payload.DepName2,
      RefDepID: payload.RefDepID.trim(),
    };
    setCreatingDept(true);
    try {
      if (deptMainMode === 'edit' && deptMainEditDept) {
        const res = await staffDepartmentApi.update(deptMainEditDept.ID, body);
        if (res.success === false) {
          toast.error(res.message || 'อัปเดตแผนกไม่สำเร็จ');
          return;
        }
        toast.success(res.message || 'อัปเดตแผนกหลักแล้ว');
        setDeptMainOpen(false);
        setDeptMainEditDept(null);
        await loadFilterDepartments();
        const row = res.data as DeptRow | undefined;
        if (row?.ID != null) setSelectedDept(row);
        return;
      }
      const res = await staffDepartmentApi.create({
        DepName: payload.DepName || undefined,
        DepName2: payload.DepName2 || undefined,
        RefDepID: payload.RefDepID.trim() || undefined,
      });
      if (res.success === false) {
        toast.error(res.message || 'สร้างแผนกไม่สำเร็จ');
        return;
      }
      toast.success(res.message || 'สร้างแผนกหลักแล้ว');
      setDeptMainOpen(false);
      await loadFilterDepartments();
      const row = res.data as DeptRow | undefined;
      if (row?.ID != null) setSelectedDept(row);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg || (deptMainMode === 'edit' ? 'อัปเดตแผนกไม่สำเร็จ' : 'สร้างแผนกไม่สำเร็จ'));
    } finally {
      setCreatingDept(false);
    }
  };

  const loadDepartments = async (keyword?: string) => {
    try {
      setFormDeptLoading(true);
      const response = await staffDepartmentApi.getAll({ limit: 10, keyword });
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

  const openCreateForDepartmentId = (departmentId: number) => {
    const d = filterDepartments.find((x) => x.ID === departmentId);
    setEditing(null);
    setFormCode('');
    setFormLabel('');
    setFormDescription('');
    setFormDepartmentId(departmentId);
    setFormActive(true);
    setDepartments(d ? [d] : []);
    setFormOpen(true);
  };

  const openCreate = () => {
    if (selectedDept) {
      openCreateForDepartmentId(selectedDept.ID);
      return;
    }
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
        const res = await staffMedicalSupplySubDepartmentsApi.update(editing.id, {
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
        const res = await staffMedicalSupplySubDepartmentsApi.create({
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
      loadSubs();
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
      const res = await staffMedicalSupplySubDepartmentsApi.delete(deleteTarget.id);
      if (res.success === false) {
        toast.error(res.message || 'ลบไม่สำเร็จ');
        return;
      }
      toast.success('ลบแล้ว');
      setDeleteTarget(null);
      loadSubs();
    } catch {
      toast.error('ลบไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const detailSubs =
    selectedDept != null
      ? rows
        .filter((r) => r.department_id === selectedDept.ID)
        .slice()
        .sort((a, b) => a.code.localeCompare(b.code))
      : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 shadow-lg">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">จัดการแผนก</h1>

          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => loadSubs()} disabled={loadingSubs}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingSubs ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-gradient-to-r from-cyan-500 to-teal-600 text-white shadow-sm hover:from-cyan-600 hover:to-teal-700"
            onClick={openCreate}
          >
            <Plus className="h-4 w-4 shrink-0" />
            {selectedDept ? 'เพิ่มรหัส (แผนกที่เลือก)' : 'เพิ่มรหัสแผนกย่อย'}
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-gradient-to-r from-cyan-500 to-teal-600 text-white shadow-sm hover:from-cyan-600 hover:to-teal-700"
            onClick={openDeptMainCreate}
          >
            <Plus className="h-4 w-4 shrink-0" />
            เพิ่มแผนกหลัก
          </Button>
        </div>
      </div>

      <Card className="border-slate-200/80 shadow-sm rounded-xl">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 space-y-4">
          <div>
            <CardTitle className="text-slate-800 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-cyan-600" />
              กรองข้อมูล
            </CardTitle>

          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">ค้นหาแผนก</span>
              <Input
                placeholder="ชื่อ, ชื่อย่อ, ID, RefDepID..."
                value={deptKwInput}
                onChange={(e) => setDeptKwInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              />
            </div>
            <div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">ค้นหารหัสแผนกย่อย</span>
              <Input
                placeholder="code, ชื่อ, รายละเอียด..."
                value={subKwInput}
                onChange={(e) => setSubKwInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              />
            </div>
            <div className="flex min-w-[140px] flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">สถานะรหัส</span>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-full lg:w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="active">เปิดใช้งาน</SelectItem>
                  <SelectItem value="inactive">ปิดใช้งาน</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={applySearch} className="gap-1.5">
                <Search className="h-4 w-4" />
                ค้นหา
              </Button>
              <Button type="button" variant="outline" onClick={resetFilters} className="gap-1.5">
                <RotateCcw className="h-4 w-4" />
                ล้าง
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <DepartmentMasterTable
        departments={departmentsForTable}
        subRows={subRowsFiltered}
        loadingDepartments={filterDeptLoading}
        loadingSubRows={loadingSubs}
        deptKeywordInput={deptKwInput}
        onDeptKeywordInputChange={setDeptKwInput}
        subKeywordInput={subKwInput}
        onSubKeywordInputChange={setSubKwInput}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onSearch={applySearch}
        onResetFilters={resetFilters}
        searchVersion={searchVersion}
        selectedDepartmentId={selectedDept?.ID ?? null}
        onSelectDepartment={(d) => setSelectedDept(d)}
        showFilterToolbar={false}
        onEditMainDepartment={openDeptMainEdit}
      />

      {selectedDept && (
        <DepartmentDetailsCard
          department={selectedDept}
          subRows={detailSubs}
          onClose={() => setSelectedDept(null)}
          onAdd={() => openCreateForDepartmentId(selectedDept.ID)}
          onEditMain={() => openDeptMainEdit(selectedDept)}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
        />
      )}

      <DepartmentFormDialog
        open={deptMainOpen}
        onOpenChange={(o) => {
          setDeptMainOpen(o);
          if (!o) {
            setDeptMainEditDept(null);
            setDeptMainMode('create');
          }
        }}
        saving={creatingDept}
        mode={deptMainMode}
        initialDepartment={deptMainMode === 'edit' ? deptMainEditDept : null}
        onSubmit={submitDeptMainForm}
      />

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
    </div>
  );
}
