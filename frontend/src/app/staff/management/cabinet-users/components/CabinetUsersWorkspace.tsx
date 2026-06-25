'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { staffCabinetDepartmentApi } from '@/lib/staffApi/cabinetApi';
import { getStaffAllowedDepartmentIds } from '@/lib/staffDepartmentScope';
import CabinetUserDialog, {
  type CabinetOption,
  type CreateCabinetUserFormPayload,
  type EditCabinetUserFormPayload,
} from './CabinetUserDialog';
import {
  CabinetUsersSearchCard,
  type CabinetUsersSearchFilters,
} from './CabinetUsersSearchCard';
import { CabinetUsersTableCard } from './CabinetUsersTableCard';
import { CABINET_USERS_PAGE_SIZE } from './pagination';
import type { CabinetListApiClient, CabinetUserRow, CabinetUsersApiClient } from './types';

export type { CabinetListApiClient, CabinetUsersApiClient } from './types';

const defaultFilters: CabinetUsersSearchFilters = {
  keyword: '',
  departmentId: '',
  cabinetId: '',
};

/** Staff — โค้ดแยกจาก admin เพื่อให้ปรับพฤติกรรม staff ได้โดยไม่กระทบ admin */
export default function CabinetUsersWorkspace({
  cabinetUsers,
  cabinets,
}: {
  cabinetUsers: CabinetUsersApiClient;
  cabinets: CabinetListApiClient;
}) {
  const [rows, setRows] = useState<CabinetUserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeFilters, setActiveFilters] = useState<CabinetUsersSearchFilters>(defaultFilters);
  const [page, setPage] = useState(1);
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
      const allowed = await getStaffAllowedDepartmentIds();
      const unique = new Map<number, CabinetOption>();
      const loadFromMappings = (
        mappings: Array<{
          status?: string;
          cabinet?: { id: number; cabinet_name?: string; cabinet_code?: string };
        }>,
      ) => {
        mappings
          .filter((m) => m.status === 'ACTIVE' && m.cabinet && typeof m.cabinet.id === 'number')
          .forEach((m) => {
            const c = m.cabinet!;
            if (!unique.has(c.id)) {
              unique.set(c.id, {
                id: c.id,
                cabinet_name: c.cabinet_name,
                cabinet_code: c.cabinet_code,
              } as CabinetOption);
            }
          });
      };

      if (Array.isArray(allowed) && allowed.length > 0) {
        const results = await Promise.all(
          allowed.map((deptId) => staffCabinetDepartmentApi.getAll({ departmentId: deptId })),
        );
        for (const res of results) {
          if (res.success && Array.isArray(res.data)) {
            loadFromMappings(
              res.data as Array<{
                status?: string;
                cabinet?: { id: number; cabinet_name?: string; cabinet_code?: string };
              }>,
            );
          }
        }
      } else if (allowed === null) {
        const res = await cabinets.getAll({ page: 1, limit: 500 });
        if (res.data && Array.isArray(res.data)) {
          (res.data as CabinetOption[]).forEach((c) => {
            if (c.id != null) unique.set(c.id, c);
          });
        }
      }

      setCabinetOptions(Array.from(unique.values()));
    } catch {
      toast.error('โหลดรายการตู้ไม่สำเร็จ');
    }
  }, [cabinets]);

  const loadUsers = useCallback(async () => {
    if (!hasSearched || !activeFilters.departmentId.trim()) {
      setRows([]);
      setTotal(0);
      setTotalPages(1);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const deptNum = parseInt(activeFilters.departmentId, 10);
      const cabNum = activeFilters.cabinetId ? parseInt(activeFilters.cabinetId, 10) : NaN;
      const res = await cabinetUsers.getAll({
        page,
        limit: CABINET_USERS_PAGE_SIZE,
        keyword: activeFilters.keyword.trim() || undefined,
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
  }, [cabinetUsers, page, activeFilters, hasSearched]);

  useEffect(() => {
    void loadCabinets();
  }, [loadCabinets]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

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
          void loadUsers();
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
          void loadUsers();
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

  const handleSearch = useCallback((filters: CabinetUsersSearchFilters) => {
    setHasSearched(true);
    setActiveFilters(filters);
    setPage(1);
  }, []);

  const handleResetFilters = useCallback(() => {
    setHasSearched(false);
    setActiveFilters(defaultFilters);
    setRows([]);
    setTotal(0);
    setTotalPages(1);
    setPage(1);
  }, []);

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <div className="space-y-6">
        <CabinetUsersSearchCard
          onSearch={handleSearch}
          onReset={handleResetFilters}
          onRefresh={() => void loadUsers()}
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
