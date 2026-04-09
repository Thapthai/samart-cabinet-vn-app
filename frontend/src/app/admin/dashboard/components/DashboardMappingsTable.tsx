"use client";

import { useState, Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Loader2, Package, Layers } from "lucide-react";
import { cabinetSubDepartmentApi } from "@/lib/api";
import { toast } from "sonner";
import CabinetDetailsCard from "@/app/admin/cabinet-departments/components/CabinetDetailsCard";

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

interface CabinetSubDepartmentLink {
  id: number;
  cabinet_id: number;
  sub_department_id: number;
  status: string;
  description?: string | null;
  sort_order: number;
  subDepartment?: {
    id: number;
    code: string;
    name?: string | null;
    department?: { ID: number; DepName?: string; DepName2?: string };
  };
}

interface DashboardMappingsTableProps {
  mappings: CabinetDepartment[];
  loading: boolean;
}

const TABLE_COL_SPAN = 6;
const ITEMS_PER_PAGE = 5;

export default function DashboardMappingsTable({ mappings, loading }: DashboardMappingsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState<CabinetDepartment | null>(null);
  const [expandedDropdown, setExpandedDropdown] = useState<number | null>(null);
  const [cabinetSubRows, setCabinetSubRows] = useState<Record<number, CabinetSubDepartmentLink[]>>({});
  const [loadingSubDepartments, setLoadingSubDepartments] = useState<number | null>(null);

  const totalPages = Math.ceil(mappings.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentMappings = mappings.slice(startIndex, endIndex);

  const handleDropdownToggle = async (e: React.MouseEvent, mapping: CabinetDepartment) => {
    e.stopPropagation();
    const cabinetId = mapping.cabinet_id;

    if (expandedDropdown === mapping.id) {
      setExpandedDropdown(null);
      return;
    }

    setExpandedDropdown(mapping.id);

    if (cabinetSubRows[cabinetId] !== undefined) {
      return;
    }

    try {
      setLoadingSubDepartments(cabinetId);
      const response = await cabinetSubDepartmentApi.getAll({ cabinetId });

      if (response.success && Array.isArray(response.data)) {
        setCabinetSubRows((prev) => ({ ...prev, [cabinetId]: response.data as CabinetSubDepartmentLink[] }));
      } else {
        toast.error("ไม่สามารถโหลดแผนกย่อยที่ผูกกับตู้ได้");
        setCabinetSubRows((prev) => ({ ...prev, [cabinetId]: [] }));
      }
    } catch (error: unknown) {
      console.error("Error loading cabinet sub-departments:", error);
      const msg = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล";
      toast.error(msg);
      setCabinetSubRows((prev) => ({ ...prev, [cabinetId]: [] }));
    } finally {
      setLoadingSubDepartments(null);
    }
  };

  const handleRowClick = (mapping: CabinetDepartment) => {
    setSelectedRow(mapping);
  };

  const renderCabinetSubDepartments = (cabinetId: number, mappingId: number) => {
    const rows = cabinetSubRows[cabinetId];
    if (!rows?.length) return null;

    return (
      <div>
        <h4 className="font-semibold mb-3 text-gray-700 flex items-center gap-2">
          <Layers className="h-4 w-4" />
          แผนกย่อยที่ผูกกับตู้ ({rows.length} รายการ)
        </h4>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-14 px-3 py-3 text-slate-600 sm:px-4 sm:py-3.5">ลำดับ</TableHead>
                <TableHead className="px-3 py-3 text-slate-600 sm:px-4 sm:py-3.5">รหัสแผนก</TableHead>
                <TableHead className="px-3 py-3 text-slate-600 sm:px-4 sm:py-3.5">ชื่อแผนก</TableHead>
                <TableHead className="px-3 py-3 text-slate-600 sm:px-4 sm:py-3.5">สถานะการผูก</TableHead>
                <TableHead className="px-3 py-3 text-slate-600 sm:px-4 sm:py-3.5">หมายเหตุ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={`${mappingId}-sub-${row.id}`} className="border-b border-slate-100 last:border-0">
                  <TableCell className="px-3 py-3 text-slate-600 sm:px-4 sm:py-3.5">{i + 1}</TableCell>
                  <TableCell className="px-3 py-3 font-mono text-sm sm:px-4 sm:py-3.5">
                    {row.subDepartment?.code ?? "-"}
                  </TableCell>
                  <TableCell className="px-3 py-3 sm:px-4 sm:py-3.5">{row.subDepartment?.name ?? "-"}</TableCell>
                  <TableCell className="px-3 py-3 sm:px-4 sm:py-3.5">
                    <Badge
                      variant={row.status === "ACTIVE" ? "default" : "secondary"}
                      className={
                        row.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                          : ""
                      }
                    >
                      {row.status === "ACTIVE" ? "ใช้งาน" : row.status || "-"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[12rem] truncate px-3 py-3 text-slate-600 sm:max-w-xs sm:px-4 sm:py-3.5">
                    {row.description || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  return (
    <>
      <Card className="border-slate-200/80 shadow-sm overflow-hidden rounded-xl h-full min-h-0 flex flex-col">
        <CardHeader className="flex shrink-0 flex-row items-start justify-between space-y-0 gap-4 border-b border-slate-100 bg-slate-50/50 pb-2">
          <CardTitle className="text-slate-800 flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            รายการเชื่อมโยง ({mappings.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-auto px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                <p className="mt-2 text-sm text-gray-600">กำลังโหลด...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-b-xl">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-slate-200 bg-slate-100/80 hover:bg-slate-100/80">
                      <TableHead className="w-12 px-3 py-3.5 text-slate-600 sm:px-4 sm:py-4"></TableHead>
                      <TableHead className="px-3 py-3.5 text-slate-600 sm:px-4 sm:py-4">ลำดับ</TableHead>
                      <TableHead className="px-3 py-3.5 text-slate-600 sm:px-4 sm:py-4">ชื่อตู้</TableHead>
                      <TableHead className="px-3 py-3.5 text-slate-600 sm:px-4 sm:py-4">Division</TableHead>
                      <TableHead className="px-3 py-3.5 text-slate-600 sm:px-4 sm:py-4">สถานะ</TableHead>
                      <TableHead className="px-3 py-3.5 text-slate-600 sm:px-4 sm:py-4">หมายเหตุ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentMappings.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell
                          colSpan={TABLE_COL_SPAN}
                          className="px-4 py-14 text-center text-slate-500 sm:px-5"
                        >
                          ไม่พบข้อมูล
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentMappings.map((mapping, index) => (
                        <Fragment key={mapping.id}>
                          <TableRow
                            className={`cursor-pointer transition-colors ${
                              selectedRow?.id === mapping.id ? "bg-blue-50/80" : "hover:bg-slate-50/80"
                            }`}
                            onClick={() => handleRowClick(mapping)}
                          >
                            <TableCell
                              className="px-3 py-3.5 sm:px-4 sm:py-4"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={(e) => void handleDropdownToggle(e, mapping)}
                                className="rounded p-1.5 hover:bg-slate-200"
                                type="button"
                                aria-expanded={expandedDropdown === mapping.id}
                              >
                                {expandedDropdown === mapping.id ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            </TableCell>
                            <TableCell className="px-3 py-3.5 sm:px-4 sm:py-4">{startIndex + index + 1}</TableCell>
                            <TableCell className="px-3 py-3.5 sm:px-4 sm:py-4">
                              {mapping.cabinet?.cabinet_name || "-"}
                            </TableCell>
                            <TableCell className="px-3 py-3.5 sm:px-4 sm:py-4">
                              {mapping.department?.DepName || "-"}
                            </TableCell>
                            <TableCell className="px-3 py-3.5 sm:px-4 sm:py-4">
                              <Badge
                                variant={mapping.status === "ACTIVE" ? "default" : "secondary"}
                                className={
                                  mapping.status === "ACTIVE"
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                                    : ""
                                }
                              >
                                {mapping.status === "ACTIVE" ? "ใช้งาน" : "ไม่ใช้งาน"}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate px-3 py-3.5 sm:px-4 sm:py-4">
                              {mapping.description || "-"}
                            </TableCell>
                          </TableRow>

                          {expandedDropdown === mapping.id && (
                            <TableRow>
                              <TableCell colSpan={TABLE_COL_SPAN} className="bg-gray-50 p-5 sm:p-6">
                                {loadingSubDepartments === mapping.cabinet_id ? (
                                  <div className="flex items-center justify-center py-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                                    <span className="ml-2 text-gray-600">กำลังโหลดแผนกย่อย...</span>
                                  </div>
                                ) : cabinetSubRows[mapping.cabinet_id] !== undefined &&
                                  cabinetSubRows[mapping.cabinet_id].length > 0 ? (
                                  renderCabinetSubDepartments(mapping.cabinet_id, mapping.id)
                                ) : (
                                  <div className="text-center py-4 text-gray-500">
                                    ไม่พบแผนกย่อยที่ผูกกับตู้นี้
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
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

      {selectedRow && (
        <CabinetDetailsCard selectedRow={selectedRow} onClose={() => setSelectedRow(null)} />
      )}
    </>
  );
}
