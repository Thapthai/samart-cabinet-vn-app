import { useMemo, useState, Fragment } from 'react';
import { Download, RefreshCw, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import DispensedPagination from '../../dispense-from-cabinet/components/DispensedPagination';
import type { DispensedItem } from '../types';
import { formatUtcDateTime } from '@/lib/formatThaiDateTime';
import {
  buildReturnedGroups,
  RETURNED_GROUP_TIME_TOLERANCE_SEC,
  type ReturnedGroup,
} from '@/lib/returnToCabinet/buildReturnedGroups';

export type { ReturnedGroup };

const COLUMN_COUNT = 9;

interface ReturnedTableProps {
  loading: boolean;
  items: DispensedItem[];
  currentPage: number;
  totalPages: number;
  /** จำนวนรายการดิบจาก API (การ์ดสรุป / คำอธิบาย) */
  totalRawItems: number;
  /** จำนวนกลุ่มหลังจัดกลุ่ม — ใช้กับ pagination */
  totalGroups: number;
  /** จำนวนแถวหลัก (กลุ่ม) ต่อหน้า */
  groupsPerPage: number;
  searchItemCode: string;
  itemTypeFilter: string;
  onPageChange: (page: number) => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
}

export default function ReturnedTable({
  loading,
  items,
  currentPage,
  totalPages,
  totalRawItems,
  totalGroups,
  groupsPerPage,
  searchItemCode,
  itemTypeFilter,
  onPageChange,
  onExportExcel,
  onExportPdf,
}: ReturnedTableProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const groups = useMemo(() => buildReturnedGroups(items), [items]);

  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * groupsPerPage;
    return groups.slice(start, start + groupsPerPage);
  }, [groups, currentPage, groupsPerPage]);

  const groupRowOffset = (currentPage - 1) * groupsPerPage;

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const totalReturnedQty = useMemo(
    () => items.reduce((sum, i) => sum + (i.qty ?? 1), 0),
    [items],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-4 pb-2">
        <div className="space-y-1.5">
          <CardTitle>รายการเติมอุปกรณ์เข้าตู้</CardTitle>
          <CardDescription>
            {items.length > 0
              ? `แสดง ${paginatedGroups.length} กลุ่มในหน้านี้ (สูงสุด ${groupsPerPage} กลุ่มต่อหน้า) · รวม ${totalGroups} กลุ่ม จาก ${totalRawItems} รายการดิบ (รวม ${totalReturnedQty.toLocaleString()} ชิ้น) · จัดกลุ่มตามรหัสอุปกรณ์และเวลาที่เติม ±${RETURNED_GROUP_TIME_TOLERANCE_SEC} วินาที`
              : 'รายการอุปกรณ์ทั้งหมดที่เติมเข้าตู้ SmartCabinet'}
            {(searchItemCode || itemTypeFilter !== 'all') && items.length > 0 && ' (กรองแล้ว)'}
          </CardDescription>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button onClick={onExportExcel} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button onClick={onExportPdf} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500">กำลังโหลดข้อมูล...</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <RotateCcw className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">ไม่พบรายการเติมอุปกรณ์เข้าตู้</p>
            <p className="text-sm text-gray-400 mt-2">กรุณาตรวจสอบว่ามีข้อมูลในระบบ</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12" />
                    <TableHead className="w-[100px]">ลำดับ</TableHead>
                    <TableHead>รหัสอุปกรณ์</TableHead>
                    <TableHead>ชื่ออุปกรณ์</TableHead>
                    <TableHead className="text-center">จำนวนชิ้น</TableHead>
                    <TableHead>วันที่เติม</TableHead>
                    <TableHead>ตู้</TableHead>
                    <TableHead>แผนก</TableHead>
                    <TableHead>ชื่อผู้เติม</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedGroups.map((group, groupIndex) => {
                    const isExpanded = expandedKeys.has(group.key);
                    const rowNum = groupRowOffset + groupIndex + 1;
                    return (
                      <Fragment key={group.key}>
                        <TableRow
                          className={cn(
                            'transition-colors',
                            isExpanded ? 'bg-slate-50/80' : 'hover:bg-slate-50/80',
                          )}
                        >
                          <TableCell className="w-12">
                            <button
                              type="button"
                              onClick={() => toggleExpand(group.key)}
                              className="hover:bg-gray-200 p-1 rounded"
                              aria-label={isExpanded ? 'ย่อ' : 'ขยาย'}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-slate-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-slate-600" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell className="font-medium text-slate-700">
                            {rowNum}
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {group.itemcode || '-'}
                            </code>
                          </TableCell>
                          <TableCell className="font-medium text-slate-800">
                            {group.itemname || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-semibold text-slate-700">
                              {group.totalQty.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatUtcDateTime(group.returnTime)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {group.items[0]?.cabinetName ?? '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {group.items[0]?.departmentName ?? '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{group.items[0]?.cabinetUserName ?? '-'}</TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={COLUMN_COUNT} className="bg-gray-50 p-4">
                              <div>
                                <h4 className="font-semibold mb-3 text-gray-700 flex items-center gap-2">
                                  <RotateCcw className="h-4 w-4" />
                                  รายการเติมในกลุ่ม ({group.items.length} รายการ · รวม {group.totalQty.toLocaleString()} ชิ้น)
                                </h4>
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-12">ลำดับ</TableHead>
                                        <TableHead>รหัสอุปกรณ์</TableHead>
                                        <TableHead>ชื่ออุปกรณ์</TableHead>
                                        <TableHead className="text-center">จำนวนชิ้น</TableHead>
                                        <TableHead>วันที่เติม</TableHead>
                                        <TableHead>แผนก</TableHead>
                                        <TableHead>RFID Code</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {group.items.map((item, idx) => (
                                        <TableRow
                                          key={item.RowID}
                                          className="hover:bg-gray-100/80"
                                        >
                                          <TableCell className="font-medium">{idx + 1}</TableCell>
                                          <TableCell>
                                            <code className="text-xs bg-white px-2 py-0.5 rounded border">
                                              {item.itemcode || '-'}
                                            </code>
                                          </TableCell>
                                          <TableCell className="text-slate-700">{item.itemname || '-'}</TableCell>
                                          <TableCell className="text-center font-medium text-slate-700">
                                            {(item.qty ?? 1).toLocaleString()}
                                          </TableCell>
                                          <TableCell className="text-muted-foreground text-sm">
                                            {formatUtcDateTime(item.modifyDate)}
                                          </TableCell>
                                          <TableCell className="text-muted-foreground text-sm">
                                            {item.departmentName || '-'}
                                          </TableCell>
                                          <TableCell className="text-muted-foreground text-sm font-mono">
                                            {item.RfidCode || '-'}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <DispensedPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalGroups}
              itemsPerPage={groupsPerPage}
              countLabel="กลุ่ม"
              onPageChange={onPageChange}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
