'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { vendingReportsApi } from '@/lib/api';
import { toast } from 'sonner';
import type { ReturnHistoryData, ReturnHistoryRecord } from '../types';

interface ReturnHistoryTableProps {
  data: ReturnHistoryData | null;
  currentPage: number;
  limit: number;
  dateFrom: string;
  dateTo: string;
  reason: string;
  formatDate: (dateString: string) => string;
  getReturnReasonLabel: (reason: string) => string;
  onPageChange: (page: number) => void;
}

export default function ReturnHistoryTable({
  data,
  currentPage,
  limit,
  dateFrom,
  dateTo,
  reason,
  formatDate,
  getReturnReasonLabel,
  onPageChange,
}: ReturnHistoryTableProps) {
  const [exportLoading, setExportLoading] = useState<'excel' | 'pdf' | null>(null);

  const rows = (data?.data ?? []) as ReturnHistoryRecord[];

  if (!data) {
    return (
      <Card className="overflow-hidden border-0 shadow-sm bg-white rounded-xl">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-slate-500">กรุณากดค้นหาเพื่อดูประวัติการคืน</p>
        </CardContent>
      </Card>
    );
  }

  const handleDownloadExcel = async () => {
    try {
      setExportLoading('excel');
      toast.info('กำลังสร้างรายงาน Excel...');
      await vendingReportsApi.downloadReturnReportExcel({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        return_reason: reason !== 'ALL' ? reason : undefined,
      });
      toast.success('ดาวน์โหลดรายงาน Excel สำเร็จ');
    } catch (error: any) {
      toast.error(`ไม่สามารถดาวน์โหลดรายงาน Excel ได้: ${error?.message || error}`);
    } finally {
      setExportLoading(null);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setExportLoading('pdf');
      toast.info('กำลังสร้างรายงาน PDF...');
      await vendingReportsApi.downloadReturnReportPdf({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        return_reason: reason !== 'ALL' ? reason : undefined,
      });
      toast.success('ดาวน์โหลดรายงาน PDF สำเร็จ');
    } catch (error: any) {
      toast.error(`ไม่สามารถดาวน์โหลดรายงาน PDF ได้: ${error?.message || error}`);
    } finally {
      setExportLoading(null);
    }
  };

  const totalPages = Math.ceil(data.total / limit) || 1;
  const startItem = (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, data.total);

  return (
    <Card className="overflow-hidden border-0 shadow-sm bg-white rounded-xl">
      <CardHeader className="border-b bg-slate-50/50 pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-800">
              รายการประวัติการคืน
            </CardTitle>
            <p className="text-sm text-slate-500 mt-0.5">
              แสดง {data.total} รายการ (หน้า {currentPage} / {Math.ceil(data.total / limit) || 1})
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadExcel}
              disabled={exportLoading !== null}

            >
              {exportLoading === 'excel' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {exportLoading === 'excel' ? 'กำลังโหลด...' : 'Excel'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={exportLoading !== null}
            >
              {exportLoading === 'pdf' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {exportLoading === 'pdf' ? 'กำลังโหลด...' : 'PDF'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b">
                <TableHead className="w-14 text-center text-slate-600 font-medium">#</TableHead>
                <TableHead className="text-slate-600 font-medium">รหัสอุปกรณ์</TableHead>
                <TableHead className="text-slate-600 font-medium">ชื่ออุปกรณ์</TableHead>
                <TableHead className="text-slate-600 font-medium">ตู้</TableHead>
                <TableHead className="text-slate-600 font-medium">ชื่อผู้เติม</TableHead>
                <TableHead className="text-center text-slate-600 font-medium w-24">จำนวน</TableHead>
                <TableHead className="text-slate-600 font-medium">สาเหตุ</TableHead>
                <TableHead className="text-center text-slate-600 font-medium">วันที่</TableHead>
                <TableHead className="text-slate-600 font-medium">หมายเหตุ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((record: ReturnHistoryRecord, index: number) => (
                <TableRow
                  key={record.id}
                  className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                >
                  <TableCell className="text-center text-slate-500 text-sm">
                    {startItem + index}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {record.supply_item?.order_item_code || record.supply_item?.supply_code || '-'}
                  </TableCell>
                  <TableCell className="text-sm max-w-[200px]">
                    {record.supply_item?.order_item_description || record.supply_item?.supply_name || '-'}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {[record.cabinet_name || record.cabinet_code, record.department_name].filter(Boolean).join(' / ') || '-'}
                  </TableCell>
                  <TableCell className="text-sm">{record.return_by_user_name || 'ไม่ระบุ'}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-0 font-medium">
                      {record.qty_returned}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 text-xs font-normal">
                      {getReturnReasonLabel(record.return_reason)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-slate-600 text-sm whitespace-nowrap">
                    {formatDate(record.return_datetime)}
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm max-w-[160px] truncate" title={record.return_note || ''}>
                    {record.return_note || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-slate-100 p-4 mb-3">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">ไม่พบประวัติการคืน</p>
            <p className="text-slate-500 text-sm mt-1">ลองปรับช่วงวันที่หรือสาเหตุ</p>
          </div>
        )}

        {data.total > limit && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-4 border-t bg-slate-50/30">
            <p className="text-sm text-slate-500 order-2 sm:order-1">
              แสดง <span className="font-medium text-slate-700">{startItem}</span> – <span className="font-medium text-slate-700">{endItem}</span> จากทั้งหมด <span className="font-medium text-slate-700">{data.total}</span> รายการ
            </p>
            <div className="flex items-center gap-2 order-1 sm:order-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                ก่อนหน้า
              </Button>
              <span className="text-sm text-slate-600 min-w-[80px] text-center">
                หน้า {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="gap-1"
              >
                ถัดไป
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
