import { useMemo, useState, Fragment } from 'react';
import { Download, RefreshCw, Package, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import DispensedPagination from './DispensedPagination';
import type { DispensedItem } from '../types';
import { formatUtcDateTime } from '@/lib/formatThaiDateTime';

/** ความคาดเคลื่อนกลุ่มตามเวลาเบิก (วินาที) */
const GROUP_TIME_TOLERANCE_SEC = 3;
const TOLERANCE_MS = GROUP_TIME_TOLERANCE_SEC * 1000;

const COLUMN_COUNT = 9;

export interface DispensedGroup {
  key: string;
  itemcode: string;
  itemname: string;
  dispenseTime: string;
  items: DispensedItem[];
  totalQty: number;
}

function buildGroups(items: DispensedItem[]): DispensedGroup[] {
  if (items.length === 0) return [];
  // เรียงตามวันที่เบิก ล่าสุดก่อน (ให้ตรงกับ backend ORDER BY DESC)
  const sorted = [...items].sort((a, b) => {
    const tA = new Date(a.modifyDate).getTime();
    const tB = new Date(b.modifyDate).getTime();
    return tB - tA;
  });

  const groups: DispensedGroup[] = [];
  let current: DispensedItem[] = [];
  let groupStartTime = 0;

  for (const item of sorted) {
    const t = new Date(item.modifyDate).getTime();
    if (current.length === 0) {
      current = [item];
      groupStartTime = t;
    } else {
      const sameItem = (item.itemcode ?? '') === (current[0].itemcode ?? '');
      // เรียง DESC แล้ว groupStartTime = เวลาล่าสุดในกลุ่ม, t <= groupStartTime → อยู่ในกลุ่มถ้า groupStartTime - t <= 3 วินาที
      const withinWindow = groupStartTime - t <= TOLERANCE_MS;
      if (sameItem && withinWindow) {
        current.push(item);
      } else {
        if (current.length > 0) {
          const totalQty = current.reduce((sum, i) => sum + (i.qty ?? 1), 0);
          groups.push({
            key: `${current[0].itemcode}_${current[0].RowID}_${groupStartTime}`,
            itemcode: current[0].itemcode ?? '',
            itemname: current[0].itemname ?? current[0].itemcode ?? '',
            dispenseTime: current[0].modifyDate,
            items: current,
            totalQty,
          });
        }
        current = [item];
        groupStartTime = t;
      }
    }
  }
  if (current.length > 0) {
    const totalQty = current.reduce((sum, i) => sum + (i.qty ?? 1), 0);
    groups.push({
      key: `${current[0].itemcode}_${current[0].RowID}_${groupStartTime}`,
      itemcode: current[0].itemcode ?? '',
      itemname: current[0].itemname ?? current[0].itemcode ?? '',
      dispenseTime: current[0].modifyDate,
      items: current,
      totalQty,
    });
  }
  return groups;
}

interface DispensedTableProps {
  loading: boolean;
  items: DispensedItem[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  searchItemCode: string;
  itemTypeFilter: string;
  onPageChange: (page: number) => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
}

export default function DispensedTable({
  loading,
  items,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  searchItemCode,
  itemTypeFilter,
  onPageChange,
  onExportExcel,
  onExportPdf,
}: DispensedTableProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const groups = useMemo(() => buildGroups(items), [items]);

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const baseRowIndex = (currentPage - 1) * itemsPerPage;

  const totalDispensedQty = useMemo(
    () => items.reduce((sum, i) => sum + (i.qty ?? 1), 0),
    [items],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-4 pb-2">
        <div className="space-y-1.5">
          <CardTitle>รายการเบิกอุปกรณ์จากตู้</CardTitle>
          <CardDescription>
            {items.length > 0
              ? `แสดง ${groups.length} กลุ่ม จากทั้งหมด ${totalItems} รายการ (รวม ${totalDispensedQty.toLocaleString()} ชิ้น) · จัดกลุ่มตามรหัสอุปกรณ์และเวลาที่เบิก ±${GROUP_TIME_TOLERANCE_SEC} วินาที`
              : 'รายการอุปกรณ์ที่เบิกจากตู้ SmartCabinet'}
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
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">ไม่พบรายการเบิกอุปกรณ์</p>
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
                    <TableHead>วันที่เบิก</TableHead>
                    <TableHead>แผนก</TableHead>
                    <TableHead>ชื่อผู้เบิก</TableHead>

                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group, groupIndex) => {
                    const isExpanded = expandedKeys.has(group.key);
                    const rowNum = baseRowIndex + groupIndex + 1;
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
                            {/* <span className="text-muted-foreground text-xs ml-1">
                              ({group.items.length} รายการ)
                            </span> */}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatUtcDateTime(group.dispenseTime)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {group.items[0]?.departmentName ?? '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {group.items[0]?.cabinetUserName ?? '-'}
                          </TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={COLUMN_COUNT} className="bg-gray-50 p-4">
                              <div>
                                <h4 className="font-semibold mb-3 text-gray-700 flex items-center gap-2">
                                  <Package className="h-4 w-4" />
                                  รายการเบิกในกลุ่ม ({group.items.length} รายการ · รวม {group.totalQty.toLocaleString()} ชิ้น)
                                </h4>
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-12">ลำดับ</TableHead>
                                        <TableHead>รหัสอุปกรณ์</TableHead>
                                        <TableHead>ชื่ออุปกรณ์</TableHead>
                                        <TableHead className="text-center">จำนวนชิ้น</TableHead>
                                        <TableHead>วันที่เบิก</TableHead>
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
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={onPageChange}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
