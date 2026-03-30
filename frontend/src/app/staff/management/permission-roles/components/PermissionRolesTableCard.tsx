'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, Loader2, CornerDownRight, Plus } from 'lucide-react';
import { staffMenuItems } from '@/app/staff/menus';
import { normalizeStaffRoleCode, staffRoleIsItFamily, staffRoleIsWarehouseFamily } from '@/lib/staffRolePolicy';
import type { StaffPermissionRole } from '../types';

export interface PermissionRolesTableCardProps {
  roles: StaffPermissionRole[];
  menuItems: Array<{ value: string; label: string }>;
  permissions: Record<string, Record<string, boolean>>;
  saving: boolean;
  onSave: () => void;
  onOpenAddRole: () => void;
  onPermissionChange: (roleCode: string, menuHref: string, checked: boolean) => void;
}

function roleBadgeVariant(roleCode: string) {
  const r = normalizeStaffRoleCode(roleCode);
  if (staffRoleIsItFamily(r)) return 'default' as const;
  if (staffRoleIsWarehouseFamily(r)) return 'secondary' as const;
  return 'outline' as const;
}

export default function PermissionRolesTableCard({
  roles,
  menuItems,
  permissions,
  saving,
  onSave,
  onOpenAddRole,
  onPermissionChange,
}: PermissionRolesTableCardProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>ตารางกำหนดสิทธิ์</CardTitle>
            <CardDescription>เลือกเมนูที่แต่ละ Role เข้าถึงได้ — แสดงทุก Role (ควบคุมการเห็นเมนูนี้จากสิทธิ์เมนู Staff)</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={onOpenAddRole}>
              <Plus className="mr-2 h-4 w-4" />
              เพิ่ม Role
            </Button>
            <Button onClick={onSave} disabled={saving}>
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
                      <Badge variant={roleBadgeVariant(role.code)} className="mb-1">
                        {role.name}
                      </Badge>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {menuItems.map((menu) => {
                const isSubmenu = staffMenuItems.some(
                  (main) => main.submenu && main.submenu.some((sub) => sub.href === menu.value),
                );
                return (
                  <TableRow key={menu.value}>
                    <TableCell className={isSubmenu ? 'flex items-center gap-2 pl-8 font-medium' : 'font-medium'}>
                      {isSubmenu && <CornerDownRight className="mr-1 inline-block h-4 w-4 text-gray-400" />}
                      {menu.label}
                    </TableCell>
                    {roles.map((role) => {
                      const isDashboard = menu.value === '/staff/dashboard';
                      return (
                        <TableCell key={role.code} className="text-center">
                          <Checkbox
                            checked={permissions[role.code]?.[menu.value] || false}
                            onCheckedChange={
                              isDashboard
                                ? undefined
                                : (checked) => onPermissionChange(role.code, menu.value, checked === true)
                            }
                            disabled={isDashboard}
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
  );
}
