'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, Loader2, CornerDownRight, Plus } from 'lucide-react';
import { getStaffPermissionTableRows } from '@/lib/staffPermissionTable';
import {
  normalizeStaffRoleCode,
  staffRoleIsItFamily,
  staffRoleIsWarehouseFamily,
  staffPortalCanEditPermissionColumn,
} from '@/lib/staffRolePolicy';
import type { StaffPermissionRole } from '../types';

export interface PermissionRolesTableCardProps {
  roles: StaffPermissionRole[];
  viewerRoleCode: string;
  canCreateRole: boolean;
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
  viewerRoleCode,
  canCreateRole,
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
            <CardDescription>เลือกเมนูที่แต่ละ Role สามารถเข้าถึงได้</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={onOpenAddRole} disabled={!canCreateRole}>
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
                        row.indent
                          ? 'flex items-center gap-2 pl-8 font-medium'
                          : 'font-medium'
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
                                : (checked) =>
                                    onPermissionChange(role.code, row.href, checked === true)
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
