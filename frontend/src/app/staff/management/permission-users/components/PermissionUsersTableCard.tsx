'use client';

import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, Search, X } from 'lucide-react';
import {
  staffRoleDisplayLabel,
  staffRoleIsHeadIt,
  staffRoleIsHeadWh,
  staffRoleIsStrictDash001Head,
  staffRoleCanManageStaffUserRow,
  normalizeStaffRoleCode,
  staffRoleIsItFamily,
  staffRoleIsWarehouseFamily,
} from '@/lib/staffRolePolicy';
import type { StaffUser } from '../types';
import PermissionUsersPageLoading from './PermissionUsersPageLoading';

export interface PermissionUsersTableCardProps {
  viewerRole: string;
  visibleUsers: StaffUser[];
  loading: boolean;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onEditUser: (user: StaffUser) => void;
  createDialog: ReactNode;
}

function roleBadgeVariant(role: string) {
  const r = normalizeStaffRoleCode(role);
  if (staffRoleIsItFamily(r)) return 'default' as const;
  if (staffRoleIsWarehouseFamily(r)) return 'secondary' as const;
  return 'outline' as const;
}

export default function PermissionUsersTableCard({
  viewerRole,
  visibleUsers,
  loading,
  searchQuery,
  onSearchQueryChange,
  onEditUser,
  createDialog,
}: PermissionUsersTableCardProps) {
  const allowed = staffRoleIsStrictDash001Head(viewerRole);

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>รายการ User</CardTitle>
            <CardDescription>
              {staffRoleIsHeadIt(viewerRole) && (
                <span className="mt-1 block text-muted-foreground">แสดงเฉพาะผู้ใช้ที่มี Role สาย IT</span>
              )}
              {staffRoleIsHeadWh(viewerRole) && (
                <span className="mt-1 block text-muted-foreground">แสดงเฉพาะผู้ใช้ที่มี Role สาย Warehouse</span>
              )}
            </CardDescription>
          </div>
          {createDialog}
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <Input
              placeholder="ค้นหา User (อีเมล, ชื่อ, บทบาท)..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
            />
            {searchQuery ? (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 transform"
                type="button"
                onClick={() => onSearchQueryChange('')}
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <PermissionUsersPageLoading />
        ) : !allowed ? (
          <div className="py-8 text-center text-gray-500">
            หน้านี้ใช้ได้เฉพาะบัญชีที่มี Role <strong>IT-001</strong> หรือ <strong>WH-001</strong> เท่านั้น
          </div>
        ) : visibleUsers.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            {searchQuery ? 'ไม่พบข้อมูลที่ค้นหา' : 'ไม่มีข้อมูล User ในสายงานที่คุณดูแล'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>ชื่อ-นามสกุล</TableHead>
                <TableHead>อีเมล</TableHead>
                <TableHead>บทบาท</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleUsers.map((user) => {
                const canManageRow =
                  staffRoleIsStrictDash001Head(viewerRole) && staffRoleCanManageStaffUserRow(viewerRole, user.role);
                return (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell className="font-medium">
                      {user.fname} {user.lname}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant(user.role)}>{staffRoleDisplayLabel(user.role)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? 'default' : 'secondary'}>
                        {user.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="icon"
                        type="button"
                        disabled={!canManageRow}
                        onClick={() => onEditUser(user)}
                        title={
                          canManageRow
                            ? 'แก้ไข Role และสถานะใช้งาน'
                            : 'แก้ไขได้เฉพาะ Role ย่อยในสาย (ไม่รวมบัญชีหัวหน้าสาย)'
                        }
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
