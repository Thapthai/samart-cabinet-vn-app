'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, Loader2, CornerDownRight, Plus } from 'lucide-react';
import { staffMenuItems } from '@/app/staff/menus';
import {
  staffRoleCanManageRoleColumn,
  staffRoleIsHeadIt,
  staffRoleIsHeadWh,
  normalizeStaffRoleCode,
  staffRoleIsItFamily,
  staffRoleIsWarehouseFamily,
  staffRoleVisibleInPermissionRolesTable,
} from '@/lib/staffRolePolicy';
import type { StaffPermissionRole } from '../types';

export interface PermissionRolesTableCardProps {
  roles: StaffPermissionRole[];
  menuItems: Array<{ value: string; label: string }>;
  permissions: Record<string, Record<string, boolean>>;
  viewerRole: string;
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
  viewerRole,
  saving,
  onSave,
  onOpenAddRole,
  onPermissionChange,
}: PermissionRolesTableCardProps) {
  const visibleRoles = useMemo(
    () => roles.filter((r) => staffRoleVisibleInPermissionRolesTable(viewerRole, r.code)),
    [roles, viewerRole],
  );

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>ตารางกำหนดสิทธิ์</CardTitle>
            <CardDescription>

              {(staffRoleIsHeadIt(viewerRole) || staffRoleIsHeadWh(viewerRole)) && (
                <span className="mt-1 block text-muted-foreground">
                  {staffRoleIsHeadIt(viewerRole)
                    ? 'แสดงเฉพาะ Role สาย IT'
                    : 'แสดงเฉพาะ Role สาย Warehouse'}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {staffRoleIsHeadIt(viewerRole) || staffRoleIsHeadWh(viewerRole) ? (
              <Button type="button" variant="outline" onClick={onOpenAddRole}>
                <Plus className="mr-2 h-4 w-4" />
                เพิ่ม Role
              </Button>
            ) : null}
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
                {visibleRoles.map((role) => (
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
                    {visibleRoles.map((role) => {
                      const isDashboard = menu.value === '/staff/dashboard';
                      const canEditCol = staffRoleCanManageRoleColumn(viewerRole, role.code);
                      return (
                        <TableCell key={role.code} className="text-center">
                          <Checkbox
                            checked={permissions[role.code]?.[menu.value] || false}
                            onCheckedChange={
                              isDashboard
                                ? undefined
                                : (checked) => onPermissionChange(role.code, menu.value, checked === true)
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
  );
}
