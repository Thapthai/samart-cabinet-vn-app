"use client";

import { useState, useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import SearchableSelect from "./SearchableSelect";
import { cabinetApi, departmentApi } from "@/lib/api";

interface Department {
  ID: number;
  DepName?: string;
  DepName2?: string;
}

interface Cabinet {
  id: number;
  cabinet_name?: string;
  cabinet_code?: string;
  cabinet_status?: string;
}

/** จำนวนการผูก Division (ACTIVE) ต่อตู้ — ตรงกับ backend */
const MAX_ACTIVE_DIVISION_LINKS_PER_CABINET = 3;

function countActiveDivisionLinks(
  mappings: Array<{ cabinet_id: number; status: string }>,
  cabinetId: number,
): number {
  return mappings.filter((m) => m.cabinet_id === cabinetId && m.status === "ACTIVE").length;
}

/** Division ที่มีแถวผูกกับตู้นี้แล้ว (ทุกสถานะ — ตรงกับ backend ห้ามซ้ำคู่) */
function departmentIdsMappedForCabinet(
  mappings: Array<{ cabinet_id: number; department_id?: number | null }>,
  cabinetId: number,
): Set<number> {
  const set = new Set<number>();
  for (const m of mappings) {
    if (m.cabinet_id === cabinetId && m.department_id != null) {
      set.add(Number(m.department_id));
    }
  }
  return set;
}

export interface CreateMappingFormData {
  cabinet_id: string;
  /** แต่ละช่อง = Division หนึ่งรายการ (ว่างได้ถ้ามีอย่างน้อยหนึ่งช่องที่เลือก) */
  department_ids: string[];
  status: string;
  description: string;
}

interface CreateMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: CreateMappingFormData;
  setFormData: Dispatch<SetStateAction<CreateMappingFormData>>;
  onSubmit: () => void;
  saving: boolean;
  existingMappings: Array<{ cabinet_id: number; department_id?: number | null; status: string }>;
}

export default function CreateMappingDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  onSubmit,
  saving,
  existingMappings,
}: CreateMappingDialogProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCabinets, setLoadingCabinets] = useState(false);
  const dialogContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      void loadInitialData();
    }
  }, [open]);

  const loadInitialData = async () => {
    await Promise.all([loadCabinets(""), loadDepartments("")]);
  };

  useEffect(() => {
    if (!open || !formData.cabinet_id) return;
    const id = parseInt(formData.cabinet_id, 10);
    if (Number.isNaN(id)) return;
    if (countActiveDivisionLinks(existingMappings, id) >= MAX_ACTIVE_DIVISION_LINKS_PER_CABINET) {
      setFormData((prev) => ({ ...prev, cabinet_id: "", department_ids: [] }));
    }
  }, [open, existingMappings, formData.cabinet_id, setFormData]);

  const unmappedDepartments = useMemo(() => {
    const cabStr = formData.cabinet_id?.trim();
    if (!cabStr) return [];
    const cabinetId = parseInt(cabStr, 10);
    if (Number.isNaN(cabinetId)) return [];
    const already = departmentIdsMappedForCabinet(existingMappings, cabinetId);
    return departments.filter((d) => !already.has(d.ID));
  }, [formData.cabinet_id, departments, existingMappings]);

  /** จำนวนช่องเลือก Division ในครั้งเดียว = ช่อง ACTIVE ที่เหลือ × จำนวน Division ที่ยังไม่เคยผูก */
  const divisionSlotCount = useMemo(() => {
    const cabStr = formData.cabinet_id?.trim();
    if (!cabStr) return 0;
    const cabinetId = parseInt(cabStr, 10);
    if (Number.isNaN(cabinetId)) return 0;
    const remainingActive =
      MAX_ACTIVE_DIVISION_LINKS_PER_CABINET - countActiveDivisionLinks(existingMappings, cabinetId);
    if (remainingActive <= 0) return 0;
    const unmapped = unmappedDepartments.length;
    if (unmapped <= 0) return 0;
    return Math.min(remainingActive, unmapped);
  }, [formData.cabinet_id, existingMappings, unmappedDepartments.length]);

  useEffect(() => {
    if (!open) return;
    setFormData((prev) => {
      const nextLen = divisionSlotCount;
      const cur = prev.department_ids;
      if (cur.length === nextLen) return prev;
      const next = Array.from({ length: nextLen }, (_, i) => (i < cur.length ? (cur[i] ?? "") : ""));
      return { ...prev, department_ids: next };
    });
  }, [open, divisionSlotCount, setFormData]);

  useEffect(() => {
    if (!open || !formData.cabinet_id?.trim()) return;
    const cabId = parseInt(formData.cabinet_id, 10);
    if (Number.isNaN(cabId)) return;
    const mapped = departmentIdsMappedForCabinet(existingMappings, cabId);
    setFormData((prev) => {
      let changed = false;
      const next = prev.department_ids.map((idStr) => {
        if (!idStr?.trim()) return idStr;
        const d = parseInt(idStr.trim(), 10);
        if (Number.isNaN(d)) return idStr;
        if (mapped.has(d)) {
          changed = true;
          return "";
        }
        return idStr;
      });
      return changed ? { ...prev, department_ids: next } : prev;
    });
  }, [open, formData.cabinet_id, existingMappings, setFormData]);

  const loadDepartments = async (keyword?: string) => {
    try {
      setLoadingDepartments(true);
      const response = await departmentApi.getAll({ limit: 50, keyword });
      if (response.success && response.data) {
        setDepartments(response.data as Department[]);
      }
    } catch (error) {
      console.error("Failed to load departments:", error);
    } finally {
      setLoadingDepartments(false);
    }
  };

  const loadCabinets = async (keyword?: string) => {
    try {
      setLoadingCabinets(true);
      const response = await cabinetApi.getAll({ page: 1, limit: 50, keyword });
      if (response.success && response.data) {
        setCabinets(response.data as Cabinet[]);
      }
    } catch (error) {
      console.error("Failed to load cabinets:", error);
    } finally {
      setLoadingCabinets(false);
    }
  };

  const setDepartmentAtSlot = (slotIndex: number, value: string) => {
    setFormData((prev) => {
      const next = [...prev.department_ids];
      while (next.length <= slotIndex) next.push("");
      next[slotIndex] = value;
      return { ...prev, department_ids: next };
    });
  };

  const optionsForSlot = (slotIndex: number) => {
    const pickedElsewhere = new Set(
      formData.department_ids
        .map((id, idx) => (idx !== slotIndex && id?.trim() ? id.trim() : null))
        .filter((x): x is string => x != null),
    );
    return unmappedDepartments
      .filter((d) => !pickedElsewhere.has(String(d.ID)))
      .map((dept) => ({
        value: dept.ID.toString(),
        label: dept.DepName || "",
        subLabel: dept.DepName2 || "",
      }));
  };

  const selectedCount = formData.department_ids.filter((id) => id?.trim()).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>เพิ่มการเชื่อมโยงใหม่</DialogTitle>
          <DialogDescription>
            เลือกตู้ แล้วเลือก Division ได้สูงสุด {MAX_ACTIVE_DIVISION_LINKS_PER_CABINET} แผนกต่อตู้ (ACTIVE)
            — ในฟอร์มนี้เลือกได้หลายแผนกในครั้งเดียวตามจำนวนช่องว่างที่เหลือ
          </DialogDescription>
        </DialogHeader>
        <div ref={dialogContentRef} className="relative overflow-visible grid gap-4 py-4">
          <SearchableSelect
            portalTargetRef={dialogContentRef}
            label="ตู้ Cabinet"
            placeholder="เลือกตู้"
            value={formData.cabinet_id}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, cabinet_id: value, department_ids: [] }))
            }
            options={cabinets
              .filter(
                (cabinet) =>
                  countActiveDivisionLinks(existingMappings, cabinet.id) <
                  MAX_ACTIVE_DIVISION_LINKS_PER_CABINET,
              )
              .map((cabinet) => ({
                value: cabinet.id.toString(),
                label: cabinet.cabinet_name || "",
                subLabel: cabinet.cabinet_code || "",
              }))}
            loading={loadingCabinets}
            required
            onSearch={loadCabinets}
            searchPlaceholder="ค้นหารหัสหรือชื่อตู้..."
          />

          {!formData.cabinet_id?.trim() ? (
            <p className="text-sm text-muted-foreground">กรุณาเลือกตู้ก่อน จึงจะเลือก Division ได้</p>
          ) : divisionSlotCount === 0 ? (
            <p className="text-sm text-amber-700">
              ตู้นี้ผูก Division ครบแล้ว หรือไม่มี Division เหลือให้ผูก
            </p>
          ) : (
            Array.from({ length: divisionSlotCount }, (_, slotIndex) => (
              <SearchableSelect
                key={`dept-slot-${slotIndex}`}
                portalTargetRef={dialogContentRef}
                label={
                  divisionSlotCount > 1
                    ? `Division (${slotIndex + 1}/${divisionSlotCount})`
                    : "Division"
                }
                placeholder={
                  optionsForSlot(slotIndex).length === 0
                    ? "ไม่มี Division เหลือในช่องนี้"
                    : divisionSlotCount > 1
                      ? `เลือก Division ลำดับที่ ${slotIndex + 1} (ว่างได้)`
                      : "เลือก Division (ยังไม่เคยผูกกับตู้นี้)"
                }
                value={formData.department_ids[slotIndex] ?? ""}
                onValueChange={(value) => setDepartmentAtSlot(slotIndex, value)}
                options={optionsForSlot(slotIndex)}
                loading={loadingDepartments}
                required={divisionSlotCount === 1}
                onSearch={loadDepartments}
                searchPlaceholder="ค้นหาชื่อ Division..."
              />
            ))
          )}

          <div>
            <Label>สถานะ</Label>
            <Select
              value={formData.status || "ACTIVE"}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="เลือกสถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">ใช้งาน</SelectItem>
                <SelectItem value="INACTIVE">ไม่ใช้งาน</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>หมายเหตุ</Label>
            <Input
              placeholder="หมายเหตุ..."
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>

          {divisionSlotCount > 1 ? (
            <p className="text-xs text-muted-foreground">
              เลือก Division อย่างน้อย 1 ช่อง แล้วกดบันทึก — ระบบจะสร้างการเชื่อมโยงตามแต่ละช่องที่เลือก
              {selectedCount > 0 ? ` (เลือกแล้ว ${selectedCount} แผนก)` : ""}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            ยกเลิก
          </Button>
          <Button onClick={onSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              "บันทึก"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
