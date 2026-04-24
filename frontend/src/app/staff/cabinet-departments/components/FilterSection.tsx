"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, RotateCcw, Filter } from "lucide-react";
import SearchableSelect from "./SearchableSelect";
import { staffCabinetDepartmentApi, staffCabinetApi } from "@/lib/staffApi/cabinetApi";
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

interface FilterSectionProps {
  onSearch: (filters: {
    cabinetId: string;
    departmentId: string;
    status: string;
  }) => void;
  /** เรียกเมื่อกดรีเซ็ต — ล้างผลค้นหาบนหน้า ไม่ถือว่าเป็นการค้นหาใหม่ */
  onReset?: () => void;
  initialDepartmentId?: string;
  departmentDisabled?: boolean;
}

export default function FilterSection({
  onSearch,
  onReset,
  initialDepartmentId,
  departmentDisabled,
}: FilterSectionProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCabinets, setLoadingCabinets] = useState(false);
  /** undefined = ยังไม่รู้ scope, null = ไม่จำกัดแผนก, number[] = เฉพาะแผนกที่ role อนุญาต */
  const allowedDepartmentIdsRef = useRef<number[] | null | undefined>(undefined);

  const [formFilters, setFormFilters] = useState({
    cabinetId: "",
    departmentId: initialDepartmentId ?? "",
    status: "ALL",
  });

  useEffect(() => {
    if (initialDepartmentId) {
      setFormFilters((prev) => ({ ...prev, departmentId: initialDepartmentId }));
    }
  }, [initialDepartmentId]);

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

  const resolveCabinets = useCallback(async (departmentIdStr: string, keyword?: string) => {
    try {
      setLoadingCabinets(true);
      let next: Cabinet[] = [];
      if (!departmentIdStr?.trim()) {
        const response = await staffCabinetApi.getAll({ page: 1, limit: 50, keyword });
        if (response?.data?.length) {
          const allCabinets = response.data as Cabinet[];
          next = allCabinets.filter((cabinet) => {
            if (cabinet.cabinetDepartments && cabinet.cabinetDepartments.length > 0) {
              return cabinet.cabinetDepartments.some((cd) => cd.status === "ACTIVE");
            }
            return cabinet.cabinet_status === "ACTIVE";
          });
        }
      } else {
        const deptId = parseInt(departmentIdStr, 10);
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

      setLoadingDepartments(true);
      try {
        if (cancelled) return;
        const list = (await fetchStaffDepartmentsForFilter({
          page: 1,
          limit: 50,
          allowedDepartmentIds: allowed,
        })) as Department[];
        if (cancelled) return;
        setDepartments(list);

        setFormFilters((prev) => {
          const nextDept = departmentDisabled
            ? (initialDepartmentId ?? prev.departmentId)
            : clampDepartmentIdString(prev.departmentId || initialDepartmentId, allowed, "");
          return {
            ...prev,
            departmentId: nextDept,
            cabinetId: "",
          };
        });
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoadingDepartments(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [departmentDisabled, initialDepartmentId]);

  useEffect(() => {
    void resolveCabinets(formFilters.departmentId);
  }, [formFilters.departmentId, resolveCabinets]);

  useEffect(() => {
    if (formFilters.cabinetId && cabinets.length > 0) {
      const exists = cabinets.some((c) => c.id.toString() === formFilters.cabinetId);
      if (!exists) {
        setFormFilters((prev) => ({ ...prev, cabinetId: "" }));
      }
    }
  }, [cabinets, formFilters.cabinetId]);

  const handleSearch = () => {
    onSearch(formFilters);
  };

  const handleReset = () => {
    const allowed = allowedDepartmentIdsRef.current;
    const defaultDept = departmentDisabled
      ? (initialDepartmentId ?? "")
      : clampDepartmentIdString("", allowed, "");
    const defaultFilters = {
      cabinetId: "",
      departmentId: defaultDept,
      status: "ALL",
    };
    setFormFilters(defaultFilters);
    onReset?.();
  };

  const departmentOptions = [
    { value: "", label: "ทั้งหมด" },
    ...departments.map((dept) => ({
      value: dept.ID.toString(),
      label: dept.DepName || "",
      subLabel: dept.DepName2 || "",
    })),
  ];

  return (
    <Card className="mb-6 border-slate-200/80 shadow-sm rounded-xl">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50">
        <CardTitle className="flex items-center gap-2 text-slate-800">
          <Filter className="h-5 w-5 text-blue-600" />
          กรองข้อมูล
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <SearchableSelect
            label="Division"
            placeholder="ทั้งหมด (ไม่บังคับ)"
            value={formFilters.departmentId}
            onValueChange={(value) => {
              if (departmentDisabled) return;
              setFormFilters({
                ...formFilters,
                departmentId: value,
                cabinetId: "",
              });
            }}
            options={departmentOptions}
            loading={loadingDepartments}
            onSearch={loadDepartments}
            searchPlaceholder="ค้นหา Division..."
            disabled={departmentDisabled}
          />

          <SearchableSelect
            label="ตู้ Cabinet"
            placeholder={
              formFilters.departmentId?.trim()
                ? "ทั้งหมดหรือเลือกตู้ (ในแผนกนี้)"
                : "ทั้งหมดหรือเลือกตู้ (ทุกตู้ที่ใช้งาน)"
            }
            value={formFilters.cabinetId}
            onValueChange={(value) => setFormFilters({ ...formFilters, cabinetId: value })}
            options={[
              { value: "", label: "ทั้งหมด" },
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

        <div className="flex gap-3 pt-1">
          <Button onClick={handleSearch} className="flex-1">
            <Search className="mr-2 h-4 w-4" />
            ค้นหา
          </Button>
          <Button onClick={handleReset} variant="outline" className="flex-1 border-slate-200 hover:bg-slate-50">
            <RotateCcw className="mr-2 h-4 w-4" />
            รีเซ็ต
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
