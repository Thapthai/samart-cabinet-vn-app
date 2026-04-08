"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import SearchableSelect from "./SearchableSelect";
import { fetchStaffDepartmentsForFilter, getStaffAllowedDepartmentIds } from "@/lib/staffDepartmentScope";
import { getStaffScopedCabinetList } from "@/lib/staffScopedCabinetList";

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

interface FormData {
  cabinet_id: string;
  department_id: string;
  status: string;
  description: string;
}

interface CreateMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: FormData;
  setFormData: (data: FormData) => void;
  onSubmit: () => void;
  saving: boolean;
}

export default function CreateMappingDialog({
  open,
  onOpenChange,
  formData,
  setFormData,
  onSubmit,
  saving,
}: CreateMappingDialogProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCabinets, setLoadingCabinets] = useState(false);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const allowedDepartmentIdsRef = useRef<number[] | null | undefined>(undefined);

  const loadDepartments = useCallback(async (keyword?: string) => {
    try {
      setLoadingDepartments(true);
      const list = await fetchStaffDepartmentsForFilter({
        keyword,
        page: 1,
        limit: 50,
        allowedDepartmentIds: allowedDepartmentIdsRef.current,
      });
      setDepartments(list as Department[]);
    } catch (error) {
      console.error("Failed to load departments:", error);
    } finally {
      setLoadingDepartments(false);
    }
  }, []);

  const loadCabinets = useCallback(async (keyword?: string) => {
    try {
      setLoadingCabinets(true);
      const list = await getStaffScopedCabinetList(allowedDepartmentIdsRef.current, {
        keyword,
        limit: 50,
      });
      setCabinets(list);
    } catch (error) {
      console.error("Failed to load cabinets:", error);
    } finally {
      setLoadingCabinets(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const allowed = await getStaffAllowedDepartmentIds();
      if (cancelled) return;
      allowedDepartmentIdsRef.current = allowed;
      await Promise.all([loadCabinets(""), loadDepartments("")]);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, loadCabinets, loadDepartments]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>เพิ่มการเชื่อมโยงใหม่</DialogTitle>
          <DialogDescription>เชื่อมโยงตู้ Cabinet กับแผนก</DialogDescription>
        </DialogHeader>
        <div ref={dialogContentRef} className="relative overflow-visible grid gap-4 py-4">
          <SearchableSelect
            portalTargetRef={dialogContentRef}
            label="ตู้ Cabinet"
            placeholder="เลือกตู้"
            value={formData.cabinet_id}
            onValueChange={(value) => setFormData({ ...formData, cabinet_id: value })}
            options={cabinets
              .filter((cabinet) => cabinet.cabinet_status !== "USED")
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

          <SearchableSelect
            portalTargetRef={dialogContentRef}
            label="Division"
            placeholder="เลือก Division"
            value={formData.department_id}
            onValueChange={(value) => setFormData({ ...formData, department_id: value })}
            options={departments.map((dept) => ({
              value: dept.ID.toString(),
              label: dept.DepName || "",
              subLabel: dept.DepName2 || "",
            }))}
            loading={loadingDepartments}
            required
            onSearch={loadDepartments}
            searchPlaceholder="ค้นหาชื่อ Division..."
          />

          <div>
            <Label>สถานะ</Label>
            <Select
              value={formData.status || "ACTIVE"}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="เลือกสถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                <SelectItem value="INACTIVE">INACTIVE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>หมายเหตุ</Label>
            <Input
              placeholder="หมายเหตุ..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
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
