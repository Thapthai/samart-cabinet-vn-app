'use client';

import { useEffect, useState } from 'react';
import { staffMedicalSuppliesApi } from '@/lib/staffApi/medicalSuppliesApi';
import { toast } from 'sonner';
import { FileText, Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePickerBE } from '@/components/ui/date-picker-be';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function LogsPage() {

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

  const fetchLogs = async (customFilters?: typeof activeFilters, page?: number) => {
    try {
      setLoading(true);
      const f = customFilters ?? activeFilters;
      const params: Record<string, string | number> = { page: page ?? currentPage, limit };
      if (f.startDate) params.startDate = f.startDate;
      if (f.endDate) params.endDate = f.endDate;
      if (f.patient_hn?.trim()) params.patient_hn = f.patient_hn.trim();
      if (f.en?.trim()) params.en = f.en.trim();

      const res = await staffMedicalSuppliesApi.getLogs(params);
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
    fetchLogs(activeFilters, currentPage);
  }, [activeFilters, currentPage]);

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

  return (
    <>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7" />
            Log การเบิกอุปกรณ์ (Medical Supply Usage Logs)
          </h1>
          <p className="text-gray-500 mt-1">
            แสดงประวัติการดำเนินการของระบบเบิกอุปกรณ์
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>ตัวกรอง</CardTitle>
            <CardDescription>กรองตามเลข HN, EN หรือช่วงวันที่</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label>HN</Label>
                <Input
                  placeholder="เลข HN"
                  value={formFilters.patient_hn}
                  onChange={(e) => setFormFilters((p) => ({ ...p, patient_hn: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>EN</Label>
                <Input
                  placeholder="เลข EN"
                  value={formFilters.en}
                  onChange={(e) => setFormFilters((p) => ({ ...p, en: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>วันที่เริ่ม</Label>
                <DatePickerBE
                  value={formFilters.startDate}
                  onChange={(value) => setFormFilters((p) => ({ ...p, startDate: value }))}
                  placeholder="วว/ดด/ปปปป (พ.ศ.)"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>วันที่สิ้นสุด</Label>
                <DatePickerBE
                  value={formFilters.endDate}
                  onChange={(value) => setFormFilters((p) => ({ ...p, endDate: value }))}
                  placeholder="วว/ดด/ปปปป (พ.ศ.)"
                  className="mt-1"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={handleSearch} className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  ค้นหา
                </Button>
                <Button variant="outline" onClick={handleReset} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  ล้าง
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>รายการ Log</CardTitle>
            <CardDescription>
              ทั้งหมด {total} รายการ (หน้า {currentPage} / {totalPages})
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center text-gray-500">กำลังโหลด...</div>
            ) : logs.length === 0 ? (
              <div className="py-12 text-center text-gray-500">ไม่พบข้อมูล log</div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="table-fixed w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">วันเวลา</TableHead>
                      <TableHead className="w-[140px]">เลข HN/EN</TableHead>
                      <TableHead className="w-[200px]">ประเภท (CREATE / QUERY / UPDATE)</TableHead>
                      <TableHead className="w-[100px]">สถานะ</TableHead>
                      <TableHead className="min-w-[300px]">รายละเอียด</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-sm whitespace-nowrap w-[180px]">
                          {formatDate(row.created_at)}
                        </TableCell>
                        <TableCell className="font-mono text-sm w-[140px]">
                          {getHnEnFromAction(row.action)}
                        </TableCell>
                        <TableCell className="text-sm w-[200px]">
                          {getMethodBadge(row.action)}
                        </TableCell>
                        <TableCell className="w-[100px]">{getStatusBadge(row.action)}</TableCell>
                        <TableCell className="text-sm text-gray-600 min-w-[300px] truncate" title={getActionSummary(row.action)}>
                          {getActionSummary(row.action)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">
                  แสดง {(currentPage - 1) * limit + 1}–{Math.min(currentPage * limit, total)} จาก {total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    ก่อนหน้า
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    ถัดไป
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
