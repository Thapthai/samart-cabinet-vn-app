'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ApiResponse, PaginatedResponse } from '@/types/common';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, Plus, RefreshCw, Search, UserSquare } from 'lucide-react';
import CabinetUserDialog, {
  type CabinetOption,
  type CreateCabinetUserFormPayload,
  type EditCabinetUserFormPayload,
} from './CabinetUserDialog';

export type CabinetUsersApiClient = {
  getAll: (params?: { page?: number; limit?: number; keyword?: string }) => Promise<PaginatedResponse<any>>;
  getById: (id: number) => Promise<ApiResponse<any>>;
  create: (body: {
    user_name: string;
    emp_code?: string | null;
    password?: string;
    cabinet_ids?: number[];
  }) => Promise<ApiResponse<any>>;
  update: (id: number, body: { cabinet_ids?: number[] }) => Promise<ApiResponse<any>>;
};

export type CabinetListApiClient = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    keyword?: string;
    sort_by?: string;
    sort_order?: string;
  }) => Promise<PaginatedResponse<any>>;
};

interface LinkedCabinetLink {
  user_cabinet_id: number;
  user_id?: number;
  /** เท่ากับ app_cabinets.stock_id (ฟิลด์ Prisma: cabinet_id) */
  cabinet_id: number;
  cabinet: {
    id: number;
    cabinet_name?: string | null;
    cabinet_code?: string | null;
    stock_id?: number | null;
  } | null;
}

interface Row {
  id: number;
  userName?: string | null;
  empCode?: string | null;
  employee_display?: string | null;
  employee?: {
    empCode?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  cabinet_count?: number;
  linked_cabinets?: LinkedCabinetLink[];
}

/** ชื่อตู้จาก app_cabinets (จับคู่ user_cabinet.cabinet_id = stock_id); ถ้าไม่พบแถวตู้แสดง cabinet_id */
function CabinetLinksBadges({ row }: { row: Row }) {
  const links = row.linked_cabinets;
  if (!links?.length) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {links.map((link) => {
        if (link.cabinet) {
          const label =
            link.cabinet.cabinet_name?.trim() ||
            link.cabinet.cabinet_code?.trim() ||
            `ตู้ #${link.cabinet.id}`;
          return (
            <Badge
              key={link.user_cabinet_id}
              variant="secondary"
              className="h-auto max-w-[280px] flex-col items-start gap-0.5 py-1.5 text-left font-normal"
              title={`cabinet_id ${link.cabinet_id} = stock_id`}
            >
              <span className="font-medium leading-snug text-slate-800">{label}</span>
              <span className="font-mono text-[10px] text-muted-foreground">stock_id {link.cabinet_id}</span>
            </Badge>
          );
        }
        return (
          <Badge
            key={link.user_cabinet_id}
            variant="outline"
            className="border-amber-400 font-mono text-amber-900"
            title={`ไม่มี app_cabinets ที่ stock_id = ${link.cabinet_id}`}
          >
            cabinet_id {link.cabinet_id} (ไม่พบตู้)
          </Badge>
        );
      })}
    </div>
  );
}

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

/** Admin portal — แก้ได้เฉพาะใต้โฟลเดอร์นี้ ไม่แชร์กับ staff */
export default function CabinetUsersWorkspace({
  cabinetUsers,
  cabinets,
}: {
  cabinetUsers: CabinetUsersApiClient;
  cabinets: CabinetListApiClient;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [keywordInput, setKeywordInput] = useState('');
  const [activeKeyword, setActiveKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [cabinetOptions, setCabinetOptions] = useState<CabinetOption[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<Row | null>(null);
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
      const res = await cabinetUsers.getAll({
        page,
        limit: PAGE_SIZE,
        keyword: activeKeyword.trim() || undefined,
      });
      if (res.data && Array.isArray(res.data)) {
        setRows(res.data as Row[]);
        setTotal(res.total ?? 0);
        setTotalPages(res.lastPage ?? Math.max(1, Math.ceil((res.total ?? 0) / PAGE_SIZE)));
      }
    } catch {
      toast.error('โหลดรายการผู้ใช้ในตู้ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [cabinetUsers, page, activeKeyword]);

  useEffect(() => {
    loadCabinets();
  }, [loadCabinets]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const openCreate = () => {
    setDialogMode('create');
    setEditTarget(null);
    setEditInitial(null);
    setDialogOpen(true);
  };

  const openEdit = async (row: Row) => {
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
    setPage(1);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <UserSquare className="h-6 w-6 text-indigo-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User ในตู้</h1>
              <p className="text-sm text-gray-500">
                เพิ่มชื่อผู้ใช้ตู้และกำหนดว่าขึ้นได้ที่ตู้ไหน
              </p>
            </div>
          </div>
          <Button
            onClick={openCreate}
            className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            เพิ่ม User ในตู้
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">ค้นหา</CardTitle>
            <CardDescription>ค้นจาก UserName หรือ EmpCode</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="relative flex min-w-[200px] flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="คำค้น..."
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="max-w-md pl-9"
                />
              </div>
              <Button type="button" variant="secondary" onClick={handleSearch} className="gap-1.5 shrink-0">
                <Search className="h-4 w-4" />
                ค้นหา
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => loadUsers()}
              aria-label="รีเฟรช"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-2">
            <div>
              <CardTitle>รายการ User ในตู้</CardTitle>
              <CardDescription>
                {loading && rows.length === 0
                  ? 'กำลังโหลด…'
                  : `แสดง ${rows.length} รายการ จากทั้งหมด ${total} รายการ `}
              </CardDescription>
            </div>
            <Button type="button" size="sm" className="shrink-0 gap-1.5" onClick={() => openCreate()}>
              <Plus className="h-4 w-4" />
              เพิ่ม User ในตู้
            </Button>
          </CardHeader>
          <CardContent>
            {loading && rows.length === 0 ? (
              <div className="flex justify-center py-12 text-muted-foreground">
                <RefreshCw className="h-8 w-8 animate-spin" />
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <p className="text-muted-foreground">ไม่พบรายการ</p>
                <Button type="button" className="gap-2" onClick={() => openCreate()}>
                  <Plus className="h-4 w-4" />
                  เพิ่ม User ในตู้
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">#</TableHead>
                      <TableHead>ชื่อ (UserName)</TableHead>
                      <TableHead className="min-w-[160px]">พนักงาน (employee)</TableHead>
                      <TableHead className="min-w-[180px] max-w-[320px]">
                        ชื่อตู้
                      </TableHead>
                      <TableHead className="text-center">จำนวน</TableHead>
                      <TableHead className="w-[100px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-muted-foreground">
                          {(page - 1) * PAGE_SIZE + i + 1}
                        </TableCell>
                        <TableCell className="font-medium">{r.userName ?? '—'}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-slate-800">
                              {r.employee_display?.trim() || '—'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {r.empCode?.trim()
                                ? `EmpCode · ${r.empCode}`
                                : 'ไม่ผูก EmpCode'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[420px] align-top text-sm">
                          <CabinetLinksBadges row={r} />
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{r.cabinet_count ?? 0}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                            <Edit className="mr-1 h-4 w-4" />
                            แก้ไข
                          </Button>
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
