"use client";

import { useState, useEffect, useRef } from "react";
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

  useEffect(() => {
    if (open) {
      void loadInitialData();
    }
  }, [open]);

  const loadInitialData = async () => {
    await Promise.all([loadCabinets(""), loadDepartments("")]);
  };

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
