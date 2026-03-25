'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatUtcDateTime, toUtcYyyyMmDd } from '@/lib/formatThaiDateTime';
import MedicalSupplyDetailSummaryCard from './MedicalSupplyDetailSummaryCard';

/** วันที่ปฏิทิน UTC (YYYY-MM-DD) ให้ตรงกับช่วง filter / API ไม่ใช้ +7 Bangkok */
function toFilterDateStr(d: string | Date | null | undefined): string {
  if (!d) return '';
  const s = typeof d === 'string' ? d : d.toISOString();
  return toUtcYyyyMmDd(s) ?? '';
}

function inDateRange(dateStr: string, startDate: string, endDate: string): boolean {
  if (!dateStr) return false;
  if (!startDate && !endDate) return true;
  if (startDate && dateStr < startDate) return false;
  if (endDate && dateStr > endDate) return false;
  return true;
}

function OrderItemStatusCell({ statusRaw }: { statusRaw: string }) {
  const status = statusRaw || '-';
  const statusLower = status.toLowerCase();

  if (statusLower === 'discontinue' || statusLower === 'discontinued') {
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
        <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-red-500" />
        ยกเลิก
      </Badge>
    );
  }
  if (statusLower === 'verified') {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
        <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-green-500" />
        ยืนยันแล้ว
      </Badge>
    );
  }
  if (status === '-') {
    return <span className="text-gray-400 text-xs sm:text-sm">-</span>;
  }
  return (
    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
      <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-blue-500" />
      {status}
    </Badge>
  );
}

interface MedicalSupplySelectedDetailSectionProps {
  selectedSupply: Record<string, unknown> & { data?: Record<string, unknown> | null };
  activeFilters: { startDate: string; endDate: string };
}

export default function MedicalSupplySelectedDetailSection({
  selectedSupply,
  activeFilters,
}: MedicalSupplySelectedDetailSectionProps) {
  const supplyItems = (
    (selectedSupply.data?.supply_items ?? selectedSupply.supply_items ?? []) as Record<string, unknown>[]
  );
  const startDate = activeFilters.startDate || '';
  const endDate = activeFilters.endDate || '';

  const filteredByDate = supplyItems.filter((item: Record<string, unknown>) => {
    const createdStr = toFilterDateStr(item.updated_at as string | Date | undefined);
    return inDateRange(createdStr, startDate, endDate);
  });

  const formatDate = (v: string | null | undefined) => formatUtcDateTime(v);

  return (
    <div id="supply-details" className="space-y-4 sm:space-y-6">
      <MedicalSupplyDetailSummaryCard supply={selectedSupply} />

      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-base sm:text-lg">รายการอุปกรณ์ที่เบิก</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            รายละเอียดอุปกรณ์ทั้งหมดที่เบิกในครั้งนี้
            {activeFilters.startDate || activeFilters.endDate ? (
              <span className="block mt-2 text-foreground/80 font-medium break-words">
                แสดงตามวันที่เลือก: {activeFilters.startDate || '–'} ถึง {activeFilters.endDate || '–'}
              </span>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 py-3 sm:px-6 sm:py-4 overflow-hidden">
          <p className="text-xs text-gray-500 mb-2 md:hidden">เลื่อนแนวนอนเพื่อดูคอลัมน์ทั้งหมด</p>
          <div className="overflow-x-auto -mx-3 sm:mx-0 max-w-full">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 sm:w-[80px] text-xs sm:text-sm whitespace-nowrap">ลำดับ</TableHead>
                  <TableHead className="min-w-[80px] text-xs sm:text-sm">รหัสอุปกรณ์</TableHead>
                  <TableHead className="min-w-[120px] text-xs sm:text-sm">ชื่ออุปกรณ์</TableHead>
                  <TableHead className="text-center w-14 text-xs sm:text-sm whitespace-nowrap">จำนวน</TableHead>
                  <TableHead className="min-w-[60px] text-xs sm:text-sm">หน่วย</TableHead>
                  <TableHead className="min-w-[90px] text-xs sm:text-sm">Assession No</TableHead>
                  <TableHead className="min-w-[100px] text-xs sm:text-sm whitespace-nowrap">วันที่สร้าง</TableHead>
                  <TableHead className="min-w-[100px] text-xs sm:text-sm whitespace-nowrap">วันที่แก้ไข</TableHead>
                  <TableHead className="min-w-[80px] text-xs sm:text-sm">สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredByDate.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-6 sm:py-8 text-gray-500 text-sm">
                      {supplyItems.length === 0
                        ? 'ไม่มีรายการอุปกรณ์'
                        : 'ไม่มีรายการอุปกรณ์ที่สร้างหรือแก้ไขในช่วงวันที่ที่กรอง'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredByDate.map((item: Record<string, unknown>, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="text-center text-xs sm:text-sm py-2 sm:py-3">{index + 1}</TableCell>
                      <TableCell className="font-mono text-xs sm:text-sm py-2 sm:py-3">
                        {String(item.order_item_code ?? item.supply_code ?? '-')}
                      </TableCell>
                      <TableCell
                        className="text-xs sm:text-sm py-2 sm:py-3 max-w-[140px] sm:max-w-none truncate"
                        title={String(item.order_item_description ?? item.supply_name ?? '')}
                      >
                        {String(item.order_item_description ?? item.supply_name ?? '-')}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-xs sm:text-sm py-2 sm:py-3">
                        {Number(item.qty ?? item.quantity ?? 0)}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm py-2 sm:py-3">
                        {String(item.uom ?? item.unit ?? '-')}
                      </TableCell>
                      <TableCell className="font-mono text-xs sm:text-sm py-2 sm:py-3">
                        {String(item.assession_no ?? '-')}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm py-2 sm:py-3 whitespace-nowrap">
                        {item.created_at ? formatDate(String(item.created_at)) : '-'}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm py-2 sm:py-3 whitespace-nowrap">
                        {item.updated_at ? formatDate(String(item.updated_at)) : '-'}
                      </TableCell>
                      <TableCell className="py-2 sm:py-3">
                        <OrderItemStatusCell statusRaw={String(item.order_item_status ?? '-')} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
