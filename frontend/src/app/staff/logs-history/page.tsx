'use client';

import { useEffect, useState } from 'react';
import { staffMedicalSuppliesApi } from '@/lib/staffApi/medicalSuppliesApi';
import { toast } from 'sonner';
import { FileText, Search, RefreshCw, Eye, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePickerBE } from '@/components/ui/date-picker-be';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatUtcDateTime } from '@/lib/formatThaiDateTime';
import {
  formatLogCompareItemCodeCount,
  logActionHasCompareCounts,
  logCompareOrangeDialogRowClass,
  logCompareOrangeMobileChipClass,
  logCompareOrangeValueClass,
  logCompareRedDialogRowClass,
  logCompareRedMobileChipClass,
  logCompareRedValueClass,
} from '@/lib/medicalSupplyLogCompareCounts';

export default function LogsPage() {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<
    Array<{
      patient_hn: string;
      en: string;
      log_count: number;
      last_activity_at: string;
      logs: any[];
    }>
  >([]);
  const [totalGroups, setTotalGroups] = useState(0);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
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
    log_status: '',
    startDate: getTodayDate(),
    endDate: getTodayDate(),
  });
  const [activeFilters, setActiveFilters] = useState({
    patient_hn: '',
    en: '',
    log_status: '',
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
      if (f.log_status?.trim()) params.log_status = f.log_status.trim();

      const res = await staffMedicalSuppliesApi.getLogs(params);
      setGroups(Array.isArray(res?.groups) ? res.groups : []);
      setTotalGroups(res?.total_groups ?? 0);
      setTotalPages(res?.totalPages ?? 1);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      toast.error('โหลด log ไม่ได้');
      setGroups([]);
      setTotalGroups(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(activeFilters, currentPage);
  }, [activeFilters, currentPage]);

  const handleSearch = () => {
    setActiveFilters(formFilters);
    setCurrentPage(1);
  };

  const handleReset = () => {
    const reset = {
      patient_hn: '',
      en: '',
      log_status: '',
      startDate: getTodayDate(),
      endDate: getTodayDate(),
    };
    setFormFilters(reset);
    setActiveFilters(reset);
    setCurrentPage(1);
  };

  const getHnEnFromAction = (action: any): string => {
    if (!action || typeof action !== 'object') return '-';
    const a = action as Record<string, unknown>;
    const hn = typeof a.patient_hn === 'string' ? a.patient_hn : '';
    const enVal = typeof a.en === 'string' ? a.en : '';
    if (!hn && !enVal) return '-';
    return [hn, enVal].filter(Boolean).join(' / ');
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
      POST:
        typeLabel === 'CREATE'
          ? 'bg-blue-50 text-blue-700 border-blue-200'
          : 'bg-green-50 text-green-700 border-green-200',
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

  const formatDate = (v: string | Date) => formatUtcDateTime(String(v));

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

  const getLogDescription = (row: any): string => {
    const d = row?.description;
    if (d != null && String(d).trim()) return String(d).trim();
    return getActionSummary(row?.action);
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

  const groupRowKey = (g: { patient_hn: string; en: string }, i: number) =>
    `${g.patient_hn}\0${g.en}\0${i}`;

  const toggleGroup = (key: string) => {
    setExpandedKeys((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  };

  const rowHn = (row: any) =>
    row?.patient_hn ||
    (row?.action && typeof row.action.patient_hn === 'string' ? row.action.patient_hn : null) ||
    '–';
  const rowEn = (row: any) =>
    row?.en || (row?.action && typeof row.action.en === 'string' ? row.action.en : null) || '–';

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
          <CardDescription>กรองตามเลข HN, EN สถานะ หรือช่วงวันที่</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
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
              <Label className="text-sm">สถานะ</Label>
              <Select
                value={formFilters.log_status || 'all'}
                onValueChange={(v) =>
                  setFormFilters((p) => ({ ...p, log_status: v === 'all' ? '' : v }))
                }
              >
                <SelectTrigger className="h-9 sm:h-10 w-full">
                  <SelectValue placeholder="ทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="SUCCESS">SUCCESS</SelectItem>
                  <SelectItem value="ERROR">ERROR</SelectItem>
                </SelectContent>
              </Select>
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
            <div className="flex flex-col sm:flex-row gap-2 sm:items-end lg:flex-col lg:flex-row lg:col-span-1">
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
          <CardTitle className="text-base sm:text-lg">รายการ Log (จัดกลุ่มตาม HN + EN)</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {totalGroups} กลุ่มผู้ป่วย · หน้า {currentPage} / {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          {loading ? (
            <div className="py-12 sm:py-16 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-3 text-sm text-muted-foreground">กำลังโหลด...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="py-12 sm:py-16 text-center">
              <FileText className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50" />
              <p className="mt-3 text-muted-foreground text-sm sm:text-base">ไม่พบข้อมูล log</p>
              <p className="text-xs sm:text-sm text-muted-foreground/80 mt-1">ลองเปลี่ยนตัวกรองหรือช่วงวันที่</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {groups.map((g, gi) => {
                const gkey = groupRowKey(g, gi);
                const open = expandedKeys.has(gkey);
                return (
                  <div key={gkey} className="rounded-lg border border-border bg-card overflow-hidden">
                    <button
                      type="button"
                      className="w-full flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4 text-left hover:bg-muted/40"
                      onClick={() => toggleGroup(gkey)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {open ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="font-mono text-sm">
                          HN {g.patient_hn} · EN {g.en}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {g.log_count}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        ล่าสุด {formatDate(g.last_activity_at)}
                      </span>
                    </button>
                    {open && (
                      <div className="border-t bg-muted/20 px-2 py-2 sm:px-3">
                        <div className="block md:hidden space-y-2">
                          {g.logs.map((row: any) => (
                            <div key={row.id} className="rounded-md border bg-background p-2.5 text-xs space-y-1">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">{formatDate(row.created_at)}</span>
                                <span className="flex gap-1">
                                  {getMethodBadge(row.action)}
                                  {getStatusBadge(row.action)}
                                </span>
                              </div>
                              <p className="text-muted-foreground whitespace-pre-line break-words">
                                {getLogDescription(row)}
                              </p>
                              {logActionHasCompareCounts(row.action) && (
                                <div className="flex flex-wrap gap-2">
                                  <div className={logCompareOrangeMobileChipClass}>
                                    <span className="text-[10px] font-normal text-orange-800/90 dark:text-orange-200/90">
                                      รายการที่ Compare
                                    </span>
                                    <span className="font-semibold tabular-nums">
                                      {formatLogCompareItemCodeCount(row.action, 'compare_item_code_count')}
                                    </span>
                                  </div>
                                  <div className={logCompareRedMobileChipClass}>
                                    <span className="text-[10px] font-normal text-red-800/90 dark:text-red-200/90">
                                      รายการที่ไม่ Compare
                                    </span>
                                    <span className="font-semibold tabular-nums">
                                      {formatLogCompareItemCodeCount(row.action, 'non_compare_item_code_count')}
                                    </span>
                                  </div>
                                </div>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full h-8 text-xs"
                                onClick={() => setSelectedLog(row)}
                              >
                                <Eye className="h-3 w-3 mr-1" /> ดูรายละเอียด
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="hidden md:block overflow-x-auto rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="w-[160px]">วันเวลา</TableHead>
                                <TableHead>HN</TableHead>
                                <TableHead>EN</TableHead>
                                <TableHead>ประเภท</TableHead>
                                <TableHead>สถานะ</TableHead>
                                <TableHead>คำอธิบาย</TableHead>
                                <TableHead className="w-[100px] text-center whitespace-normal leading-tight">
                                  รายการที่ Compare
                                </TableHead>
                                <TableHead className="w-[100px] text-center whitespace-normal leading-tight">
                                  รายการที่ไม่ Compare
                                </TableHead>
                                <TableHead className="w-[80px] text-center">ดู</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {g.logs.map((row: any) => (
                                <TableRow key={row.id}>
                                  <TableCell className="text-sm whitespace-nowrap">
                                    {formatDate(row.created_at)}
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">{rowHn(row)}</TableCell>
                                  <TableCell className="font-mono text-sm">{rowEn(row)}</TableCell>
                                  <TableCell>{getMethodBadge(row.action)}</TableCell>
                                  <TableCell>{getStatusBadge(row.action)}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground max-w-[220px]">
                                    <span className="whitespace-pre-line break-words">{getLogDescription(row)}</span>
                                  </TableCell>
                                  <TableCell className="align-middle p-2 text-center">
                                    <span className={logCompareOrangeValueClass}>
                                      {formatLogCompareItemCodeCount(row.action, 'compare_item_code_count')}
                                    </span>
                                  </TableCell>
                                  <TableCell className="align-middle p-2 text-center">
                                    <span className={logCompareRedValueClass}>
                                      {formatLogCompareItemCodeCount(row.action, 'non_compare_item_code_count')}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Button variant="outline" size="sm" className="h-8" onClick={() => setSelectedLog(row)}>
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t">
              <p className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1 text-center sm:text-left">
                กลุ่ม {(currentPage - 1) * limit + 1}–{Math.min(currentPage * limit, totalGroups)} จาก {totalGroups}{' '}
                กลุ่ม
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
                {logActionHasCompareCounts(selectedLog.action) && (
                  <>
                    <div className={logCompareOrangeDialogRowClass}>
                      <span className="text-sm font-medium text-orange-900 dark:text-orange-100">
                        รายการที่ Compare
                      </span>
                      <span className="font-mono text-lg font-semibold tabular-nums text-orange-950 dark:text-orange-50">
                        {formatLogCompareItemCodeCount(selectedLog.action, 'compare_item_code_count')}
                      </span>
                    </div>
                    <div className={logCompareRedDialogRowClass}>
                      <span className="text-sm font-medium text-red-900 dark:text-red-100">
                        รายการที่ไม่ Compare
                      </span>
                      <span className="font-mono text-lg font-semibold tabular-nums text-red-950 dark:text-red-50">
                        {formatLogCompareItemCodeCount(selectedLog.action, 'non_compare_item_code_count')}
                      </span>
                    </div>
                  </>
                )}
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
            <Button variant="outline" onClick={() => setSelectedLog(null)}>
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
