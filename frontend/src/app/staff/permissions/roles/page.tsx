'use client';

import { useState, useEffect } from 'react';
import { staffRolePermissionApi, staffRoleApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Save, Loader2, CornerDownRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  staffRoleIsStaffPermissionHead,
  normalizeStaffRoleCode,
  staffRoleIsItFamily,
  staffRoleIsWarehouseFamily,
  readStaffRoleCodeFromStorage,
  staffPortalCanEditPermissionColumn,
} from '@/lib/staffRolePolicy';
import {
  getAllStaffPermissionHrefs,
  getStaffPermissionTableRows,
  normalizeStaffPermissionMenuHref,
} from '@/lib/staffPermissionTable';

interface Role {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface Permission {
  id: number;
  role_code?: string;
  role_id?: number;
  menu_href: string;
  can_access: boolean;
  created_at: string;
  updated_at: string;
  role?: {
    code: string;
    name: string;
  };
}

export default function ManageRolesPage() {
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesResponse, permissionsResponse] = await Promise.all([
        staffRoleApi.getAll(),
        staffRolePermissionApi.getAll(),
      ]);

      if (rolesResponse.success && rolesResponse.data) {
        const activeRoles = (rolesResponse.data as Role[]).filter((role) => role.is_active);
        setRoles(activeRoles);

        const permissionsMap: Record<string, Record<string, boolean>> = {};
        const hrefs = getAllStaffPermissionHrefs();
        activeRoles.forEach((role) => {
          permissionsMap[role.code] = {};
          hrefs.forEach((href) => {
            permissionsMap[role.code][href] = false;
          });
        });

        if (permissionsResponse.success && permissionsResponse.data) {
          (permissionsResponse.data as Permission[]).forEach((perm) => {
            const roleCode = perm.role_code || perm.role?.code;
            const menuHref = normalizeStaffPermissionMenuHref(perm.menu_href);
            if (roleCode && menuHref && permissionsMap[roleCode] && permissionsMap[roleCode][menuHref] !== undefined) {
              permissionsMap[roleCode][menuHref] = perm.can_access;
            }
          });
        }

        setPermissions(permissionsMap);
      } else {
        toast.error(rolesResponse.message || 'ไม่สามารถโหลดข้อมูล Roles ได้');
        initializeDefaultPermissions();
      }
    } catch (error: unknown) {
      console.error('Load data error:', error);
      toast.error(error instanceof Error ? error.message : 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์');
      initializeDefaultPermissions();
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultPermissions = () => {
    const defaultPermissions: Record<string, Record<string, boolean>> = {};
    const hrefs = getAllStaffPermissionHrefs();
    const manageUserPaths = ['/staff/management/permission-users', '/staff/permissions/users'];
    const manageRolePaths = [
      '/staff/management/permission-roles',
      '/staff/management/staff-roles',
      '/staff/permissions/roles',
    ];

    roles.forEach((role) => {
      defaultPermissions[role.code] = {};
      hrefs.forEach((href) => {
        if (staffRoleIsStaffPermissionHead(role.code)) {
          defaultPermissions[role.code][href] = true;
        } else {
          const isManageUsers = manageUserPaths.includes(href);
          const isManageRoles = manageRolePaths.includes(href);
          defaultPermissions[role.code][href] = !isManageUsers && !isManageRoles;
        }
      });
    });
    setPermissions(defaultPermissions);
  };

  const handlePermissionChange = (role: string, menu: string, checked: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [menu]: checked,
      },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const viewerRoleCode = readStaffRoleCodeFromStorage();
      const permissionsArray: Array<{ role_code: string; menu_href: string; can_access: boolean }> = [];

      Object.keys(permissions).forEach((roleCode) => {
        if (!staffPortalCanEditPermissionColumn(viewerRoleCode, roleCode)) return;
        Object.keys(permissions[roleCode]).forEach((menu) => {
          permissionsArray.push({
            role_code: roleCode,
            menu_href: menu,
            can_access: permissions[roleCode][menu],
          });
        });
      });

      const response = await staffRolePermissionApi.bulkUpdate(permissionsArray);
      if (response.success) {
        toast.success('บันทึกการกำหนดสิทธิ์เรียบร้อยแล้ว');
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        toast.error(response.message || 'ไม่สามารถบันทึกข้อมูลได้');
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์');
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    const r = normalizeStaffRoleCode(role);
    if (staffRoleIsItFamily(r)) return 'default';
    if (staffRoleIsWarehouseFamily(r)) return 'secondary';
    return 'outline';
  };

  const viewerRoleCode = readStaffRoleCodeFromStorage();

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-4 text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">กำหนดสิทธิ์</h2>
        <p className="mt-1 text-gray-600">
          หัวหน้าสายแก้สิทธิ์ของลูกสายในสายเดียวกันได้ — หรือแก้เฉพาะคอลัมน์ของ Role ที่ตรงกับบทบาทคุณ
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>ตารางกำหนดสิทธิ์</CardTitle>
              <CardDescription>เลือกเมนูที่แต่ละ Role สามารถเข้าถึงได้</CardDescription>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  บันทึก
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">เมนู</TableHead>
                  {roles.map((role) => (
                    <TableHead key={role.code} className="min-w-[150px] text-center">
                      <div>
                        <Badge variant={getRoleBadgeVariant(role.code)} className="mb-1">
                          {role.name}
                        </Badge>
                        {role.description ? (
                          <div className="mt-1 text-xs font-normal text-gray-500">{role.description}</div>
                        ) : null}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {getStaffPermissionTableRows().map((row, rowIdx) => {
                  if (row.type === 'section') {
                    return (
                      <TableRow
                        key={`section-${rowIdx}-${row.label}`}
                        className="bg-slate-50/90 hover:bg-slate-50/90"
                      >
                        <TableCell
                          colSpan={1 + roles.length}
                          className="py-2.5 font-semibold text-slate-800"
                        >
                          {row.label}
                        </TableCell>
                      </TableRow>
                    );
                  }
                  const isDashboard = row.href === '/staff/dashboard';
                  return (
                    <TableRow key={`${row.href}-${rowIdx}`}>
                      <TableCell
                        className={
                          row.indent ? 'flex items-center gap-2 pl-8 font-medium' : 'font-medium'
                        }
                      >
                        {row.indent ? (
                          <CornerDownRight className="inline-block h-4 w-4 shrink-0 text-gray-400" />
                        ) : null}
                        {row.label}
                      </TableCell>
                      {roles.map((role) => {
                        const canEditCol = staffPortalCanEditPermissionColumn(viewerRoleCode, role.code);
                        return (
                          <TableCell key={role.code} className="text-center">
                            <Checkbox
                              checked={permissions[role.code]?.[row.href] || false}
                              onCheckedChange={
                                isDashboard || !canEditCol
                                  ? undefined
                                  : (checked: boolean) =>
                                      handlePermissionChange(role.code, row.href, checked)
                              }
                              disabled={isDashboard || !canEditCol}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            ข้อมูลการใช้งาน
          </CardTitle>
          <CardDescription>หน้านี้สำหรับกำหนดสิทธิ์การเข้าถึงเมนูตามบทบาท</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              • หัวหน้าสาย (IT-001 / WH-001) แก้สิทธิ์ของลูกสายในสายเดียวกันได้ — ผู้อื่นแก้ได้เฉพาะคอลัมน์ Role
              ของตัวเอง
            </p>
            <p className="text-sm text-gray-600">
              • เมนู <strong>Dashboard</strong> ล็อกเปิดเสมอ (ไม่ให้ปิด)
            </p>
            <p className="text-sm text-gray-600">
              • คลิก <strong>บันทึก</strong> เพื่อบันทึกการเปลี่ยนแปลง
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
