"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, RefreshCw } from "lucide-react";

export interface CabinetDepartment {
  id: number;
  cabinet_id: number;
  department_id: number;
  status: string;
  description?: string;
  itemstock_count?: number;
  itemstock_dispensed_count?: number;
  cabinet?: {
    id: number;
    cabinet_name?: string;
    cabinet_code?: string;
  };
  department?: {
    ID: number;
    DepName?: string;
  };
}

interface DashboardMappingsTableProps {
  mappings: CabinetDepartment[];
  loading: boolean;
}

const COLUMN_COUNT = 7;
const ITEMS_PER_PAGE = 10;

export default function DashboardMappingsTable({ mappings, loading }: DashboardMappingsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(mappings.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentMappings = mappings.slice(startIndex, endIndex);

  const getStatusDisplay = (status: string) => {
    const isActive = status === "ACTIVE";
    const isInactive = status === "INACTIVE";
    const label = isActive ? "ใช้งาน" : isInactive ? "ไม่ใช้งาน" : status || "-";
    const styles = isActive
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : isInactive
        ? "bg-slate-100 text-slate-600 border-slate-200"
        : "bg-amber-50 text-amber-700 border-amber-200";
    const dotClass = isActive
      ? "bg-emerald-500"
      : isInactive
        ? "bg-slate-400"
        : "bg-amber-500";
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${styles}`}
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
        {label}
      </span>
    );
  };

  return (
    <Card className="h-full min-h-0 flex flex-col overflow-hidden">
      <CardHeader className="shrink-0">
        <CardTitle>รายการเชื่อมโยง ({mappings.length})</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <p className="mt-2 text-sm text-gray-600">กำลังโหลด...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ลำดับ</TableHead>
                    {/* <TableHead>รหัสตู้</TableHead> */}
                    <TableHead>ชื่อตู้</TableHead>
                    <TableHead>แผนก</TableHead>
                    <TableHead className="text-center">จำนวนอุปกรณ์</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>หมายเหตุ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentMappings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={COLUMN_COUNT} className="text-center text-gray-500">
                        ไม่พบข้อมูล
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentMappings.map((mapping, index) => (
                      <TableRow
                        key={mapping.id}
                        className="cursor-pointer hover:bg-gray-50"
                      >
                        <TableCell>{startIndex + index + 1}</TableCell>
                        {/* <TableCell>{mapping.cabinet?.cabinet_code || "-"}</TableCell> */}
                        <TableCell>{mapping.cabinet?.cabinet_name || "-"}</TableCell>
                        <TableCell>{mapping.department?.DepName || "-"}</TableCell>
                        <TableCell className="text-center">
                          <span className="font-medium text-slate-700">
                            {mapping.itemstock_dispensed_count ?? 0} / {mapping.itemstock_count ?? 0}
                          </span>
                          <span className="text-xs text-slate-500 ml-1">(ถูกเบิก / ในตู้)</span>
                        </TableCell>
                        <TableCell>{getStatusDisplay(mapping.status)}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {mapping.description || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600">
                  แสดง {startIndex + 1}-{Math.min(endIndex, mappings.length)} จาก {mappings.length} รายการ
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    ก่อนหน้า
                  </Button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    ถัดไป
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
