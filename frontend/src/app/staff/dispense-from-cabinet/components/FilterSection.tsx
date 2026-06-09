"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Search, RefreshCw, Filter } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerBE } from "@/components/ui/date-picker-be";
import type { FilterState } from "../types";
import SearchableSelect from "@/app/admin/items/components/SearchableSelect";
import {
  clampDepartmentIdString,
  fetchStaffDepartmentsForFilter,
  getStaffAllowedDepartmentIds,
} from "@/lib/staffDepartmentScope";
import { staffCabinetDepartmentApi } from "@/lib/staffApi/cabinetApi";
import { staffMedicalSupplySubDepartmentsApi } from "@/lib/staffApi/medicalSupplySubDepartmentsApi";
import { cn } from "@/lib/utils";

const fieldInputClass = "bg-white";

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
  cabinetDepartments?: Array<{
    id: number;
    department_id: number;
    status: string;
  }>;
}

interface CabinetDepartmentMapping {
  id: number;
  cabinet_id: number;
  department_id: number;
  status?: string;
  cabinet?: {
    id: number;
    cabinet_name?: string;
    cabinet_code?: string;
    cabinet_status?: string;
  };
}

interface SubDepartmentRow {
  id: number;
  department_id: number;
  code: string;
  name: string | null;
  status: boolean;
}

function mapCabinetFromMapping(cabinet: CabinetDepartmentMapping["cabinet"]): Cabinet | null {
  if (!cabinet || typeof cabinet.id !== "number") return null;
  return {
    id: cabinet.id,
    cabinet_name: cabinet.cabinet_name,
    cabinet_code: cabinet.cabinet_code,
    cabinet_status: cabinet.cabinet_status,
  };
}

function buildRoleScopeDivisionSummary(depts: Department[]): string {
  const names = depts.map((d) => (d.DepName || "").trim()).filter(Boolean);
  if (names.length === 0) return "";
  if (names.length <= 5) return names.join(", ");
  return `${names.slice(0, 5).join(", ")} … (+${names.length - 5})`;
}

interface FilterSectionProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  onSearch: () => void;
  onClear: () => void;
  onRefresh: () => void;
  loading: boolean;
  departmentDisabled?: boolean;
}

export default function FilterSection({
  filters,
  onFilterChange,
  onSearch,
  onClear,
  onRefresh,
  loading,
  departmentDisabled,
}: FilterSectionProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartmentsMaster, setSubDepartmentsMaster] = useState<SubDepartmentRow[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingCabinets, setLoadingCabinets] = useState(false);
  const allowedDepartmentIdsRef = useRef<number[] | null | undefined>(undefined);
  const [canPickAllRoleDepartments, setCanPickAllRoleDepartments] = useState(false);

  const subDepartmentOptions = useMemo(() => {
    const deptId = filters.departmentId?.trim();
    if (!deptId) {
      return [{ value: "", label: "ทั้งหมด" }];
    }
    const rows = subDepartmentsMaster.filter(
      (s) => s.status !== false && String(s.department_id) === deptId,
    );
    return [
      { value: "", label: "ทั้งหมด" },
      ...rows.map((s) => ({
        value: String(s.id),
        label: s.code,
        subLabel: s.name?.trim() || "",
      })),
    ];
  }, [subDepartmentsMaster, filters.departmentId]);

  const roleScopeDivisionSummary = useMemo(
    () => (canPickAllRoleDepartments ? buildRoleScopeDivisionSummary(departments) : ""),
    [canPickAllRoleDepartments, departments],
  );

  const divisionSelectOptions = useMemo(
    () => [
      ...(canPickAllRoleDepartments
        ? [
            {
              value: "",
              label: "ทั้งหมด",
              ...(roleScopeDivisionSummary ? { subLabel: roleScopeDivisionSummary } : {}),
            },
          ]
        : []),
      ...departments.map((dept) => ({
        value: dept.ID.toString(),
        label: dept.DepName || "",
        subLabel: dept.DepName2 || "",
      })),
    ],
    [canPickAllRoleDepartments, departments, roleScopeDivisionSummary],
  );

  const loadDepartments = async (keyword?: string) => {
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
      setDepartments(list as Department[]);
    } catch (error) {
      console.error("Failed to load departments:", error);
    } finally {
      setLoadingDepartments(false);
    }
  };

  const resolveCabinets = useCallback(async (departmentIdStr: string, keyword?: string) => {
    try {
      setLoadingCabinets(true);
      let next: Cabinet[] = [];
      const trimmed = departmentIdStr?.trim() ?? "";
      if (!trimmed) {
        const allowed = allowedDepartmentIdsRef.current;
        if (Array.isArray(allowed) && allowed.length > 0) {
          const results = await Promise.all(
            allowed.map((deptId) =>
              staffCabinetDepartmentApi.getAll({
                departmentId: deptId,
                keyword: keyword || undefined,
              }),
            ),
          );
          const uniqueCabinets = new Map<number, Cabinet>();
          for (const response of results) {
            if (response.success && response.data) {
              const mappings = response.data as CabinetDepartmentMapping[];
              mappings
                .filter((mapping) => mapping.status === "ACTIVE")
                .forEach((mapping) => {
                  const mapped = mapCabinetFromMapping(mapping.cabinet);
                  if (mapped && !uniqueCabinets.has(mapped.id)) {
                    uniqueCabinets.set(mapped.id, mapped);
                  }
                });
            }
          }
          next = Array.from(uniqueCabinets.values());
        }
        setCabinets(next);
        return;
      }
      const deptId = parseInt(trimmed, 10);
      if (Number.isNaN(deptId)) {
        setCabinets([]);
        return;
      }
      const response = await staffCabinetDepartmentApi.getAll({
        departmentId: deptId,
        keyword: keyword || undefined,
      });
      if (response.success && response.data) {
        const mappings = response.data as CabinetDepartmentMapping[];
        const uniqueCabinets = new Map<number, Cabinet>();
        mappings
          .filter((mapping) => mapping.status === "ACTIVE")
          .forEach((mapping) => {
            const mapped = mapCabinetFromMapping(mapping.cabinet);
            if (mapped && !uniqueCabinets.has(mapped.id)) {
              uniqueCabinets.set(mapped.id, mapped);
            }
          });
        next = Array.from(uniqueCabinets.values());
      }
      setCabinets(next);
    } catch (error) {
      console.error("Failed to load cabinets:", error);
      setCabinets([]);
    } finally {
      setLoadingCabinets(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const allowed = await getStaffAllowedDepartmentIds();
      if (cancelled) return;
      allowedDepartmentIdsRef.current = allowed;
      setCanPickAllRoleDepartments(Array.isArray(allowed) && allowed.length > 0);
      try {
        setLoadingDepartments(true);
        const list = await fetchStaffDepartmentsForFilter({
          page: 1,
          limit: 200,
          allowedDepartmentIds: allowed,
        });
        if (cancelled) return;
        setDepartments(list as Department[]);
      } catch (error) {
        console.error("Failed to load departments:", error);
      } finally {
        if (!cancelled) setLoadingDepartments(false);
      }
      if (cancelled || departmentDisabled) return;
      const nextDept = clampDepartmentIdString(filters.departmentId, allowed, "");
      if (nextDept !== filters.departmentId) {
        onFilterChange("departmentId", nextDept);
        onFilterChange("cabinetId", "");
        onFilterChange("subDepartmentId", "");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- โหลด scope ครั้งแรก + clamp ค่าเริ่มต้น
  }, [departmentDisabled]);

  useEffect(() => {
    (async () => {
      try {
        const res = await staffMedicalSupplySubDepartmentsApi.getAll();
        if (res.success && Array.isArray(res.data)) {
          setSubDepartmentsMaster(
            res.data.map((s) => ({
              id: s.id,
              department_id: s.department_id,
              code: s.code,
              name: s.name ?? null,
              status: s.status,
            })),
          );
        }
      } catch {
        setSubDepartmentsMaster([]);
      }
    })();
  }, []);

  useEffect(() => {
    void resolveCabinets(filters.departmentId);
  }, [filters.departmentId, resolveCabinets]);

  useEffect(() => {
    if (filters.cabinetId && cabinets.length > 0) {
      const exists = cabinets.some((c) => c.id.toString() === filters.cabinetId);
      if (!exists) onFilterChange("cabinetId", "");
    }
  }, [cabinets, filters.cabinetId, onFilterChange]);

  const handleSearchClick = () => {
    if (!departmentDisabled) {
      const allowed = allowedDepartmentIdsRef.current;
      const roleScopeAll =
        Array.isArray(allowed) && allowed.length > 0 && !filters.departmentId?.trim();
      if (!filters.departmentId?.trim() && !roleScopeAll) {
        toast.error("กรุณาเลือก Division ก่อนค้นหา (หรือเลือกทั้งหมดเฉพาะเมื่อ role จำกัดแผนก)");
        return;
      }
    }
    onSearch();
  };

  return (
    <Card className="mb-6 border-slate-200/80 shadow-sm rounded-xl">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <CardTitle>กรองข้อมูล</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">รหัส/ชื่อเวชภัณฑ์</label>
            <Input
              placeholder="ค้นหา..."
              value={filters.searchItemCode}
              onChange={(e) => onFilterChange("searchItemCode", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchClick()}
              className={cn("w-full", fieldInputClass)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">วันที่เริ่มต้น</label>
              <DatePickerBE
                value={filters.startDate}
                onChange={(v) => onFilterChange("startDate", v)}
                placeholder="วว/ดด/ปปปป (พ.ศ.)"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">วันที่สิ้นสุด</label>
              <DatePickerBE
                value={filters.endDate}
                onChange={(v) => onFilterChange("endDate", v)}
                placeholder="วว/ดด/ปปปป (พ.ศ.)"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
            <SearchableSelect
              label="Division"
              placeholder={
                canPickAllRoleDepartments
                  ? "เลือก Division หรือทั้งหมด (ตาม role)"
                  : "เลือก Division (บังคับ)"
              }
              required={!canPickAllRoleDepartments}
              value={filters.departmentId}
              initialDisplay={
                canPickAllRoleDepartments && !filters.departmentId?.trim()
                  ? {
                      label: "ทั้งหมด (ทุกแผนกที่ role อนุญาต)",
                      ...(roleScopeDivisionSummary ? { subLabel: roleScopeDivisionSummary } : {}),
                    }
                  : undefined
              }
              onValueChange={(value) => {
                if (departmentDisabled) return;
                onFilterChange("departmentId", value);
                onFilterChange("subDepartmentId", "");
                onFilterChange("cabinetId", "");
              }}
              options={divisionSelectOptions}
              loading={loadingDepartments}
              onSearch={loadDepartments}
              searchPlaceholder="ค้นหาชื่อ Division..."
              disabled={departmentDisabled}
            />

            <SearchableSelect
              label="ตู้ Cabinet"
              placeholder={
                filters.departmentId
                  ? "เลือกตู้"
                  : canPickAllRoleDepartments
                    ? "เลือกตู้"
                    : "เลือก Division ก่อน"
              }
              value={filters.cabinetId}
              onValueChange={(value) => onFilterChange("cabinetId", value)}
              options={[
                ...cabinets.map((cabinet) => ({
                  value: cabinet.id.toString(),
                  label: cabinet.cabinet_name || "",
                  subLabel: cabinet.cabinet_code || "",
                })),
              ]}
              loading={loadingCabinets}
              onSearch={(searchKeyword) => {
                void resolveCabinets(filters.departmentId, searchKeyword);
              }}
              searchPlaceholder="ค้นหารหัสหรือชื่อตู้..."
              disabled={false}
            />
          </div>

          <div className="grid grid-cols-1 gap-2 mb-4">
            <SearchableSelect
              label="แผนก"
              placeholder={
                filters.departmentId?.trim()
                  ? "เลือกแผนก ..."
                  : "เลือก Division เฉพาะก่อน ถ้าต้องการกรองแผนกย่อย"
              }
              value={filters.subDepartmentId}
              onValueChange={(value) => onFilterChange("subDepartmentId", value)}
              options={subDepartmentOptions}
              disabled={!filters.departmentId?.trim() || departmentDisabled}
              searchPlaceholder="ค้นหารหัสหรือชื่อแผนก ..."
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button onClick={handleSearchClick} disabled={loading}>
            <Search className="h-4 w-4 mr-2" />
            ค้นหา
          </Button>
          <Button onClick={onClear} variant="outline">
            ล้าง
          </Button>
          <Button onClick={onRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            รีเฟรช
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
