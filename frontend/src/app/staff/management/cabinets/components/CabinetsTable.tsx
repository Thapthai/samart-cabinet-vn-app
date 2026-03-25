'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Edit, Loader2, Package } from 'lucide-react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

interface Cabinet {
  id: number;
  cabinet_name?: string;
  cabinet_code?: string;
  cabinet_type?: string;
  stock_id?: number;
  cabinet_status?: string;
  created_at?: string;
  updated_at?: string;
}

/** ปิดใช้งานเมื่อ cabinet_status = INACTIVE — นอกนั้นถือว่าเปิด (รวม ACTIVE, USED, AVAILIABLE, …) */
function isCabinetEnabled(status?: string | null): boolean {
  const s = (status ?? 'ACTIVE').toString().toUpperCase();
  return s !== 'INACTIVE';
}

interface CabinetsTableProps {
  cabinets: Cabinet[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onEdit: (cabinet: Cabinet) => void;
  onToggleStatus: (cabinet: Cabinet, enabled: boolean) => void;
  updatingCabinetId: number | null;
  onPageChange: (page: number) => void;
}

export default function CabinetsTable({
  cabinets,
  loading,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onEdit,
  onToggleStatus,
  updatingCabinetId,
  onPageChange,
}: CabinetsTableProps) {
  const getStatusBadge = (status?: string) => {
    const u = (status ?? '').toUpperCase();
    if (u === 'INACTIVE') {
      return <Badge className="bg-slate-500 hover:bg-slate-600">ปิดใช้งาน</Badge>;
    }
    if (u === 'ACTIVE') {
      return <Badge className="bg-emerald-600 hover:bg-emerald-700">ACTIVE</Badge>;
    }
    switch (status) {
      case 'AVAILIABLE':
        return <Badge className="bg-green-500 hover:bg-green-600">ใช้งานได้</Badge>;
      case 'USED':
        return <Badge className="bg-blue-500 hover:bg-blue-600">ใช้งานอยู่</Badge>;
      case 'MAINTENANCE':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">ซ่อมบำรุง</Badge>;
      default:
        return <Badge variant="outline">{status || 'N/A'}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">กำลังโหลดข้อมูล...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (cabinets.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">ไม่พบข้อมูลตู้</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>รายการตู้ทั้งหมด ({totalItems})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>ชื่อตู้</TableHead>
                <TableHead>รหัสตู้</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead>Stock ID</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-center w-[140px]">เปิดใช้งาน</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cabinets.map((cabinet) => {
                const enabled = isCabinetEnabled(cabinet.cabinet_status);
                const busy = updatingCabinetId === cabinet.id;
                return (
                  <TableRow key={cabinet.id}>
                    <TableCell className="font-medium">{cabinet.id}</TableCell>
                    <TableCell>{cabinet.cabinet_name || '-'}</TableCell>
                    <TableCell>{cabinet.cabinet_code || '-'}</TableCell>
                    <TableCell>{cabinet.cabinet_type || '-'}</TableCell>
                    <TableCell>{cabinet.stock_id || '-'}</TableCell>
                    <TableCell>{getStatusBadge(cabinet.cabinet_status)}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={enabled}
                          disabled={busy}
                          onCheckedChange={(checked) => onToggleStatus(cabinet, checked)}
                          aria-label={enabled ? 'ปิดใช้งานตู้' : 'เปิดใช้งานตู้'}
                        />
                        {busy ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(cabinet)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              แสดง {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} จาก {totalItems} รายการ
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600">
                หน้า {currentPage} จาก {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
