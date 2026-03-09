'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { medicalSuppliesApi } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { toast } from 'sonner';
import { FileText, Search, RefreshCw, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePickerBE } from '@/components/ui/date-picker-be';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function LogsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;

  const getTodayDate = () => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  };

  const [formFilters, setFormFilters] = useState({
    patient_hn: '',
    en: '',
    startDate: getTodayDate(),
    endDate: getTodayDate(),
  });
  const [activeFilters, setActiveFilters] = useState({
    patient_hn: '',
    en: '',
    startDate: getTodayDate(),
    endDate: getTodayDate(),
  });
  const [selectedLog, setSelectedLog] = useState<{ id: number; usage_id: number | null; action: any; created_at: string } | null>(null);

  const fetchLogs = async (customFilters?: typeof activeFilters, page?: number) => {
    try {
      setLoading(true);
      const f = customFilters ?? activeFilters;
      const params: Record<string, string | number> = { page: page ?? currentPage, limit };
      if (f.startDate) params.startDate = f.startDate;
      if (f.endDate) params.endDate = f.endDate;
      if (f.patient_hn?.trim()) params.patient_hn = f.patient_hn.trim();
      if (f.en?.trim()) params.en = f.en.trim();

      const res = await medicalSuppliesApi.getLogs(params);
      const data = res?.data ?? [];
      setLogs(Array.isArray(data) ? data : []);
      setTotal(res?.total ?? 0);
      setTotalPages(res?.totalPages ?? 1);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      toast.error('โหลด log ไม่ได้');
      setLogs([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchLogs(activeFilters, currentPage);
    }
  }, [user?.id, activeFilters, currentPage]);

  const handleSearch = () => {
    setActiveFilters(formFilters);
    setCurrentPage(1);
  };

  const handleReset = () => {
    const reset = { patient_hn: '', en: '', startDate: getTodayDate(), endDate: getTodayDate() };
    setFormFilters(reset);
    setActiveFilters(reset);
    setCurrentPage(1);
  };

  const getHnEnFromAction = (action: any): string => {
    if (!action || typeof action !== 'object') return '-';
    const a = action as Record<string, unknown>;
    const hn = typeof a.patient_hn === 'string' ? a.patient_hn : '';
    const en = typeof a.en === 'string' ? a.en : '';
    if (!hn && !en) return '-';
    return [hn, en].filter(Boolean).join(' / ');
  };

  const getMethodFromAction = (action: any): string => {
    if (!action || typeof action !== 'object') return '-';
    const type = String((action as Record<string, unknown>).type ?? '').toUpperCase();
    if (type === 'QUERY') return 'GET';
    if (type === 'CREATE') return 'POST';
    if (type === 'UPDATE' || type === 'UPDATE_PRINT_INFO') return 'PUT';
    if (type === 'DELETE') return 'DELETE';
    return 'OTHER';
  };

  const getActionTypeLabel = (action: any): string => {
    if (!action || typeof action !== 'object') return '-';
    const type = String((action as Record<string, unknown>).type ?? '').toUpperCase();
    if (type === 'UPDATE_PRINT_INFO') return 'UPDATE_PRINT_INFO';
    return type || '-';
  };

  const getMethodBadge = (action: any) => {
    const typeLabel = getActionTypeLabel(action);
    const method = getMethodFromAction(action);
    const classes: Record<string, string> = {
      GET: 'bg-blue-50 text-blue-700 border-blue-200',
      POST: 'bg-green-50 text-green-700 border-green-200',
      PUT: 'bg-amber-50 text-amber-700 border-amber-200',
      DELETE: 'bg-red-50 text-red-700 border-red-200',
      OTHER: 'bg-slate-50 text-slate-600 border-slate-200',
    };
    return (
      <Badge variant="outline" className={cn('text-xs font-mono', classes[method] ?? classes.OTHER)}>
        {typeLabel}
      </Badge>
    );
  };

  const formatDate = (v: string | Date) => {
    try {
      const d = new Date(v as string);
      return d.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return String(v ?? '-');
    }
  };

  const getActionSummary = (action: any): string => {
    if (!action || typeof action !== 'object') return '-';
    const a = action as Record<string, unknown>;
    if (a.reason && typeof a.reason === 'string') return a.reason;
    if (a.error_message && typeof a.error_message === 'string') return a.error_message;
    if (a.action && typeof a.action === 'string') return a.action;
    if (a.type && typeof a.type === 'string') return a.type;
    try {
      return JSON.stringify(action).slice(0, 80) + (JSON.stringify(action).length > 80 ? '…' : '');
    } catch {
      return '-';
    }
  };

  const getStatusBadge = (action: any) => {
    if (!action || typeof action !== 'object') return null;
    const status = (action as Record<string, unknown>).status as string | undefined;
    if (!status) return null;
    const s = String(status).toLowerCase();
    if (s === 'success')
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
          SUCCESS
        </Badge>
      );
    if (s === 'error')
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
          ERROR
        </Badge>
      );
    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs">
        {status}
      </Badge>
    );
  };

  const formatActionJson = (action: any): string => {
    if (action == null) return 'null';
    try {
      return JSON.stringify(action, null, 2);
    } catch {
      return String(action);
    }
  };

  /** สร้าง array เลขหน้าที่แสดงใน pagination (มี ... สำหรับข้ามหน้า) */
  const getPaginationPages = (current: number, total: number): (number | 'ellipsis')[] => {
    if (total <= 1) return [];
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const result: (number | 'ellipsis')[] = [1];
    if (current > 3) result.push('ellipsis');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) result.push(i);
    if (current < total - 2) result.push('ellipsis');
    if (total > 1) result.push(total);
    return result;
  };

  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-full">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 flex-wrap">
              <FileText className="h-6 w-6 sm:h-7 sm:w-7 shrink-0" />
              <span>Log การเบิกอุปกรณ์</span>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              แสดงประวัติการดำเนินการของระบบเบิกอุปกรณ์ (Medical Supply Usage Logs)
            </p>
          </div>

          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">ตัวกรอง</CardTitle>
              <CardDescription>กรองตามเลข HN, EN หรือช่วงวันที่</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">HN</Label>
                  <Input
                    placeholder="เลข HN"
                    value={formFilters.patient_hn}
                    onChange={(e) => setFormFilters((p) => ({ ...p, patient_hn: e.target.value }))}
                    className="h-9 sm:h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">EN</Label>
                  <Input
                    placeholder="เลข EN"
                    value={formFilters.en}
                    onChange={(e) => setFormFilters((p) => ({ ...p, en: e.target.value }))}
                    className="h-9 sm:h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">วันที่เริ่ม</Label>
                  <DatePickerBE
                    value={formFilters.startDate}
                    onChange={(v) => setFormFilters((p) => ({ ...p, startDate: v }))}
                    placeholder="วว/ดด/ปปปป (พ.ศ.)"
                    className="h-9 sm:h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">วันที่สิ้นสุด</Label>
                  <DatePickerBE
                    value={formFilters.endDate}
                    onChange={(v) => setFormFilters((p) => ({ ...p, endDate: v }))}
                    placeholder="วว/ดด/ปปปป (พ.ศ.)"
                    className="h-9 sm:h-10"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-end lg:flex-col lg:flex-row">
                  <Button onClick={handleSearch} className="gap-2 h-9 sm:h-10 order-1" size="sm">
                    <Search className="h-4 w-4 shrink-0" />
                    ค้นหา
                  </Button>
                  <Button variant="outline" onClick={handleReset} className="gap-2 h-9 sm:h-10 order-2" size="sm">
                    <RefreshCw className="h-4 w-4 shrink-0" />
                    ล้าง
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg">รายการ Log</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                ทั้งหมด {total} รายการ (หน้า {currentPage} / {totalPages})
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              {loading ? (
                <div className="py-12 sm:py-16 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="mt-3 text-sm text-muted-foreground">กำลังโหลด...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="py-12 sm:py-16 text-center">
                  <FileText className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50" />
                  <p className="mt-3 text-muted-foreground text-sm sm:text-base">ไม่พบข้อมูล log</p>
                  <p className="text-xs sm:text-sm text-muted-foreground/80 mt-1">ลองเปลี่ยนตัวกรองหรือช่วงวันที่</p>
                </div>
              ) : (
                <>
                  {/* Mobile: card list */}
                  <div className="block md:hidden space-y-3">
                    {logs.map((row) => (
                      <div
                        key={row.id}
                        className="rounded-lg border bg-card p-3 space-y-2 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-muted-foreground shrink-0 text-xs">
                            {formatDate(row.created_at)}
                          </span>
                          <span className="flex shrink-0 gap-1">
                            {getMethodBadge(row.action)}
                            {getStatusBadge(row.action)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-xs">
                          <span>HN: {(row.action && typeof (row.action as any).patient_hn === 'string') ? (row.action as any).patient_hn : '–'}</span>
                          <span>EN: {(row.action && typeof (row.action as any).en === 'string') ? (row.action as any).en : '–'}</span>
                        </div>
                        <p className="text-muted-foreground line-clamp-2 text-xs" title={getActionSummary(row.action)}>
                          {getActionSummary(row.action)}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-1.5 text-primary border-primary/30 hover:bg-primary/10 text-xs"
                          onClick={() => setSelectedLog(row)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          ดูรายละเอียด
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: table */}
                  <div className="hidden md:block overflow-x-auto rounded-lg border border-border -mx-1">
                    <Table className="min-w-[800px]">
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="font-semibold w-[170px]">วันเวลา</TableHead>
                          <TableHead className="font-semibold w-[110px]">เลข HN</TableHead>
                          <TableHead className="font-semibold w-[110px]">เลข EN</TableHead>
                          <TableHead className="font-semibold w-[140px]">ประเภท</TableHead>
                          <TableHead className="font-semibold w-[90px]">สถานะ</TableHead>
                          <TableHead className="font-semibold min-w-[200px]">รายละเอียด</TableHead>
                          <TableHead className="font-semibold w-[120px] text-center">การดำเนินการ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map((row) => (
                          <TableRow key={row.id} className="hover:bg-muted/30">
                            <TableCell className="text-sm whitespace-nowrap text-foreground/90">
                              {formatDate(row.created_at)}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {(row.action && typeof (row.action as any).patient_hn === 'string') ? (row.action as any).patient_hn : '–'}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {(row.action && typeof (row.action as any).en === 'string') ? (row.action as any).en : '–'}
                            </TableCell>
                            <TableCell>{getMethodBadge(row.action)}</TableCell>
                            <TableCell>{getStatusBadge(row.action)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[280px]">
                              <span className="line-clamp-2" title={getActionSummary(row.action)}>
                                {getActionSummary(row.action)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                                onClick={() => setSelectedLog(row)}
                              >
                                <Eye className="h-4 w-4" />
                                ดูรายละเอียด
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t">
                  <p className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1 text-center sm:text-left">
                    แสดง {(currentPage - 1) * limit + 1}–{Math.min(currentPage * limit, total)} จาก {total} รายการ
                  </p>
                  <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2 flex-wrap justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                      className="h-8 w-8 p-0 shrink-0"
                      aria-label="ก่อนหน้า"
                    >
                      ‹
                    </Button>
                    {getPaginationPages(currentPage, totalPages).map((item, i) =>
                      item === 'ellipsis' ? (
                        <span key={`ellipsis-${i}`} className="px-1.5 sm:px-2 text-muted-foreground text-sm">
                          …
                        </span>
                      ) : (
                        <Button
                          key={item}
                          variant={currentPage === item ? 'default' : 'outline'}
                          size="sm"
                          className="h-8 min-w-[2rem] px-1.5 sm:px-2 text-xs sm:text-sm"
                          onClick={() => setCurrentPage(item)}
                        >
                          {item}
                        </Button>
                      )
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="h-8 w-8 p-0 shrink-0"
                      aria-label="ถัดไป"
                    >
                      ›
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
            <DialogContent className="w-[calc(100%-1rem)] max-w-3xl max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col gap-0 p-4 sm:p-6 mx-auto">
              <DialogHeader className="pb-3 sm:pb-4 border-b shrink-0">
                <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  รายละเอียด Log
                </DialogTitle>
              </DialogHeader>
              {selectedLog && (
                <div className="flex flex-col gap-4 sm:gap-5 overflow-y-auto flex-1 min-h-0 py-3 sm:py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 sm:gap-y-3 text-sm">
                    <div className="flex justify-between sm:block sm:space-y-1 gap-2">
                      <span className="text-muted-foreground shrink-0 w-24 sm:w-auto">วันเวลา</span>
                      <span className="font-medium text-right sm:text-left break-all">{formatDate(selectedLog.created_at)}</span>
                    </div>
                    <div className="flex justify-between sm:block sm:space-y-1 gap-2">
                      <span className="text-muted-foreground shrink-0 w-24 sm:w-auto">Usage ID</span>
                      <span className="font-mono text-right sm:text-left">{selectedLog.usage_id ?? '–'}</span>
                    </div>
                    <div className="flex justify-between sm:block sm:space-y-1 gap-2">
                      <span className="text-muted-foreground shrink-0 w-24 sm:w-auto">เลข HN / EN</span>
                      <span className="font-mono text-right sm:text-left break-all">{getHnEnFromAction(selectedLog.action)}</span>
                    </div>
                    <div className="flex justify-between sm:block sm:space-y-1 gap-2">
                      <span className="text-muted-foreground shrink-0 w-24 sm:w-auto">ประเภท</span>
                      <span className="text-right sm:text-left">{getMethodBadge(selectedLog.action)}</span>
                    </div>
                    <div className="flex justify-between sm:block sm:space-y-1 gap-2">
                      <span className="text-muted-foreground shrink-0 w-24 sm:w-auto">สถานะ</span>
                      <span className="text-right sm:text-left">{getStatusBadge(selectedLog.action)}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2 min-h-0 flex flex-col">
                    <p className="text-sm font-medium text-foreground shrink-0">ข้อมูล action (JSON)</p>
                    <pre className="p-3 sm:p-4 bg-muted/50 border rounded-lg text-[11px] sm:text-xs overflow-auto max-h-[40vh] sm:max-h-[45vh] whitespace-pre-wrap break-words font-mono leading-relaxed shrink min-h-0">
                      {formatActionJson(selectedLog.action)}
                    </pre>
                  </div>
                </div>
              )}
              <DialogFooter className="border-t pt-3 sm:pt-4 shrink-0">
                <Button variant="outline" onClick={() => setSelectedLog(null)} className="w-full sm:w-auto">
                  ปิด
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
