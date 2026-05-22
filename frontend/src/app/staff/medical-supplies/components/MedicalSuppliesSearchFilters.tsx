"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, RefreshCw, Filter, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerBE } from "@/components/ui/date-picker-be";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  clampDepartmentIdString,
  fetchStaffDepartmentsForFilter,
  getStaffAllowedDepartmentIds,
} from "@/lib/staffDepartmentScope";
import { staffMedicalSupplySubDepartmentsApi } from "@/lib/staffApi/medicalSupplySubDepartmentsApi";

export type DepartmentOption = { ID: number; DepName?: string | null; DepName2?: string | null };

export type SubDepartmentOption = {
  id: number;
  department_id: number;
  code: string;
  name: string | null;
  status?: boolean;
};

/** ฟิลด์ที่ฟอร์มค้นหานี้แก้ไขได้ */
export type MedicalSuppliesSearchFilterFields = {
  startDate: string;
  endDate: string;
  itemName: string;
  departmentCode: string;
  usageType: string;
  patientName: string;
  patientHN: string;
  patientEN: string;
};

interface MedicalSuppliesSearchFiltersProps {
  formFilters: MedicalSuppliesSearchFilterFields;
  onPatchFormFilters: (patch: Partial<MedicalSuppliesSearchFilterFields>) => void;
  loading: boolean;
  onSearch: () => void;
  onReset: () => void;
  onReload: () => void;
  departmentDisabled?: boolean;
}

function buildRoleScopeDivisionSummary(depts: DepartmentOption[]): string {
  const names = depts.map((d) => (d.DepName || "").trim()).filter(Boolean);
  if (names.length === 0) return "";
  if (names.length <= 5) return names.join(", ");
  return `${names.slice(0, 5).join(", ")} … (+${names.length - 5})`;
}

export default function MedicalSuppliesSearchFilters({
  formFilters,
  onPatchFormFilters,
  loading,
  onSearch,
  onReset,
  onReload,
  departmentDisabled,
}: MedicalSuppliesSearchFiltersProps) {
  const patch = onPatchFormFilters;

  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [subDepartmentsMaster, setSubDepartmentsMaster] = useState<SubDepartmentOption[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const allowedDepartmentIdsRef = useRef<number[] | null | undefined>(undefined);
  const [canPickAllRoleDepartments, setCanPickAllRoleDepartments] = useState(false);

  const [departmentSearch, setDepartmentSearch] = useState("");
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);
  const [subDepartmentSearch, setSubDepartmentSearch] = useState("");
  const [subDepartmentDropdownOpen, setSubDepartmentDropdownOpen] = useState(false);

  const roleScopeDivisionSummary = useMemo(
    () => (canPickAllRoleDepartments ? buildRoleScopeDivisionSummary(departments) : ""),
    [canPickAllRoleDepartments, departments],
  );

  const hasMainDepartment = Boolean(formFilters.departmentCode?.trim());

  const filteredDepartments = useMemo(() => {
    const q = departmentSearch.trim().toLowerCase();
    return departments.filter((d) => {
      if (!q) return true;
      const n1 = (d.DepName || "").toLowerCase();
      const n2 = (d.DepName2 || "").toLowerCase();
      return n1.includes(q) || n2.includes(q);
    });
  }, [departments, departmentSearch]);

  const filteredSubDepartments = useMemo(() => {
    const deptId = formFilters.departmentCode?.trim();
    const q = subDepartmentSearch.trim().toLowerCase();
    return subDepartmentsMaster.filter((s) => {
      if (s.status === false) return false;
      if (deptId && String(s.department_id) !== deptId) return false;
      if (!q) return true;
      const code = (s.code || "").toLowerCase();
      const name = (s.name || "").toLowerCase();
      return code.includes(q) || name.includes(q);
    });
  }, [subDepartmentsMaster, formFilters.departmentCode, subDepartmentSearch]);

  const divisionTriggerLabel = () => {
    if (!formFilters.departmentCode?.trim()) {
      if (canPickAllRoleDepartments) {
        return roleScopeDivisionSummary
          ? `ทั้งหมด · ${roleScopeDivisionSummary}`
          : "ทั้งหมด (ตาม role)";
      }
      return "เลือก Division (บังคับ)";
    }
    const d = departments.find((x) => String(x.ID) === formFilters.departmentCode);
    return d?.DepName || d?.DepName2 || `Division ${formFilters.departmentCode}`;
  };

  const subDepartmentTriggerLabel = () => {
    const code = formFilters.usageType?.trim();
    if (!code) return "เลือกแผนก ...";
    const sub = subDepartmentsMaster.find((s) => s.code === code);
    if (sub) {
      const n = sub.name?.trim();
      return n ? `${sub.code} · ${n}` : sub.code;
    }
    return code;
  };

  const loadDepartments = useCallback(async (keyword?: string) => {
    try {
      setLoadingDepartments(true);
      /** ref ยังเป็น undefined ได้ถ้า user เปิดค้นหา Division ก่อน effect แรกเสร็จ — โหลด scope ก่อน */
      let allowed = allowedDepartmentIdsRef.current;
      if (allowed === undefined) {
        allowed = await getStaffAllowedDepartmentIds();
        allowedDepartmentIdsRef.current = allowed;
      }
      setCanPickAllRoleDepartments(Array.isArray(allowed) && allowed.length > 0);
      const list = await fetchStaffDepartmentsForFilter({
        keyword,
        page: 1,
        limit: 200,
        allowedDepartmentIds: allowed,
      });
      setDepartments(list as DepartmentOption[]);
    } catch (error) {
      console.error("Failed to load departments:", error);
    } finally {
      setLoadingDepartments(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const allowed = await getStaffAllowedDepartmentIds();
      if (cancelled) return;
      allowedDepartmentIdsRef.current = allowed;
      setCanPickAllRoleDepartments(Array.isArray(allowed) && allowed.length > 0);
      await loadDepartments();
      if (cancelled || departmentDisabled) return;
      const nextDept = clampDepartmentIdString(formFilters.departmentCode, allowed, "");
      if (nextDept !== formFilters.departmentCode) {
        patch({ departmentCode: nextDept, usageType: "" });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- โหลด scope ครั้งแรก + clamp
  }, [departmentDisabled, loadDepartments]);

  useEffect(() => {
    (async () => {
      try {
        const res = await staffMedicalSupplySubDepartmentsApi.getAll();
        if (res?.success && Array.isArray(res.data)) {
          setSubDepartmentsMaster(res.data as SubDepartmentOption[]);
        }
      } catch {
        setSubDepartmentsMaster([]);
      }
    })();
  }, []);

  const handleSearchClick = () => {
    if (!departmentDisabled) {
      const allowed = allowedDepartmentIdsRef.current;
      const roleScopeAll =
        Array.isArray(allowed) && allowed.length > 0 && !formFilters.departmentCode?.trim();
      if (!formFilters.departmentCode?.trim() && !roleScopeAll) {
        toast.error("กรุณาเลือก Division ก่อนค้นหา (หรือเลือกทั้งหมดเฉพาะเมื่อ role จำกัดแผนก)");
        return;
      }
    }
    onSearch();
  };

  return (
    <Card className="mb-6 border-slate-200/80 shadow-sm rounded-xl w-full min-w-0">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <CardTitle className="text-base sm:text-lg">วันที่เบิกอุปกรณ์ใช้กับคนไข้</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="space-y-2 min-w-0">
            <Label htmlFor="startDate">วันที่เริ่มต้น</Label>
            <DatePickerBE
              id="startDate"
              value={formFilters.startDate}
              onChange={(v) => patch({ startDate: v })}
              placeholder="วว/ดด/ปปปป (พ.ศ.)"
            />
          </div>
          <div className="space-y-2 min-w-0">
            <Label htmlFor="endDate">วันที่สิ้นสุด</Label>
            <DatePickerBE
              id="endDate"
              value={formFilters.endDate}
              onChange={(v) => patch({ endDate: v })}
              placeholder="วว/ดด/ปปปป (พ.ศ.)"
            />
          </div>
        </div>

        <div className="space-y-2 min-w-0">
          <Label htmlFor="itemName">ค้นหาชื่ออุปกรณ์</Label>
          <Input
            id="itemName"
            placeholder="กรอกชื่ออุปกรณ์ / รหัส / คำอธิบาย..."
            value={formFilters.itemName}
            onChange={(e) => patch({ itemName: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleSearchClick()}
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-2">
          <div className="min-w-0 space-y-2">
            <Label>Division</Label>
            <DropdownMenu open={departmentDropdownOpen} onOpenChange={setDepartmentDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 w-full justify-between font-normal"
                  type="button"
                  disabled={departmentDisabled || loadingDepartments}
                >
                  <span className="truncate text-left">{divisionTriggerLabel()}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[12rem] p-1"
              >
                <div className="px-2 pb-2">
                  <Input
                    placeholder="ค้นหา Division..."
                    value={departmentSearch}
                    onChange={(e) => {
                      setDepartmentSearch(e.target.value);
                      void loadDepartments(e.target.value);
                    }}
                    className="h-8"
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="max-h-60 overflow-auto">
                  {canPickAllRoleDepartments ? (
                    <button
                      type="button"
                      className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                      onClick={() => {
                        if (departmentDisabled) return;
                        patch({ departmentCode: "", usageType: "" });
                        setDepartmentDropdownOpen(false);
                        setDepartmentSearch("");
                      }}
                    >
                      -- ทุก Division --
                      {roleScopeDivisionSummary ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground truncate">
                          {roleScopeDivisionSummary}
                        </span>
                      ) : null}
                    </button>
                  ) : null}
                  {loadingDepartments ? (
                    <div className="px-2 py-3 text-center text-xs text-muted-foreground">กำลังโหลด...</div>
                  ) : filteredDepartments.length === 0 ? (
                    <div className="px-2 py-3 text-center text-xs text-muted-foreground">ไม่พบรายการ</div>
                  ) : (
                    filteredDepartments.map((dept) => (
                      <button
                        key={dept.ID}
                        type="button"
                        className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                        onClick={() => {
                          if (departmentDisabled) return;
                          patch({ departmentCode: String(dept.ID), usageType: "" });
                          setDepartmentDropdownOpen(false);
                          setDepartmentSearch("");
                        }}
                      >
                        {dept.DepName || dept.DepName2 || `แผนก ${dept.ID}`}
                      </button>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="min-w-0 space-y-2">
            <Label>แผนก</Label>
            <DropdownMenu open={subDepartmentDropdownOpen} onOpenChange={setSubDepartmentDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 w-full justify-between font-normal"
                  type="button"
                  disabled={!hasMainDepartment || !!departmentDisabled}
                >
                  <span className="truncate text-left">{subDepartmentTriggerLabel()}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[12rem] p-1"
              >
                <div className="px-2 pb-2">
                  <Input
                    placeholder="ค้นหารหัสหรือชื่อแผนก ..."
                    value={subDepartmentSearch}
                    onChange={(e) => setSubDepartmentSearch(e.target.value)}
                    className="h-8"
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="max-h-60 overflow-auto">
                  <button
                    type="button"
                    className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      patch({ usageType: "" });
                      setSubDepartmentDropdownOpen(false);
                      setSubDepartmentSearch("");
                    }}
                  >
                    -- ทุกแผนก --
                  </button>
                  {!hasMainDepartment ? (
                    <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                      เลือกแผนก (Division) ก่อน
                    </div>
                  ) : filteredSubDepartments.length === 0 ? (
                    <div className="px-2 py-3 text-center text-xs text-muted-foreground">ไม่พบรายการ</div>
                  ) : (
                    filteredSubDepartments.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                        onClick={() => {
                          patch({ usageType: sub.code });
                          setSubDepartmentDropdownOpen(false);
                          setSubDepartmentSearch("");
                        }}
                      >
                        <span className="font-mono text-xs">{sub.code}</span>
                        {sub.name ? (
                          <span className="text-muted-foreground"> · {sub.name}</span>
                        ) : null}
                      </button>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-2 min-w-0">
            <Label htmlFor="patientHN">HN</Label>
            <Input
              id="patientHN"
              placeholder="กรอกเลข HN..."
              value={formFilters.patientHN}
              onChange={(e) => patch({ patientHN: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleSearchClick()}
            />
          </div>
          <div className="space-y-2 min-w-0">
            <Label htmlFor="patientEN">EN</Label>
            <Input
              id="patientEN"
              placeholder="กรอกเลข EN..."
              value={formFilters.patientEN}
              onChange={(e) => patch({ patientEN: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleSearchClick()}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <Button onClick={handleSearchClick} disabled={loading} className="w-full sm:flex-1">
            <Search className="h-4 w-4 mr-2 shrink-0" />
            ค้นหา
          </Button>
          <Button onClick={onReset} variant="outline" disabled={loading} className="w-full sm:flex-1">
            <RefreshCw className="h-4 w-4 mr-2 shrink-0" />
            รีเซ็ต
          </Button>
          <Button onClick={onReload} variant="outline" disabled={loading} className="w-full sm:flex-1">
            <RefreshCw className={`h-4 w-4 mr-2 shrink-0 ${loading ? "animate-spin" : ""}`} />
            โหลดใหม่
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
