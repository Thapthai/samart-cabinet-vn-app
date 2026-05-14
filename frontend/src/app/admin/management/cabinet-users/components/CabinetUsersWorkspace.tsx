'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import CabinetUserDialog, {
  type CabinetOption,
  type CreateCabinetUserFormPayload,
  type EditCabinetUserFormPayload,
} from './CabinetUserDialog';
import { CabinetUsersPageHeader } from './CabinetUsersPageHeader';
import { CabinetUsersSearchCard } from './CabinetUsersSearchCard';
import { CabinetUsersTableCard } from './CabinetUsersTableCard';
import { CABINET_USERS_PAGE_SIZE } from './pagination';
import type { CabinetListApiClient, CabinetUserRow, CabinetUsersApiClient } from './types';

export type { CabinetListApiClient, CabinetUsersApiClient } from './types';

/** Admin portal — แก้ได้เฉพาะใต้โฟลเดอร์นี้ ไม่แชร์กับ staff */
export default function CabinetUsersWorkspace({
  cabinetUsers,
  cabinets,
}: {
  cabinetUsers: CabinetUsersApiClient;
  cabinets: CabinetListApiClient;
}) {
  const [rows, setRows] = useState<CabinetUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [keywordInput, setKeywordInput] = useState('');
  const [activeKeyword, setActiveKeyword] = useState('');
  const [departmentIdInput, setDepartmentIdInput] = useState('');
  const [activeDepartmentId, setActiveDepartmentId] = useState('');
  const [cabinetIdInput, setCabinetIdInput] = useState('');
  const [activeCabinetId, setActiveCabinetId] = useState('');
  const [page, setPage] = useState(1);
  /** เพิ่มทุกครั้งที่กดค้นหา — ให้โหลดรายการซ้ำได้แม้เงื่อนไข active เหมือนเดิม */
  const [listQueryNonce, setListQueryNonce] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [cabinetOptions, setCabinetOptions] = useState<CabinetOption[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<CabinetUserRow | null>(null);
  const [editInitial, setEditInitial] = useState<{
    id: number;
    userName?: string | null;
    empCode?: string | null;
    cabinet_ids: number[];
  } | null>(null);

  const loadCabinets = useCallback(async () => {
    try {
      const res = await cabinets.getAll({ page: 1, limit: 500 });
      if (res.data && Array.isArray(res.data)) {
        setCabinetOptions(res.data as CabinetOption[]);
      }
    } catch {
      toast.error('โหลดรายการตู้ไม่สำเร็จ');
    }
  }, [cabinets]);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const deptNum = activeDepartmentId ? parseInt(activeDepartmentId, 10) : NaN;
      const cabNum = activeCabinetId ? parseInt(activeCabinetId, 10) : NaN;
      const res = await cabinetUsers.getAll({
        page,
        limit: CABINET_USERS_PAGE_SIZE,
        keyword: activeKeyword.trim() || undefined,
        department_id: Number.isFinite(deptNum) && deptNum > 0 ? deptNum : undefined,
        cabinet_id: Number.isFinite(cabNum) && cabNum > 0 ? cabNum : undefined,
      });
      if (res.data && Array.isArray(res.data)) {
        setRows(res.data as CabinetUserRow[]);
        setTotal(res.total ?? 0);
        setTotalPages(res.lastPage ?? Math.max(1, Math.ceil((res.total ?? 0) / CABINET_USERS_PAGE_SIZE)));
      }
    } catch {
      toast.error('โหลดรายการผู้ใช้ในตู้ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [cabinetUsers, page, activeKeyword, activeDepartmentId, activeCabinetId]);

  useEffect(() => {
    loadCabinets();
  }, [loadCabinets]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers, listQueryNonce]);

  const openCreate = () => {
    setDialogMode('create');
    setEditTarget(null);
    setEditInitial(null);
    setDialogOpen(true);
  };

  const openEdit = async (row: CabinetUserRow) => {
    setDialogMode('edit');
    setEditTarget(row);
    setEditInitial(null);
    try {
      const res = await cabinetUsers.getById(row.id);
      const d = res.data as {
        userName?: string | null;
        empCode?: string | null;
        cabinet_ids?: number[];
      };
      if (res.success && d) {
        setEditInitial({
          id: row.id,
          userName: d.userName,
          empCode: d.empCode,
          cabinet_ids: Array.isArray(d.cabinet_ids) ? d.cabinet_ids : [],
        });
        setDialogOpen(true);
      } else {
        toast.error('โหลดรายละเอียดไม่สำเร็จ');
      }
    } catch {
      toast.error('โหลดรายละเอียดไม่สำเร็จ');
    }
  };

  const handleSubmit = async (payload: CreateCabinetUserFormPayload | EditCabinetUserFormPayload) => {
    try {
      if (dialogMode === 'create' && 'user_name' in payload) {
        const res = await cabinetUsers.create(payload);
        if (res.success) {
          toast.success((res as { message?: string }).message || 'สร้างแล้ว');
          const w = (res as { warnings?: string[] }).warnings;
          if (w?.length) w.forEach((x) => toast.warning(x));
          setDialogOpen(false);
          loadUsers();
        } else {
          toast.error((res as { message?: string }).message || 'สร้างไม่สำเร็จ');
        }
      } else if (editTarget && 'cabinet_ids' in payload && !('user_name' in payload)) {
        const res = await cabinetUsers.update(editTarget.id, payload);
        if (res.success) {
          toast.success((res as { message?: string }).message || 'บันทึกแล้ว');
          const w = (res as { warnings?: string[] }).warnings;
          if (w?.length) w.forEach((x) => toast.warning(x));
          setDialogOpen(false);
          loadUsers();
        } else {
          toast.error((res as { message?: string }).message || 'บันทึกไม่สำเร็จ');
        }
      }
    } catch (e: unknown) {
      const msg =
        typeof e === 'object' && e !== null && 'response' in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(msg || 'เกิดข้อผิดพลาด');
    }
  };

  const handleSearch = () => {
    setActiveKeyword(keywordInput);
    setActiveDepartmentId(departmentIdInput);
    setActiveCabinetId(cabinetIdInput);
    setPage(1);
    setListQueryNonce((n) => n + 1);
  };

  const handleResetFilters = () => {
    setKeywordInput('');
    setActiveKeyword('');
    setDepartmentIdInput('');
    setActiveDepartmentId('');
    setCabinetIdInput('');
    setActiveCabinetId('');
    setPage(1);
    setListQueryNonce((n) => n + 1);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <div className="space-y-6">
        {/* <CabinetUsersPageHeader onAddClick={openCreate} /> */}

        <CabinetUsersSearchCard
          keywordInput={keywordInput}
          onKeywordChange={setKeywordInput}
          departmentId={departmentIdInput}
          onDepartmentIdChange={setDepartmentIdInput}
          cabinetId={cabinetIdInput}
          onCabinetIdChange={setCabinetIdInput}
          onSearch={handleSearch}
          onReset={handleResetFilters}
          onRefresh={() => loadUsers()}
          loading={loading}
        />

        <CabinetUsersTableCard
          rows={rows}
          loading={loading}
          total={total}
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          onEditRow={openEdit}
          onCreateClick={openCreate}
        />
      </div>

      <CabinetUserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        cabinetOptions={cabinetOptions}
        initial={dialogMode === 'edit' ? editInitial : null}
        onSubmit={handleSubmit}
      />
    </>
  );
}
