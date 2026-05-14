import { Button } from '@/components/ui/button';
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
import { Plus, RefreshCw } from 'lucide-react';
import { CabinetLinksBadges } from './CabinetLinksBadges';
import { CABINET_USERS_PAGE_SIZE, generatePageNumbers } from './pagination';
import type { CabinetUserRow } from './types';

export function CabinetUsersTableCard({
  rows,
  loading,
  total,
  page,
  totalPages,
  onPageChange,
  onEditRow: _onEditRow,
  onCreateClick,
}: {
  rows: CabinetUserRow[];
  loading: boolean;
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
  onEditRow: (row: CabinetUserRow) => void;
  onCreateClick: () => void;
}) {
  return (
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
      </CardHeader>
      <CardContent>
        {loading && rows.length === 0 ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <p className="text-muted-foreground">ไม่พบรายการ</p>
            <Button type="button" className="gap-2" onClick={onCreateClick}>
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
                  <TableHead className="min-w-[180px] max-w-[320px]">ชื่อตู้</TableHead>
                  <TableHead className="text-center">จำนวน</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground">
                      {(page - 1) * CABINET_USERS_PAGE_SIZE + i + 1}
                    </TableCell>
                    <TableCell className="font-medium">{r.userName ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-slate-800">
                          {r.employee_display?.trim() || '—'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {r.empCode?.trim() ? `EmpCode · ${r.empCode}` : 'ไม่ผูก EmpCode'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[420px] align-top text-sm">
                      <CabinetLinksBadges row={r} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{r.cabinet_count ?? 0}</Badge>
                    </TableCell>
                    {/* <TableCell>
                      <Button variant="outline" size="sm" onClick={() => onEditRow(r)}>
                        <Edit className="mr-1 h-4 w-4" />
                        แก้ไข
                      </Button>
                    </TableCell> */}
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
