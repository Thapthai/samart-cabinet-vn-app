"use client";

import { useState, Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, ChevronDown, ChevronRight, Loader2, Package, Download, Layers, Pencil } from "lucide-react";
import { toast } from "sonner";
import CabinetDetailsCard from "./CabinetDetailsCard";
import SubDepartmentMappingDialog from "./SubDepartmentMappingDialog";
import { staffCabinetSubDepartmentApi } from "@/lib/staffApi/cabinetApi";

interface CabinetDepartment {
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

interface MappingTableProps {
  mappings: CabinetDepartment[];
  onEdit: (mapping: CabinetDepartment) => void;
  onDelete: (mapping: CabinetDepartment) => void;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
}

const TABLE_COL_SPAN = 8;

export default function MappingTable({ mappings, onEdit, onDelete, onExportExcel, onExportPdf }: MappingTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState<CabinetDepartment | null>(null);
  const [expandedDropdown, setExpandedDropdown] = useState<number | null>(null);
  const [cabinetSubRows, setCabinetSubRows] = useState<Record<number, CabinetSubDepartmentLink[]>>({});
  const [loadingSubDepartments, setLoadingSubDepartments] = useState<number | null>(null);
  const [subDeptDialogMapping, setSubDeptDialogMapping] = useState<CabinetDepartment | null>(null);
  const [subLinkEditOpen, setSubLinkEditOpen] = useState(false);
  const [subLinkEditCtx, setSubLinkEditCtx] = useState<{
    row: CabinetSubDepartmentLink;
    cabinetId: number;
  } | null>(null);
  const [editSubStatus, setEditSubStatus] = useState("ACTIVE");
  const [editSubSort, setEditSubSort] = useState("0");
  const [editSubDesc, setEditSubDesc] = useState("");
  const [savingSubLink, setSavingSubLink] = useState(false);
  const [subLinkDeleteOpen, setSubLinkDeleteOpen] = useState(false);
  const [subLinkDeleteCtx, setSubLinkDeleteCtx] = useState<{
    row: CabinetSubDepartmentLink;
    cabinetId: number;
  } | null>(null);
  const [deletingSubLink, setDeletingSubLink] = useState(false);
  const itemsPerPage = 5;

  const totalPages = Math.ceil(mappings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
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
      const response = await staffCabinetSubDepartmentApi.getAll({ cabinetId });

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

  const refreshCabinetSubRows = async (cabinetId: number) => {
    try {
      const response = await staffCabinetSubDepartmentApi.getAll({ cabinetId });
      if (response.success && Array.isArray(response.data)) {
        setCabinetSubRows((prev) => ({ ...prev, [cabinetId]: response.data as CabinetSubDepartmentLink[] }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openSubLinkEdit = (row: CabinetSubDepartmentLink, cabinetId: number) => {
    setSubLinkEditCtx({ row, cabinetId });
    setEditSubStatus(row.status === "ACTIVE" ? "ACTIVE" : "INACTIVE");
    setEditSubSort(String(row.sort_order ?? 0));
    setEditSubDesc(row.description ?? "");
    setSubLinkEditOpen(true);
  };

  const submitSubLinkEdit = async () => {
    if (!subLinkEditCtx) return;
    const { row, cabinetId } = subLinkEditCtx;
    const sortNum = parseInt(editSubSort, 10);
    setSavingSubLink(true);
    try {
      const res = await staffCabinetSubDepartmentApi.update(row.id, {
        cabinet_id: row.cabinet_id,
        sub_department_id: row.sub_department_id,
        status: editSubStatus,
        description: editSubDesc.trim() || undefined,
        sort_order: Number.isFinite(sortNum) ? sortNum : 0,
      });
      if (res.success) {
        toast.success("บันทึกแล้ว");
        setSubLinkEditOpen(false);
        setSubLinkEditCtx(null);
        await refreshCabinetSubRows(cabinetId);
      } else {
        toast.error((res as { message?: string }).message || "อัปเดตไม่สำเร็จ");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setSavingSubLink(false);
    }
  };

  const openSubLinkDelete = (row: CabinetSubDepartmentLink, cabinetId: number) => {
    setSubLinkDeleteCtx({ row, cabinetId });
    setSubLinkDeleteOpen(true);
  };

  const confirmSubLinkDelete = async () => {
    if (!subLinkDeleteCtx) return;
    const { row, cabinetId } = subLinkDeleteCtx;
    setDeletingSubLink(true);
    try {
      const res = await staffCabinetSubDepartmentApi.delete(row.id);
      if (res.success) {
        toast.success("ลบการผูกแล้ว");
        setSubLinkDeleteOpen(false);
        setSubLinkDeleteCtx(null);
        await refreshCabinetSubRows(cabinetId);
      } else {
        toast.error((res as { message?: string }).message || "ลบไม่สำเร็จ");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setDeletingSubLink(false);
    }
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
                <TableHead className="px-3 py-3 text-slate-600 sm:px-4 sm:py-3.5">รหัสแผนกย่อย</TableHead>
                <TableHead className="px-3 py-3 text-slate-600 sm:px-4 sm:py-3.5">ชื่อแผนกย่อย</TableHead>
                <TableHead className="px-3 py-3 text-slate-600 sm:px-4 sm:py-3.5">สถานะการผูก</TableHead>
                <TableHead className="w-24 px-3 py-3 text-center text-slate-600 sm:px-4 sm:py-3.5">
                  ลำดับแสดง
                </TableHead>
                <TableHead className="px-3 py-3 text-slate-600 sm:px-4 sm:py-3.5">หมายเหตุ</TableHead>
                <TableHead className="w-[1%] whitespace-nowrap px-3 py-3 text-right text-slate-600 sm:px-4 sm:py-3.5">
                  จัดการ
                </TableHead>
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
                  <TableCell className="px-3 py-3 text-center tabular-nums sm:px-4 sm:py-3.5">
                    {row.sort_order ?? 0}
                  </TableCell>
                  <TableCell className="max-w-[12rem] truncate px-3 py-3 text-slate-600 sm:max-w-xs sm:px-4 sm:py-3.5">
                    {row.description || "-"}
                  </TableCell>
                  <TableCell
                    className="px-3 py-3 text-right sm:px-4 sm:py-3.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 shrink-0 p-0"
                        title="แก้ไข"
                        onClick={(e) => {
                          e.stopPropagation();
                          openSubLinkEdit(row, cabinetId);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-8 w-8 shrink-0 p-0"
                        title="ลบ"
                        onClick={(e) => {
                          e.stopPropagation();
                          openSubLinkDelete(row, cabinetId);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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
      <Card className="border-slate-200/80 shadow-sm overflow-hidden rounded-xl">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-4 border-b border-slate-100 bg-slate-50/50 pb-2">
          <CardTitle className="text-slate-800 flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            รายการเชื่อมโยง ({mappings.length})
          </CardTitle>
          <div className="flex shrink-0 gap-2">
            {onExportExcel && (
              <Button onClick={onExportExcel} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            )}
            {onExportPdf && (
              <Button onClick={onExportPdf} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
          <div className="overflow-x-auto rounded-b-xl">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-200 bg-slate-100/80 hover:bg-slate-100/80">
                  <TableHead className="w-12 px-3 py-3.5 text-slate-600 sm:px-4 sm:py-4"></TableHead>
                  <TableHead className="px-3 py-3.5 text-slate-600 sm:px-4 sm:py-4">ลำดับ</TableHead>
                  <TableHead className="px-3 py-3.5 text-slate-600 sm:px-4 sm:py-4">ชื่อตู้</TableHead>
                  <TableHead className="px-3 py-3.5 text-slate-600 sm:px-4 sm:py-4">แผนก</TableHead>
                  <TableHead className="px-3 py-3.5 text-center text-slate-600 sm:px-4 sm:py-4">
                    จำนวนอุปกรณ์
                  </TableHead>
                  <TableHead className="px-3 py-3.5 text-slate-600 sm:px-4 sm:py-4">สถานะ</TableHead>
                  <TableHead className="px-3 py-3.5 text-slate-600 sm:px-4 sm:py-4">หมายเหตุ</TableHead>
                  <TableHead className="px-3 py-3.5 text-right text-slate-600 sm:px-4 sm:py-4">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentMappings.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={TABLE_COL_SPAN} className="px-4 py-14 text-center text-slate-500 sm:px-5">
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
                        <TableCell className="px-3 py-3.5 sm:px-4 sm:py-4" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleDropdownToggle(e, mapping)}
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
                        <TableCell className="px-3 py-3.5 text-center sm:px-4 sm:py-4">
                          <span className="font-medium text-slate-700">
                            {mapping.itemstock_dispensed_count ?? 0} / {mapping.itemstock_count ?? 0}
                          </span>
                          <span className="ml-1 text-xs text-slate-500">(ถูกเบิก / ในตู้)</span>
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
                            {mapping.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate px-3 py-3.5 sm:px-4 sm:py-4">
                          {mapping.description || "-"}
                        </TableCell>
                        <TableCell
                          className="px-3 py-3.5 text-right sm:px-4 sm:py-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex justify-end flex-wrap gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              title="ผูกแผนกย่อย"
                              onClick={() => setSubDeptDialogMapping(mapping)}
                            >
                              <Layers className="h-4 w-4 mr-1" />
                              แผนกย่อย
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => onEdit(mapping)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => onDelete(mapping)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
        </CardContent>
      </Card>

      {selectedRow && (
        <CabinetDetailsCard selectedRow={selectedRow} onClose={() => setSelectedRow(null)} />
      )}

      <SubDepartmentMappingDialog
        open={subDeptDialogMapping !== null}
        onOpenChange={(o) => !o && setSubDeptDialogMapping(null)}
        mapping={subDeptDialogMapping}
        onSaved={(cabinetId) => void refreshCabinetSubRows(cabinetId)}
      />

      <Dialog
        open={subLinkEditOpen}
        onOpenChange={(o) => {
          setSubLinkEditOpen(o);
          if (!o) setSubLinkEditCtx(null);
        }}
      >
        <DialogContent className="max-h-[min(90dvh,560px)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>แก้ไขการผูกแผนกย่อย</DialogTitle>
          </DialogHeader>
          {subLinkEditCtx ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-800">
                <span className="font-mono font-semibold text-slate-900">
                  {subLinkEditCtx.row.subDepartment?.code ?? "—"}
                </span>
                {subLinkEditCtx.row.subDepartment?.name ? (
                  <span className="text-slate-600"> · {subLinkEditCtx.row.subDepartment.name}</span>
                ) : null}
              </p>
              <div className="space-y-2">
                <Label className="text-sm">สถานะ</Label>
                <Select value={editSubStatus} onValueChange={setEditSubStatus}>
                  <SelectTrigger className="h-10 w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">ใช้งาน</SelectItem>
                    <SelectItem value="INACTIVE">ไม่ใช้งาน</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">ลำดับแสดง</Label>
                <Input
                  type="number"
                  min={0}
                  className="h-10 text-sm tabular-nums"
                  value={editSubSort}
                  onChange={(e) => setEditSubSort(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">หมายเหตุ</Label>
                <Input
                  className="h-10 text-sm"
                  value={editSubDesc}
                  onChange={(e) => setEditSubDesc(e.target.value)}
                  placeholder="—"
                />
              </div>
            </div>
          ) : null}
          <DialogFooter className="mt-2 gap-3 sm:flex-row sm:justify-end sm:gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSubLinkEditOpen(false);
                setSubLinkEditCtx(null);
              }}
              disabled={savingSubLink}
            >
              ยกเลิก
            </Button>
            <Button type="button" disabled={savingSubLink || !subLinkEditCtx} onClick={() => void submitSubLinkEdit()}>
              {savingSubLink ? <Loader2 className="h-4 w-4 animate-spin" /> : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={subLinkDeleteOpen}
        onOpenChange={(o) => {
          setSubLinkDeleteOpen(o);
          if (!o) setSubLinkDeleteCtx(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบการผูกนี้?</AlertDialogTitle>
            <AlertDialogDescription>
              {subLinkDeleteCtx
                ? `เอา ${subLinkDeleteCtx.row.subDepartment?.code ?? ""} ออกจากตู้นี้ (ไม่ลบรหัสใน master)`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingSubLink}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmSubLinkDelete()} disabled={deletingSubLink}>
              {deletingSubLink ? (
                <>
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  กำลังลบ...
                </>
              ) : (
                "ลบ"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
