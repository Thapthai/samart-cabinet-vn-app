'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { SubDepartmentRow } from '../types';

type Props = {
  rows: SubDepartmentRow[];
  loading: boolean;
  totalLoaded: number;
  onEdit: (r: SubDepartmentRow) => void;
  onDelete: (r: SubDepartmentRow) => void;
};

export default function SubDepartmentsTable({
  rows,
  loading,
  totalLoaded,
  onEdit,
  onDelete,
}: Props) {
  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardHeader>
        <CardTitle>รายการแผนกย่อย</CardTitle>
        <CardDescription>
          {loading && totalLoaded === 0
            ? 'กำลังโหลด...'
            : totalLoaded === 0
              ? 'ผูกกับแผนกหลักหนึ่งรายการต่อหนึ่งรหัส (code)'
              : `แสดง ${rows.length} รายการ${rows.length !== totalLoaded ? ` จากทั้งหมด ${totalLoaded}` : ''}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && totalLoaded === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">กำลังโหลด...</p>
        ) : totalLoaded === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">ยังไม่มีข้อมูล</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">ไม่พบรายการที่ตรงเงื่อนไข</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">ID</TableHead>
                  <TableHead>แผนกหลัก</TableHead>
                  <TableHead>รหัส (code)</TableHead>
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>รายละเอียด</TableHead>
                  <TableHead className="text-right">Usage records</TableHead>
                  <TableHead>ใช้งาน</TableHead>
                  <TableHead className="text-right w-44">การทำงาน</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-slate-600">{r.id}</TableCell>
                    <TableCell
                      className="max-w-[200px] truncate"
                      title={r.department?.DepName || r.department?.DepName2}
                    >
                      {r.department?.DepName || r.department?.DepName2 || `ID ${r.department_id}`}
                    </TableCell>
                    <TableCell className="font-mono font-medium">{r.code}</TableCell>
                    <TableCell>{r.name || '—'}</TableCell>
                    <TableCell
                      className="max-w-[220px] truncate text-sm text-slate-600"
                      title={r.description || undefined}
                    >
                      {r.description?.trim() ? r.description : '—'}
                    </TableCell>
                    <TableCell className="text-right">{r._count?.medicalSupplyUsages ?? 0}</TableCell>
                    <TableCell>
                      {r.status ? (
                        <span className="text-xs font-medium text-emerald-700">เปิด</span>
                      ) : (
                        <span className="text-xs text-slate-500">ปิด</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="outline" size="sm" onClick={() => onEdit(r)} title="แก้ไข">
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        แก้ไข
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onDelete(r)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
