'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { staffRoleApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UserCog, Loader2, Pencil, Plus, Trash2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import {
  readStaffRoleCodeFromStorage,
  staffPortalCanManageStaffRoleRecord,
  staffPortalCanDeleteStaffRole,
} from '@/lib/staffRolePolicy';
import type { StaffRoleRow } from '@/app/admin/management/staff-roles/components/EditStaffRoleDialog';
import AddStaffRoleDialog from '@/app/staff/management/permission-roles/components/AddStaffRoleDialog';
import { StaffEditStaffRoleDialog } from './components/StaffEditStaffRoleDialog';

function messageFromAxios(err: unknown): string | undefined {
  if (!err || typeof err !== 'object' || !('response' in err)) return undefined;
  const data = (err as { response?: { data?: { message?: string | string[] } } }).response?.data;
  const msg = data?.message;
  return Array.isArray(msg) ? msg.join(', ') : msg;
}

export default function StaffManagementStaffRolesPage() {
  const [rows, setRows] = useState<StaffRoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<StaffRoleRow | null>(null);

  const viewerRoleCode = readStaffRoleCodeFromStorage();
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setListError(null);
      const res = await staffRoleApi.getAll();
      if (res.success === false) {
        const m = (res as { message?: string }).message || 'โหลด Role ไม่สำเร็จ';
        setListError(m);
        toast.error(m);
        setRows([]);
        return;
      }
      const data = Array.isArray(res.data) ? res.data : [];
      setRows(
        data.map((r: Record<string, unknown>) => ({
          id: Number(r.id),
          code: String(r.code ?? ''),
          name: String(r.name ?? ''),
          description: r.description != null ? String(r.description) : null,
          is_active: r.is_active !== false,
        })),
      );
    } catch (e) {
      const m = messageFromAxios(e) || 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ';
      setListError(m);
      toast.error(m);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const canManage = useCallback(
    (r: StaffRoleRow) => staffPortalCanManageStaffRoleRecord(viewerRoleCode, r.code),
    [viewerRoleCode],
  );

  const canDelete = useCallback(
    (r: StaffRoleRow) => staffPortalCanDeleteStaffRole(viewerRoleCode, r.code),
    [viewerRoleCode],
  );

  const handleDelete = async (r: StaffRoleRow) => {
    if (!canDelete(r)) {
      toast.error('ไม่มีสิทธิ์ลบ Role นี้');
      return;
    }
    if (
      !confirm(
        `ลบ Role "${r.code}" (${r.name})?\nถ้ามี Staff User หรือข้อมูลอ้างอิง Role นี้ ระบบจะไม่อนุญาต`,
      )
    ) {
      return;
    }
    try {
      await staffRoleApi.delete(r.id);
      toast.success('ลบ Role แล้ว');
      await load();
    } catch (err: unknown) {
      toast.error(messageFromAxios(err) || 'ลบไม่สำเร็จ');
    }
  };

  const sorted = [...rows].sort((a, b) => a.code.localeCompare(b.code, 'en'));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 p-2.5 shadow-lg">
            <UserCog className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">จัดการ Staff Role</h1>
            <p className="text-sm text-slate-500">
              หัวหน้าสายแก้ไข/ลบลูกสายในสายเดียวกันได้ — หรือแก้ Role ที่ตรงกับบทบาทของคุณ — กำหนดสิทธิ์เมนูที่{' '}
              <Link
                href="/staff/management/permission-roles"
                className="text-violet-600 underline-offset-2 hover:underline"
              >
                กำหนดสิทธิ์ผู้ใช้งาน Staff
              </Link>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'รีเฟรช'}
          </Button>
          <Button type="button" onClick={() => setCreateOpen(true)} className="shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            เพิ่ม Role
          </Button>
        </div>
      </div>

      {listError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <p className="font-medium">โหลดข้อมูลไม่สำเร็จ</p>
          <p className="mt-1">{listError}</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => load()}>
            ลองอีกครั้ง
          </Button>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-violet-600" />
            รายการ Role
          </CardTitle>
          <CardDescription>รหัส Role สร้างครั้งแรกแล้วคงที่ — แก้ไขตามสิทธิ์ของคุณ</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : sorted.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">ยังไม่มี Role</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px] font-mono">รหัส</TableHead>
                    <TableHead className="min-w-[160px]">ชื่อแสดง</TableHead>
                    <TableHead className="hidden md:table-cell min-w-[200px]">คำอธิบาย</TableHead>
                    <TableHead className="w-[100px]">สถานะ</TableHead>
                    <TableHead className="w-[120px] text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((r) => {
                    const manage = canManage(r);
                    const del = canDelete(r);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono font-medium">{r.code}</TableCell>
                        <TableCell>{r.name}</TableCell>
                        <TableCell className="hidden max-w-md truncate text-muted-foreground md:table-cell">
                          {r.description || '—'}
                        </TableCell>
                        <TableCell>
                          {r.is_active ? (
                            <Badge className="bg-emerald-600">ใช้งาน</Badge>
                          ) : (
                            <Badge variant="secondary">ปิด</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            type="button"
                            disabled={!manage}
                            title={manage ? 'แก้ไข' : 'ไม่มีสิทธิ์แก้ไข Role นี้'}
                            onClick={() => {
                              if (!manage) return;
                              setSelected(r);
                              setEditOpen(true);
                            }}
                            aria-label="แก้ไข"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            type="button"
                            disabled={!del}
                            title={del ? 'ลบ' : 'ไม่มีสิทธิ์ลบ Role นี้'}
                            onClick={() => {
                              if (!del) return;
                              handleDelete(r);
                            }}
                            aria-label="ลบ"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddStaffRoleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        viewerRoleCode={viewerRoleCode}
        onCreated={load}
      />

      <StaffEditStaffRoleDialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setSelected(null);
        }}
        role={selected}
        onSaved={load}
      />
    </div>
  );
}
