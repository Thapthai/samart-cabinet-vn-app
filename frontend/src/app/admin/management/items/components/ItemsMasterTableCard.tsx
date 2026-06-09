'use client';

import type { Item } from '@/types/item';
import { Plus, Pencil, Trash2, RefreshCw, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ItemNameWithUnit from '@/components/ItemNameWithUnit';
import ItemStatusBadge from './ItemStatusBadge';
import { formatItemDepartmentLabel, type DeptRow } from './itemHelpers';
import { generateItemPageNumbers } from './itemPagination';

export interface ItemsMasterTableCardProps {
  items: Item[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  deptMap: Map<number, DeptRow>;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onCreateClick: () => void;
  onPageChange: (page: number) => void;
}

export default function ItemsMasterTableCard({
  items,
  loading,
  page,
  pageSize,
  total,
  totalPages,
  deptMap,
  onEdit,
  onDelete,
  onCreateClick,
  onPageChange,
}: ItemsMasterTableCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-2">
        <div>
          <CardTitle>รายการ Item</CardTitle>
          <CardDescription>
            {loading && items.length === 0
              ? 'กำลังโหลด…'
              : `แสดง ${items.length} รายการ จากทั้งหมด ${total} รายการ`}
          </CardDescription>
        </div>
        <Button type="button" onClick={onCreateClick} className="shrink-0 gap-2">
          <Plus className="h-4 w-4" />
          เพิ่ม Item
        </Button>
      </CardHeader>
      <CardContent>
        {loading && items.length === 0 ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <p className="text-muted-foreground">ไม่พบรายการ</p>
            <Button type="button" className="gap-2" onClick={onCreateClick}>
              <Plus className="h-4 w-4" />
              เพิ่ม Item
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">#</TableHead>
                  <TableHead>รหัส Item</TableHead>
                  <TableHead className="min-w-[200px]">ชื่อ / หน่วย</TableHead>
                  <TableHead>บาร์โค้ด</TableHead>
                  <TableHead>แผนก</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>หน่วย</TableHead>
                  <TableHead>หน่วยการเบิก</TableHead>
                  <TableHead className="w-[120px] text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, i) => (
                  <TableRow key={it.itemcode}>
                    <TableCell className="text-muted-foreground">
                      {(page - 1) * pageSize + i + 1}
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{it.itemcode}</code>
                    </TableCell>
                    <TableCell className="max-w-[320px] min-w-0">
                      <ItemNameWithUnit item={it} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{it.Barcode || '—'}</TableCell>
                    <TableCell className="text-sm">
                      {formatItemDepartmentLabel(it.DepartmentID, deptMap)}
                    </TableCell>
                    <TableCell>
                      <ItemStatusBadge item={it} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {it.unit?.UnitName?.trim() ? it.unit.UnitName : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {it.subUnit?.UnitName?.trim()
                        ? `${it.subUnit.UnitName}${it.SubUnitQty != null && Number(it.SubUnitQty) > 0 ? ` ×${it.SubUnitQty}` : ''
                        }`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => onEdit(it)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => onDelete(it)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {totalPages > 1 ? (
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
              {generateItemPageNumbers(page, totalPages).map((pNum, idx) =>
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
        ) : null}
      </CardContent>
    </Card>
  );
}
