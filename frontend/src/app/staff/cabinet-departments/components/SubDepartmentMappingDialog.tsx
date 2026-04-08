"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { ExternalLink, Loader2, Pencil, Plus, PlusCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { staffCabinetSubDepartmentApi } from "@/lib/staffApi/cabinetApi";
import { staffMedicalSupplySubDepartmentsApi } from "@/lib/staffApi/medicalSupplySubDepartmentsApi";

interface CabinetDepartmentMapping {
  id: number;
  cabinet_id: number;
  department_id: number;
  cabinet?: { id: number; cabinet_name?: string; cabinet_code?: string };
  department?: { ID: number; DepName?: string };
}

interface CabinetSubDepartmentLink {
  id: number;
  cabinet_id: number;
  sub_department_id: number;
  status: string;
  description?: string | null;
  sort_order: number;
  subDepartment?: { id: number; code: string; name?: string | null };
}

interface SubMaster {
  id: number;
  department_id: number;
  code: string;
  name: string | null;
  status: boolean;
}

interface SubDepartmentMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapping: CabinetDepartmentMapping | null;
  onSaved: (cabinetId: number) => void;
}

const MASTER_DEPARTMENTS_HREF = "/staff/management/departments";

export default function SubDepartmentMappingDialog({
  open,
  onOpenChange,
  mapping,
  onSaved,
}: SubDepartmentMappingDialogProps) {
  const [links, setLinks] = useState<CabinetSubDepartmentLink[]>([]);
  const [master, setMaster] = useState<SubMaster[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CabinetSubDepartmentLink | null>(null);

  const [addSubId, setAddSubId] = useState<string>("");
  const [addStatus, setAddStatus] = useState("ACTIVE");
  const [addSort, setAddSort] = useState("0");
  const [addDesc, setAddDesc] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editSort, setEditSort] = useState("0");
  const [editDesc, setEditDesc] = useState("");

  const [showMasterCreate, setShowMasterCreate] = useState(false);
  const [masterCreateCode, setMasterCreateCode] = useState("");
  const [masterCreateName, setMasterCreateName] = useState("");
  const [savingMaster, setSavingMaster] = useState(false);

  const loadAll = useCallback(async () => {
    if (!mapping) return;
    setLoading(true);
    try {
      const [linksRes, masterRes] = await Promise.all([
        staffCabinetSubDepartmentApi.getAll({ cabinetId: mapping.cabinet_id }),
        staffMedicalSupplySubDepartmentsApi.getAll(),
      ]);
      if (linksRes.success && Array.isArray(linksRes.data)) {
        setLinks(linksRes.data as CabinetSubDepartmentLink[]);
      } else {
        setLinks([]);
        toast.error((linksRes as { message?: string }).message || "โหลดรายการผูกไม่สำเร็จ");
      }
      if (masterRes.success && Array.isArray(masterRes.data)) {
        setMaster(masterRes.data as SubMaster[]);
      } else {
        setMaster([]);
      }
    } catch (e: unknown) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [mapping]);

  useEffect(() => {
    if (open && mapping) {
      setAddSubId("");
      setAddStatus("ACTIVE");
      setAddSort("0");
      setAddDesc("");
      setEditingId(null);
      setShowMasterCreate(false);
      setMasterCreateCode("");
      setMasterCreateName("");
      void loadAll();
    }
  }, [open, mapping, loadAll]);

  const deptSubs = mapping
    ? master.filter((s) => s.department_id === mapping.department_id && s.status)
    : [];

  const linkedSubIds = new Set(links.map((l) => l.sub_department_id));
  const addOptions = deptSubs.filter((s) => !linkedSubIds.has(s.id));

  const startEdit = (row: CabinetSubDepartmentLink) => {
    setEditingId(row.id);
    setEditStatus(row.status || "ACTIVE");
    setEditSort(String(row.sort_order ?? 0));
    setEditDesc(row.description ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const submitCreateMaster = async () => {
    if (!mapping) return;
    const code = masterCreateCode.trim();
    if (!code) {
      toast.error("กรุณากรอกรหัสแผนกย่อย (code)");
      return;
    }
    setSavingMaster(true);
    try {
      const res = await staffMedicalSupplySubDepartmentsApi.create({
        department_id: mapping.department_id,
        code,
        name: masterCreateName.trim() || undefined,
        status: true,
      });
      if (res.success && res.data && typeof res.data === "object" && res.data !== null && "id" in res.data) {
        toast.success("สร้างรหัสแล้ว — เลือกในรายการแล้วกดผูก");
        const newId = (res.data as { id: number }).id;
        setMasterCreateCode("");
        setMasterCreateName("");
        setShowMasterCreate(false);
        await loadAll();
        setAddSubId(String(newId));
        onSaved(mapping.cabinet_id);
      } else {
        toast.error((res as { message?: string }).message || "สร้างรหัสไม่สำเร็จ");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setSavingMaster(false);
    }
  };

  const submitAdd = async () => {
    if (!mapping || !addSubId) {
      toast.error("กรุณาเลือกแผนกย่อย");
      return;
    }
    const sortNum = parseInt(addSort, 10);
    setSaving(true);
    try {
      const res = await staffCabinetSubDepartmentApi.create({
        cabinet_id: mapping.cabinet_id,
        sub_department_id: parseInt(addSubId, 10),
        status: addStatus,
        description: addDesc.trim() || undefined,
        sort_order: Number.isFinite(sortNum) ? sortNum : 0,
      });
      if (res.success) {
        toast.success("ผูกกับตู้แล้ว");
        setAddSubId("");
        setAddDesc("");
        setAddSort("0");
        await loadAll();
        onSaved(mapping.cabinet_id);
      } else {
        toast.error((res as { message?: string }).message || "ไม่สามารถผูกได้");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (row: CabinetSubDepartmentLink) => {
    if (!mapping) return;
    const sortNum = parseInt(editSort, 10);
    setSaving(true);
    try {
      const res = await staffCabinetSubDepartmentApi.update(row.id, {
        cabinet_id: mapping.cabinet_id,
        sub_department_id: row.sub_department_id,
        status: editStatus,
        description: editDesc.trim() || undefined,
        sort_order: Number.isFinite(sortNum) ? sortNum : 0,
      });
      if (res.success) {
        toast.success("บันทึกแล้ว");
        setEditingId(null);
        await loadAll();
        onSaved(mapping.cabinet_id);
      } else {
        toast.error((res as { message?: string }).message || "อัปเดตไม่สำเร็จ");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (row: CabinetSubDepartmentLink) => {
    setDeleteTarget(row);
    setDeleteOpen(true);
  };

  const doDelete = async () => {
    if (!deleteTarget || !mapping) return;
    setDeletingId(deleteTarget.id);
    try {
      const res = await staffCabinetSubDepartmentApi.delete(deleteTarget.id);
      if (res.success) {
        toast.success("ลบการผูกแล้ว");
        setDeleteOpen(false);
        setDeleteTarget(null);
        await loadAll();
        onSaved(mapping.cabinet_id);
      } else {
        toast.error((res as { message?: string }).message || "ลบไม่สำเร็จ");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setDeletingId(null);
    }
  };

  const cabinetLabel = mapping
    ? [mapping.cabinet?.cabinet_name, mapping.cabinet?.cabinet_code ? `(${mapping.cabinet.cabinet_code})` : null]
        .filter(Boolean)
        .join(" ")
    : "";
  const deptLabel = mapping?.department?.DepName || (mapping ? `#${mapping.department_id}` : "");

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[min(90dvh,880px)] w-full max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(42rem,calc(100vw-1.5rem))] md:max-w-[min(48rem,calc(100vw-2rem))] lg:max-w-[min(56rem,calc(100vw-2rem))]">
          <div className="shrink-0 border-b border-slate-200 px-4 py-3 pr-11 sm:px-5 sm:pr-12">
            <DialogHeader className="space-y-1.5 text-left">
              <DialogTitle className="text-base font-semibold leading-snug">ผูกแผนกย่อยกับตู้</DialogTitle>
              {mapping ? (
                <p className="text-xs leading-relaxed text-slate-600">
                  <span className="text-slate-500">ตู้</span> {cabinetLabel || `#${mapping.cabinet_id}`}
                  <span className="mx-1.5 text-slate-300">·</span>
                  <span className="text-slate-500">แผนก</span> {deptLabel}
                </p>
              ) : null}
              <p className="text-[11px] text-slate-500">
                แผนกย่อยต้องอยู่ภายใต้แผนกหลักเดียวกับตู้ (ตามที่ผูก Cabinet–แผนก)
              </p>
            </DialogHeader>
          </div>

          {loading ? (
            <div className="flex flex-1 items-center justify-center py-14">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5">
              <div className="space-y-4">
                <section className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                  <p className="mb-2 text-xs font-medium text-slate-800">ผูกเพิ่ม</p>
                  <p className="mb-3 text-[11px] text-slate-600">
                    เลือกรหัสแผนกย่อย แล้วกด <strong className="text-slate-800">ผูกกับตู้</strong>
                  </p>

                  <div className="mb-3 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                      <Link href={MASTER_DEPARTMENTS_HREF} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-1 h-3 w-3" />
                        จัดการแผนก / แผนกย่อย
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 border-dashed border-slate-300 bg-white text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50"
                      onClick={() => setShowMasterCreate((v) => !v)}
                    >
                      {showMasterCreate ? (
                        "ปิดฟอร์มสร้างรหัส"
                      ) : (
                        <>
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          สร้างรหัสใหม่
                        </>
                      )}
                    </Button>
                  </div>

                  {showMasterCreate && (
                    <div className="mb-3 rounded-md border border-white bg-white p-2.5">
                      <p className="mb-2 text-[11px] text-slate-600">สร้างใน master (รหัสไม่ซ้ำทั้งระบบ)</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <Label className="text-[11px]">รหัส *</Label>
                          <Input
                            value={masterCreateCode}
                            onChange={(e) => setMasterCreateCode(e.target.value)}
                            placeholder="เช่น emergency-opd"
                            className="mt-0.5 h-9 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px]">ชื่อ</Label>
                          <Input
                            value={masterCreateName}
                            onChange={(e) => setMasterCreateName(e.target.value)}
                            className="mt-0.5 h-9 text-xs"
                            placeholder="ไม่บังคับ"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 text-xs"
                            variant="secondary"
                            onClick={() => void submitCreateMaster()}
                            disabled={savingMaster || !masterCreateCode.trim()}
                          >
                            {savingMaster ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "บันทึกรหัส"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {deptSubs.length === 0 && (
                    <p className="mb-2 rounded border border-amber-200/80 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-950">
                      ยังไม่มีรหัสของแผนกนี้ — กด &quot;สร้างรหัสใหม่&quot; หรือไปหน้าจัดการแผนก
                    </p>
                  )}

                  {addOptions.length === 0 && deptSubs.length > 0 ? (
                    <p className="text-xs text-slate-600">รหัสของแผนกนี้ผูกกับตู้นี้ครบแล้ว — ลบรายการด้านล่างถ้าต้องการเปลี่ยน</p>
                  ) : addOptions.length > 0 ? (
                    <div className="space-y-2">
                      <div className="w-full min-w-0">
                        <Label className="text-xs">แผนกย่อย</Label>
                        <Select value={addSubId} onValueChange={setAddSubId}>
                          <SelectTrigger className="mt-1 h-10 w-full max-w-full justify-between text-left text-sm whitespace-normal [&_[data-slot=select-value]]:line-clamp-2 [&_[data-slot=select-value]]:text-left [&_[data-slot=select-value]]:whitespace-normal">
                            <SelectValue placeholder="เลือกรหัส" />
                          </SelectTrigger>
                          <SelectContent className="max-w-[min(100vw-2rem,var(--radix-select-trigger-width))]">
                            {addOptions.map((s) => (
                              <SelectItem key={s.id} value={String(s.id)}>
                                <span className="font-mono text-xs">{s.code}</span>
                                {s.name ? <span className="text-muted-foreground"> · {s.name}</span> : null}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {!addSubId ? (
                        <p className="text-[11px] text-slate-500">เลือกแผนกย่อยก่อน จึงจะแสดงตัวเลือกเพิ่มเติมและปุ่มผูก</p>
                      ) : (
                        <>
                          <details className="rounded border border-slate-200/80 bg-white text-xs">
                            <summary className="cursor-pointer select-none px-2.5 py-2 text-slate-700">
                              ตัวเลือกเพิ่มเติม <span className="font-normal text-slate-400">(ไม่บังคับ)</span>
                            </summary>
                            <div className="grid gap-2 border-t border-slate-100 px-2.5 py-2 sm:grid-cols-2">
                              <div className="min-w-0">
                                <Label className="text-[11px]">สถานะ</Label>
                                <Select value={addStatus} onValueChange={setAddStatus}>
                                  <SelectTrigger className="mt-0.5 h-8 w-full max-w-full text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="ACTIVE">ใช้งาน</SelectItem>
                                    <SelectItem value="INACTIVE">ไม่ใช้งาน</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="min-w-0">
                                <Label className="text-[11px]">ลำดับ</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={addSort}
                                  onChange={(e) => setAddSort(e.target.value)}
                                  className="mt-0.5 h-8 w-full text-xs"
                                />
                              </div>
                              <div className="sm:col-span-2 min-w-0">
                                <Label className="text-[11px]">หมายเหตุ</Label>
                                <Input
                                  value={addDesc}
                                  onChange={(e) => setAddDesc(e.target.value)}
                                  className="mt-0.5 h-8 w-full text-xs"
                                  placeholder="—"
                                />
                              </div>
                            </div>
                          </details>

                          <Button
                            type="button"
                            className="h-10 w-full gap-2 text-sm"
                            onClick={() => void submitAdd()}
                            disabled={saving || !addSubId}
                          >
                            {saving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <PlusCircle className="h-4 w-4" />
                                ผูกกับตู้
                              </>
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  ) : null}
                </section>

                <Separator />

                <section>
                  <h3 className="mb-2 text-sm font-semibold text-slate-800">
                    รายการที่ผูกแล้ว{" "}
                    <span className="font-normal text-slate-500">({links.length})</span>
                  </h3>
                  <div className="rounded-lg border border-slate-200">
                    <Table className="w-full table-fixed text-sm">
                      <colgroup>
                        <col style={{ width: "24%" }} />
                        <col style={{ width: "26%" }} />
                        <col style={{ width: "14%" }} />
                        <col style={{ width: "9%" }} />
                        <col style={{ width: "17%" }} />
                        <col style={{ width: "10%" }} />
                      </colgroup>
                      <TableHeader>
                        <TableRow className="border-b border-slate-200 bg-slate-50 hover:bg-slate-50">
                          <TableHead className="h-9 px-2 py-2 text-left text-sm font-medium text-slate-700">
                            รหัส
                          </TableHead>
                          <TableHead className="h-9 px-2 py-2 text-left text-sm font-medium text-slate-700">
                            ชื่อ
                          </TableHead>
                          <TableHead className="h-9 px-2 py-2 text-left text-sm font-medium text-slate-700">
                            สถานะ
                          </TableHead>
                          <TableHead className="h-9 px-1 py-2 text-center text-sm font-medium text-slate-700">
                            ลำดับ
                          </TableHead>
                          <TableHead className="h-9 px-2 py-2 text-left text-sm font-medium text-slate-700">
                            หมายเหตุ
                          </TableHead>
                          <TableHead className="h-9 px-1 py-2 text-right text-sm font-medium text-slate-700">
                            จัดการ
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {links.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="px-3 py-8 text-center text-sm text-slate-500">
                              ยังไม่มีรายการ
                            </TableCell>
                          </TableRow>
                        ) : (
                          links.map((row) =>
                            editingId === row.id ? (
                              <TableRow key={row.id} className="border-b border-slate-200 bg-slate-50/60">
                                <TableCell colSpan={6} className="p-0 align-top">
                                  <div className="border-l-4 border-primary/60 px-3 py-3 sm:px-4 sm:py-4">
                                    <p className="mb-3 text-sm leading-snug text-slate-800 sm:text-base">
                                      <span className="font-mono font-semibold text-slate-900">
                                        {row.subDepartment?.code ?? "—"}
                                      </span>
                                      {row.subDepartment?.name ? (
                                        <span className="text-slate-600"> · {row.subDepartment.name}</span>
                                      ) : null}
                                    </p>
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
                                      <div className="min-w-0 sm:col-span-1 lg:col-span-4">
                                        <Label className="text-sm text-slate-700">สถานะ</Label>
                                        <Select value={editStatus} onValueChange={setEditStatus}>
                                          <SelectTrigger className="mt-1.5 h-10 w-full text-sm">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="ACTIVE">ใช้งาน</SelectItem>
                                            <SelectItem value="INACTIVE">ไม่ใช้งาน</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="min-w-0 sm:col-span-1 lg:col-span-3">
                                        <Label className="text-sm text-slate-700">ลำดับ</Label>
                                        <Input
                                          className="mt-1.5 h-10 w-full text-center text-sm tabular-nums"
                                          type="number"
                                          min={0}
                                          value={editSort}
                                          onChange={(e) => setEditSort(e.target.value)}
                                        />
                                      </div>
                                      <div className="min-w-0 sm:col-span-2 lg:col-span-5">
                                        <Label className="text-sm text-slate-700">หมายเหตุ</Label>
                                        <Input
                                          className="mt-1.5 h-10 w-full text-sm"
                                          value={editDesc}
                                          onChange={(e) => setEditDesc(e.target.value)}
                                          placeholder="—"
                                        />
                                      </div>
                                    </div>
                                    <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                                      <Button
                                        type="button"
                                        className="h-9 min-w-[5.5rem] text-sm"
                                        disabled={saving}
                                        onClick={() => void submitEdit(row)}
                                      >
                                        บันทึก
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="h-9 min-w-[5.5rem] text-sm"
                                        disabled={saving}
                                        onClick={cancelEdit}
                                      >
                                        ยกเลิก
                                      </Button>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : (
                              <TableRow key={row.id} className="border-b border-slate-100">
                                <TableCell className="px-2 py-2.5 align-top font-mono text-sm leading-snug break-words text-slate-900">
                                  {row.subDepartment?.code ?? "—"}
                                </TableCell>
                                <TableCell className="px-2 py-2.5 align-top text-sm leading-snug break-words text-slate-800">
                                  {row.subDepartment?.name ?? "—"}
                                </TableCell>
                                <TableCell className="px-2 py-2.5 align-top text-sm whitespace-nowrap text-slate-800">
                                  {row.status === "ACTIVE" ? "ใช้งาน" : row.status}
                                </TableCell>
                                <TableCell className="px-1 py-2.5 text-center align-top text-sm tabular-nums text-slate-700">
                                  {row.sort_order ?? 0}
                                </TableCell>
                                <TableCell className="px-2 py-2.5 align-top text-sm leading-snug break-words text-slate-600">
                                  {row.description?.trim() ? row.description : "—"}
                                </TableCell>
                                <TableCell className="px-1 py-2.5 align-middle">
                                  <div className="flex flex-row flex-nowrap items-center justify-end gap-1">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-8 w-8 shrink-0 p-0"
                                      onClick={() => startEdit(row)}
                                      disabled={saving || editingId !== null}
                                      title="แก้ไข"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="destructive"
                                      className="h-8 w-8 shrink-0 p-0"
                                      onClick={() => confirmDelete(row)}
                                      disabled={saving || editingId !== null}
                                      title="ลบ"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ),
                          )
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </section>
              </div>
            </div>
          )}

          <DialogFooter className="shrink-0 border-t border-slate-200 px-4 py-2.5 sm:px-5">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving || savingMaster}>
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบการผูกนี้?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `เอา ${deleteTarget.subDepartment?.code ?? ""} ออกจากตู้นี้ (ไม่ลบรหัสใน master)`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={() => void doDelete()} disabled={deletingId !== null}>
              {deletingId !== null ? (
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
