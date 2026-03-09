'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw, Package, XCircle, Download, ChevronRight } from 'lucide-react';

interface MedicalSuppliesTableProps {
  loading: boolean;
  supplies: any[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onSelectSupply?: (supply: any) => void;
  selectedSupplyId?: number | null;
  onCancelBill?: (supply: any) => void;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
  exportLoading?: 'excel' | 'pdf' | null;
  filters: {
    startDate: string;
    endDate: string;
    patientHN: string;
    keyword: string;
    firstName: string;
    lastName: string;
    assessionNo: string;
    itemName?: string;
    departmentCode?: string;
    printDate?: string;
    timePrintDate?: string;
  };
}

export default function MedicalSuppliesTable({
  loading,
  supplies,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onSelectSupply,
  selectedSupplyId,
  onCancelBill,
  onExportExcel,
  onExportPdf,
  exportLoading,
  filters,
}: MedicalSuppliesTableProps) {

  const canShowCancelBill = (supply: any): boolean => {
    const supplyData = supply.data || supply;
    const createdDate = supplyData.created_at || supply.created_at;
    const billingStatus = supplyData.billing_status || supply.billing_status;

    // ถ้า cancel แล้ว ไม่แสดงปุ่ม
    if (billingStatus && billingStatus.toLowerCase() === 'cancelled') {
      return false;
    }

    if (!createdDate) {
      return false;
    }

    try {
      const created = new Date(createdDate);
      const today = new Date();

      // เอาแค่วันที่ ไม่เอาเวลา
      const createdDay = new Date(created.getFullYear(), created.getMonth(), created.getDate());
      const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      // คำนวณความแตกต่างของวัน (วันเบิก - วันนี้)
      const diffTime = todayDay.getTime() - createdDay.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // แสดงปุ่มเฉพาะเมื่อวันเบิก - วันนี้ ไม่เกิน 1 วัน (0 หรือ 1 วัน)
      return diffDays >= 0 && diffDays <= 1;
    } catch (e) {
      return false;
    }
  };
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateString;
    }
  };

  /** แสดงวันที่/เวลาที่พิมพ์บิล (print_date อาจเป็น YYYY-MM-DD, time_print_date เป็น HH:mm:ss) */
  const formatPrintDateTime = (printDate: string | null | undefined, timePrintDate: string | null | undefined): string => {
    const datePart = printDate?.trim();
    const timePart = timePrintDate?.trim();
    if (!datePart && !timePart) return '-';
    const parts: string[] = [];
    if (datePart) {
      if (/^\d{4}-\d{2}-\d{2}/.test(datePart)) {
        try {
          const d = new Date(datePart.includes('T') ? datePart : datePart + 'T00:00:00');
          parts.push(d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }));
        } catch {
          parts.push(datePart);
        }
      } else {
        parts.push(datePart);
      }
    }
    if (timePart) {
      parts.push(timePart.length > 8 ? timePart.slice(0, 8) : timePart);
    }
    return parts.join(' ') || '-';
  };

  const getBillingStatusBadge = (status: string | null | undefined) => {
    if (!status) {
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-gray-500"></span>
          ไม่ระบุ
        </Badge>
      );
    }

    const statusLower = status.toLowerCase();
    const statusConfig: any = {
      'cancelled': {
        label: 'ยกเลิก',
        className: 'bg-red-50 text-red-700 border-red-200',
        dotColor: 'bg-red-500'
      },
      'paid': {
        label: 'ชำระแล้ว',
        className: 'bg-green-50 text-green-700 border-green-200',
        dotColor: 'bg-green-500'
      },
      'pending': {
        label: 'รอชำระ',
        className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        dotColor: 'bg-yellow-500'
      },
      'verified': {
        label: 'ยืนยันแล้ว',
        className: 'bg-blue-50 text-blue-700 border-blue-200',
        dotColor: 'bg-blue-500'
      },
    };

    const config = statusConfig[statusLower] || {
      label: status,
      className: 'bg-gray-50 text-gray-700 border-gray-200',
      dotColor: 'bg-gray-500'
    };

    return (
      <Badge variant="outline" className={`${config.className} border text-xs`}>
        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${config.dotColor}`}></span>
        {config.label}
      </Badge>
    );
  };

  const generatePageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <Card className="w-full max-w-full min-w-0 overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between space-y-0 pb-2 px-4 py-3 sm:px-6 sm:py-4">
        <div className="space-y-1.5 min-w-0">
          <CardTitle className="text-base sm:text-lg">รายการเบิกอุปกรณ์</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            ทั้งหมด {totalItems} รายการ
            {filters.startDate && filters.endDate && (
              <span className="ml-1 sm:ml-2">
                (วันที่ {new Date(filters.startDate).toLocaleDateString('th-TH')} - {new Date(filters.endDate).toLocaleDateString('th-TH')})
              </span>
            )}
          </CardDescription>
        </div>
        {(onExportExcel ?? onExportPdf) && (
          <div className="flex shrink-0 items-center gap-2 flex-wrap">
            {onExportExcel && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExportExcel}
                disabled={exportLoading !== undefined && exportLoading !== null}
                className="flex-1 sm:flex-initial"
              >
                <Download className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">{exportLoading === 'excel' ? 'กำลังโหลด...' : 'Excel'}</span>
              </Button>
            )}
            {onExportPdf && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExportPdf}
                disabled={exportLoading !== undefined && exportLoading !== null}
                className="flex-1 sm:flex-initial"
              >
                <Download className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">{exportLoading === 'pdf' ? 'กำลังโหลด...' : 'PDF'}</span>
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="px-3 py-3 sm:px-6 sm:py-4">
        {loading ? (
          <div className="flex items-center justify-center py-8 sm:py-12 flex-wrap gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-gray-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>กำลังโหลดข้อมูล...</p>
              </TooltipContent>
            </Tooltip>
            <span className="text-sm sm:text-base text-gray-500">กำลังโหลดข้อมูล...</span>
          </div>
        ) : supplies.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-block">
                  <Package className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>ไม่พบรายการเบิก</p>
              </TooltipContent>
            </Tooltip>
            <p className="text-sm text-gray-500">ไม่พบรายการเบิก</p>
            <p className="text-xs sm:text-sm text-gray-400 mt-2">ลองเปลี่ยนเงื่อนไขการค้นหา</p>
          </div>
        ) : (
          <>
            {/* มือถือ: แสดงเป็นการ์ดเรียงแนวตั้ง */}
            <div className="md:hidden space-y-3">
              {supplies.map((supply, index) => {
                const supplyData = supply.data || supply;
                const id = supply.id || supplyData.id;
                const supplyItems = supplyData.supply_items || supply.supply_items || [];
                const activeItems = supplyItems.filter((item: any) => {
                  const status = item.order_item_status?.toLowerCase() || '';
                  return status !== 'discontinue' && status !== 'discontinued';
                });
                const totalQtyPending = activeItems.reduce((sum: number, item: any) => {
                  const qty = item.qty || 0;
                  const qtyUsed = item.qty_used_with_patient || 0;
                  const qtyReturned = item.qty_returned_to_cabinet || 0;
                  const qtyPending = qty - qtyUsed - qtyReturned;
                  return sum + (qtyPending > 0 ? qtyPending : 0);
                }, 0);
                const usageUpdated = supplyData.updated_at || supply.updated_at;
                const itemUpdatedDates = (supplyItems || []).map((item: any) => item.updated_at).filter(Boolean);
                const allDates = [usageUpdated, ...itemUpdatedDates].filter(Boolean);
                const latestDateTime = allDates.length ? allDates.reduce((a: string, b: string) => (new Date(a) > new Date(b) ? a : b)) : null;
                const isSelected = selectedSupplyId === id;
                return (
                  <button
                    key={id ?? index}
                    type="button"
                    onClick={() => onSelectSupply?.(supply)}
                    className={`w-full text-left rounded-lg border-2 p-4 transition-colors ${isSelected ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-gray-500">#{(currentPage - 1) * itemsPerPage + index + 1}</span>
                          <span className="font-medium text-gray-900">HN {supplyData.patient_hn || '-'} / EN {supplyData.en || '-'}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {supplyData.department_name || supplyData.department_code || '-'}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const ut = (supplyData.usage_type || '').toUpperCase();
                            if (ut === 'OPD') return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">OPD</Badge>;
                            if (ut === 'IPD') return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">IPD</Badge>;
                            return null;
                          })()}
                          {getBillingStatusBadge(supplyData.billing_status || supply.billing_status)}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                          <span>เบิก: {formatDate(supply.created_at || supplyData.created_at || supplyData.usage_datetime)}</span>
                          {latestDateTime && <span>อัปเดต: {formatDate(latestDateTime)}</span>}
                        </div>
                        <div className="flex gap-2 text-xs">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-100 text-green-800">{activeItems.length} รายการ</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-100 text-green-800">Qty {totalQtyPending}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {canShowCancelBill(supply) && onCancelBill && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                                onClick={(e) => { e.stopPropagation(); onCancelBill(supply); }}
                              >
                                <XCircle className="h-5 w-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Cancel Bill ข้ามวัน</p></TooltipContent>
                          </Tooltip>
                        )}
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Desktop: แสดงเป็นตาราง */}
            <div className="hidden md:block overflow-x-auto max-w-full">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 sm:w-[80px] text-xs sm:text-sm whitespace-nowrap">ลำดับ</TableHead>
                  <TableHead className="min-w-[90px] text-xs sm:text-sm">HN / EN คนไข้</TableHead>
                  <TableHead className="min-w-[80px] text-xs sm:text-sm">แผนก</TableHead>
                  <TableHead className="min-w-[70px] text-xs sm:text-sm whitespace-nowrap">ประเภท</TableHead>
                  <TableHead className="min-w-[90px] text-xs sm:text-sm whitespace-nowrap">เวลาที่เบิก</TableHead>
                  <TableHead className="min-w-[90px] text-xs sm:text-sm whitespace-nowrap">วันเวลา</TableHead>
                  <TableHead className="min-w-[100px] text-xs sm:text-sm">วันที่ และเวลาที่พิมพ์บิล</TableHead>
                  <TableHead className="text-center w-14 text-xs sm:text-sm whitespace-nowrap">จำนวนรายการ</TableHead>
                  <TableHead className="text-center w-14 text-xs sm:text-sm whitespace-nowrap">จำนวนอุปกรณ์ที่ถูกใช้งาน</TableHead>
                  <TableHead className="min-w-[80px] text-xs sm:text-sm">สถานะ</TableHead>
                  <TableHead className="text-center w-14 text-xs sm:text-sm whitespace-nowrap">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplies.map((supply, index) => {
                  const supplyData = supply.data || supply;
                  const id = supply.id || supplyData.id;
                  const patientName = `${supplyData.first_name || ''} ${supplyData.lastname || ''}`.trim() ||
                    supplyData.patient_name_th || '-';
                  const recordedByName = supplyData.recorded_by_display ||
                    supply.recorded_by_display ||
                    supply.recorded_by_name ||
                    supplyData.recorded_by_name || '-';

                  // Get unique item names for display
                  const supplyItems = supplyData.supply_items || supply.supply_items || [];
                  
                  // Filter out Discontinue items for count
                  const activeItems = supplyItems.filter((item: any) => {
                    const status = item.order_item_status?.toLowerCase() || '';
                    return status !== 'discontinue' && status !== 'discontinued';
                  });
                  
                  // Calculate total qty_pending for active items (excluding Discontinue)
                  const totalQtyPending = activeItems.reduce((sum: number, item: any) => {
                    const qty = item.qty || 0;
                    const qtyUsed = item.qty_used_with_patient || 0;
                    const qtyReturned = item.qty_returned_to_cabinet || 0;
                    const qtyPending = qty - qtyUsed - qtyReturned;
                    return sum + (qtyPending > 0 ? qtyPending : 0);
                  }, 0);
                  
                  const itemNames: string[] = Array.from(
                    new Set(
                      supplyItems
                        .map((item: any) => item.order_item_description || item.supply_name || '')
                        .filter((name: string) => name && name.trim() !== '')
                    )
                  ) as string[];

                  // วันเวลาล่าสุดที่ยิงหรืออัปเดต (ใช้ค่าล่าสุดระหว่าง usage กับ supply_items)
                  const usageUpdated = supplyData.updated_at || supply.updated_at;
                  const itemUpdatedDates = (supplyItems || [])
                    .map((item: any) => item.updated_at)
                    .filter(Boolean);
                  const allDates = [usageUpdated, ...itemUpdatedDates].filter(Boolean);
                  const latestDateTime = allDates.length
                    ? allDates.reduce((a: string, b: string) => (new Date(a) > new Date(b) ? a : b))
                    : null;

                  const isSelected = selectedSupplyId === id;

                  return (
                    <TableRow
                      key={id || index}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-purple-100 hover:bg-purple-100' : 'hover:bg-gray-50'
                        }`}
                      onClick={() => onSelectSupply && onSelectSupply(supply)}
                    >
                      <TableCell className="text-center text-xs sm:text-sm py-2 sm:py-3 tabular-nums">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </TableCell>
                      <TableCell className="py-2 sm:py-3">
                        <div className="text-xs sm:text-sm text-gray-700 leading-tight">
                          <div>HN {supplyData.patient_hn || '-'}</div>
                          <div className="text-[10px] sm:text-xs text-gray-500">EN {supplyData.en || '-'}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm py-2 sm:py-3">
                        {supplyData.department_name || supplyData.department_code || '-'}
                      </TableCell>
                      <TableCell className="py-2 sm:py-3">
                        {(() => {
                            const ut = (supplyData.usage_type || '').toUpperCase();
                            if (ut === 'OPD') return (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-blue-500" />
                                ผู้ป่วยนอก (OPD)
                              </Badge>
                            );
                            if (ut === 'IPD') return (
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-purple-500" />
                                ผู้ป่วยใน (IPD)
                              </Badge>
                            );
                            return <span className="text-gray-400 text-xs sm:text-sm">-</span>;
                          })()}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm py-2 sm:py-3 whitespace-nowrap">
                        {formatDate(supply.created_at || supplyData.created_at || supplyData.usage_datetime)}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm py-2 sm:py-3 whitespace-nowrap">
                        {latestDateTime ? formatDate(latestDateTime) : '-'}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm py-2 sm:py-3">
                        {formatPrintDateTime(supplyData.print_date, supplyData.time_print_date)}
                      </TableCell>
                      <TableCell className="text-center py-2 sm:py-3">
                        <span className="inline-flex items-center justify-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-green-100 text-green-800 font-semibold text-xs sm:text-sm">
                          {activeItems.length || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-2 sm:py-3">
                        <span className="inline-flex items-center justify-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-green-100 text-green-800 font-semibold text-xs sm:text-sm">
                          {totalQtyPending || 0}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 sm:py-3">
                        {getBillingStatusBadge(supplyData.billing_status || supply.billing_status)}
                      </TableCell>
                      <TableCell className="text-center py-2 sm:py-3">
                        {canShowCancelBill(supply) && onCancelBill && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:bg-red-50 hover:text-red-700 h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCancelBill(supply);
                                }}
                              >
                                <XCircle className="h-5 w-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Cancel Bill ข้ามวัน</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </>
        )}

        {/* Pagination */}
        {!loading && supplies.length > 0 && totalPages > 1 && (
          <div className="mt-4 sm:mt-6 flex flex-col gap-3 border-t pt-4">
            <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
              หน้า {currentPage} จาก {totalPages} ({totalItems} รายการ)
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
              <Button variant="outline" size="sm" onClick={() => onPageChange(1)} disabled={currentPage === 1} className="text-xs h-8 px-2 sm:px-3">
                แรก
              </Button>
              <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="text-xs h-8 px-2 sm:px-3">
                ก่อนหน้า
              </Button>
              <span className="hidden sm:flex items-center gap-1">
                {generatePageNumbers().map((page, idx) =>
                  page === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-1 text-gray-400 text-xs">...</span>
                  ) : (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      className="min-w-[2rem] h-8 text-xs"
                      onClick={() => onPageChange(page as number)}
                    >
                      {page}
                    </Button>
                  )
                )}
              </span>
              <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="text-xs h-8 px-2 sm:px-3">
                ถัดไป
              </Button>
              <Button variant="outline" size="sm" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} className="text-xs h-8 px-2 sm:px-3">
                สุดท้าย
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
