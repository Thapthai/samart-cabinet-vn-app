'use client';

import { Pencil, Trash2, RefreshCw } from 'lucide-react';
import type { EmployeeRow } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmployeeLinkedBadge } from './EmployeeLinkedBadge';
import { generatePageNumbers } from './employeePagination';

export interface EmployeeTableProps {
  employees: EmployeeRow[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onEdit: (row: EmployeeRow) => void;
  onDelete: (row: EmployeeRow) => void;
}

export default function EmployeeTable({
  employees,
  loading,
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onEdit,
  onDelete,
}: EmployeeTableProps) {
  const canDelete = (row: EmployeeRow) =>
    row.linkedStaffUser == null && row.linkedLegacyUserCount === 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div>
          <CardTitle>รายการพนักงาน</CardTitle>
          <CardDescription>
            {loading && employees.length === 0
              ? 'กำลังโหลด…'
              : `แสดง ${employees.length} รายการ จากทั้งหมด ${total} รายการ`}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {loading && employees.length === 0 ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
        ) : employees.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">ไม่พบรายการ</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">ลำดับ</TableHead>
                  <TableHead className="w-32">EmpCode</TableHead>
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>นามสกุล</TableHead>
                  <TableHead className="w-36">สถานะการผูก</TableHead>
                  <TableHead className="w-[120px] text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((row, i) => (
                  <TableRow key={row.empCode}>
                    <TableCell className="text-muted-foreground">
                      {(page - 1) * pageSize + i + 1}
                    </TableCell>
                    <TableCell className="font-mono font-medium">{row.empCode}</TableCell>
                    <TableCell>{row.firstName?.trim() || '—'}</TableCell>
                    <TableCell>{row.lastName?.trim() || '—'}</TableCell>
                    <TableCell>
                      <EmployeeLinkedBadge row={row} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => onEdit(row)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        disabled={!canDelete(row)}
                        onClick={() => onDelete(row)}
                      >
                        <Trash2 className="h-4 w-4" />
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
                onClick={() => onPageChange(1)}
                disabled={page === 1 || loading}
              >
                แรกสุด
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
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
                    onClick={() => onPageChange(pNum as number)}
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
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages || loading}
              >
                ถัดไป
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPageChange(totalPages)}
                disabled={page === totalPages || loading}
              >
                สุดท้าย
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
