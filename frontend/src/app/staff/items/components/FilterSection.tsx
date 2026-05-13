"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Search, RotateCcw, Filter } from "lucide-react";
import { toast } from "sonner";
import SearchableSelect from "./SearchableSelect";
import { staffCabinetDepartmentApi } from "@/lib/staffApi/cabinetApi";
import {
  clampDepartmentIdString,
  fetchStaffDepartmentsForFilter,
  getStaffAllowedDepartmentIds,
} from "@/lib/staffDepartmentScope";

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

export type StaffItemsSearchFilters = {
  searchTerm: string;
  departmentId: string;
  cabinetId: string;
  statusFilter: string;
  keyword: string;
};

interface FilterSectionProps {
  onSearch: (filters: StaffItemsSearchFilters) => void;
  onBeforeSearch?: () => void;
  /** รีเซ็ตฟอร์ม + เคลียร์รายการฝั่ง parent (เช่น hasSearched) — ไม่เรียก onSearch */
  onReset?: () => void;
  initialDepartmentId?: string;
  departmentDisabled?: boolean;
  /** โหลดแล้วเลือกตู้เริ่มต้นและค้นหาให้ (ค่าเริ่มต้น true) */
  initialAutoSearch?: boolean;
}

export default function FilterSection({
  onSearch,
  onBeforeSearch,
  onReset,
  initialDepartmentId,
  departmentDisabled,
  initialAutoSearch = true,
}: FilterSectionProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loadingCabinets, setLoadingCabinets] = useState(false);
  /** มีแถวใน app_staff_role_permission_departments สำหรับ role → ค่าเป็น number[]; ไม่มีแถว = unrestricted → null */
  const allowedDepartmentIdsRef = useRef<number[] | null | undefined>(undefined);
  const [canPickAllRoleDepartments, setCanPickAllRoleDepartments] = useState(false);
  const initialSearchDoneRef = useRef(false);

  const [formFilters, setFormFilters] = useState({
    searchTerm: "",
    departmentId: departmentDisabled ? (initialDepartmentId?.trim() || "") : "",
    cabinetId: "",
    statusFilter: "all",
  });

  useEffect(() => {
    if (!departmentDisabled) return;
    const d = initialDepartmentId?.trim() || "";
    setFormFilters((prev) => ({ ...prev, departmentId: d }));
  }, [initialDepartmentId, departmentDisabled]);

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
      if (cancelled) return;
      setFormFilters((prev) => {
        if (departmentDisabled) return prev;
        const nextDept = clampDepartmentIdString(prev.departmentId, allowed, "");
        if (nextDept === prev.departmentId) return prev;
        return {
          ...prev,
          departmentId: nextDept,
          cabinetId: "",
        };
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [departmentDisabled]);

  useEffect(() => {
    void resolveCabinets(formFilters.departmentId);
  }, [formFilters.departmentId, resolveCabinets]);

  useEffect(() => {
    if (formFilters.cabinetId && cabinets.length > 0) {
      const cabinetExists = cabinets.some((cabinet) => cabinet.id.toString() === formFilters.cabinetId);
      if (!cabinetExists) {
        setFormFilters((prev) => ({
          ...prev,
          cabinetId: "",
        }));
      }
    }
  }, [cabinets, formFilters.cabinetId]);

  useEffect(() => {
    if (!initialAutoSearch) return;
    if (initialSearchDoneRef.current) return;
    if (loadingDepartments) return;

    let departmentId = "";
    const cabinetId = "";

    if (departmentDisabled) {
      departmentId = (initialDepartmentId ?? "").trim();
    } else {
      const allowed = allowedDepartmentIdsRef.current;
      if (allowed === undefined) {
        return;
      }
      const roleScope = Array.isArray(allowed) && allowed.length > 0;
      if (roleScope) {
        /** ค่าเริ่มต้น = ทั้งหมด (WHERE department_id IN แผนกของ role) */
        departmentId = "";
      } else if (departments.length === 1) {
        departmentId = String(departments[0].ID);
      } else if (departments.length === 0) {
        initialSearchDoneRef.current = true;
        return;
      } else {
        /** unrestricted + หลายแผนกใน dropdown — ให้ user เลือก Division ก่อน */
        initialSearchDoneRef.current = true;
        return;
      }
    }

    initialSearchDoneRef.current = true;
    setFormFilters((prev) => ({
      ...prev,
      departmentId,
      cabinetId,
    }));
    onBeforeSearch?.();
    onSearch({
      searchTerm: "",
      departmentId,
      cabinetId,
      statusFilter: "all",
      keyword: "",
    });
  }, [
    initialAutoSearch,
    departmentDisabled,
    initialDepartmentId,
    loadingDepartments,
    departments,
    onSearch,
    onBeforeSearch,
  ]);

  const handleSearch = () => {
    const allowed = allowedDepartmentIdsRef.current;
    const roleScopeAll =
      Array.isArray(allowed) && allowed.length > 0 && formFilters.departmentId.trim() === "";
    const deptOk =
      departmentDisabled ||
      formFilters.departmentId.trim() !== "" ||
      roleScopeAll;
    if (!deptOk) {
      toast.error("กรุณาเลือก Division ก่อนค้นหา (หรือเลือกทั้งหมดเฉพาะเมื่อ role จำกัดแผนก)");
      return;
    }
    onBeforeSearch?.();
    const kw = formFilters.searchTerm.trim();
    onSearch({
      ...formFilters,
      searchTerm: kw,
      keyword: kw,
    });
  };

  const handleReset = () => {
    const lockedDeptId = departmentDisabled ? (initialDepartmentId?.trim() || "") : "";
    setFormFilters({
      searchTerm: "",
      departmentId: lockedDeptId,
      cabinetId: "",
      statusFilter: "all",
    });
    if (onReset) {
      onReset();
      return;
    }
    const defaultFilters: StaffItemsSearchFilters = {
      searchTerm: "",
      departmentId: lockedDeptId,
      cabinetId: "",
      statusFilter: "all",
      keyword: "",
    };
    onSearch(defaultFilters);
  };

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
              label: "ทั้งหมด (ทุกแผนกที่ role อนุญาต)",
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

  return (
    <Card className="mb-6 border-slate-200/80 shadow-sm rounded-xl">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <CardTitle>กรองข้อมูล</CardTitle>
        </div>

      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          <Label htmlFor="item-keyword">รหัส/ชื่อเวชภัณฑ์</Label>
          <Input
            id="item-keyword"
            placeholder="ค้นหา"
            value={formFilters.searchTerm}
            onChange={(e) => setFormFilters((prev) => ({ ...prev, searchTerm: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
          />
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
            value={formFilters.departmentId}
            initialDisplay={
              canPickAllRoleDepartments && formFilters.departmentId.trim() === ""
                ? {
                    label: "ทั้งหมด (ทุกแผนกที่ role อนุญาต)",
                    ...(roleScopeDivisionSummary ? { subLabel: roleScopeDivisionSummary } : {}),
                  }
                : undefined
            }
            onValueChange={(value) => {
              if (departmentDisabled) return;
              setFormFilters({
                ...formFilters,
                departmentId: value,
                cabinetId: "",
              });
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
              formFilters.departmentId
                ? "เลือกตู้"
                : canPickAllRoleDepartments
                  ? "เลือกตู้"
                  : "เลือก Division ก่อน"
            }
            value={formFilters.cabinetId}
            onValueChange={(value) => setFormFilters({ ...formFilters, cabinetId: value })}
            options={[
              ...cabinets.map((cabinet) => ({
                value: cabinet.id.toString(),
                label: cabinet.cabinet_name || "",
                subLabel: cabinet.cabinet_code || "",
              })),
            ]}
            loading={loadingCabinets}
            onSearch={(searchKeyword) => {
              void resolveCabinets(formFilters.departmentId, searchKeyword);
            }}
            searchPlaceholder="ค้นหารหัสหรือชื่อตู้..."
            disabled={false}
          />
        </div>

        <div className="flex gap-4">
          <Button onClick={handleSearch} className="flex-1">
            <Search className="mr-2 h-4 w-4" />
            ค้นหา
          </Button>
          <Button onClick={handleReset} variant="outline" className="flex-1">
            <RotateCcw className="mr-2 h-4 w-4" />
            รีเซ็ต
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
