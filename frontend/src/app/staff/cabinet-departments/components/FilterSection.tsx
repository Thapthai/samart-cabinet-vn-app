"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, RotateCcw, Filter } from "lucide-react";
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
}

interface CabinetDepartmentMapping {
  id: number;
  cabinet_id: number;
  department_id: number;
  cabinet?: {
    id: number;
    cabinet_name?: string;
    cabinet_code?: string;
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

  const loadCabinetsByDepartment = async (departmentId: string, keyword?: string) => {
    if (!departmentId || departmentId === "") {
      setCabinets([]);
      return;
    }

    try {
      setLoadingCabinets(true);
      const response = await staffCabinetDepartmentApi.getAll({
        departmentId: parseInt(departmentId, 10),
        keyword: keyword,
      });

      if (response.success && response.data) {
        const mappings = response.data as CabinetDepartmentMapping[];
        const uniqueCabinets = new Map<number, Cabinet>();

        mappings.forEach((mapping) => {
          if (mapping.cabinet && !uniqueCabinets.has(mapping.cabinet.id)) {
            uniqueCabinets.set(mapping.cabinet.id, {
              id: mapping.cabinet.id,
              cabinet_name: mapping.cabinet.cabinet_name,
              cabinet_code: mapping.cabinet.cabinet_code,
            });
          }
        });

        setCabinets(Array.from(uniqueCabinets.values()));
      } else {
        setCabinets([]);
      }
    } catch (error) {
      console.error("Failed to load cabinets by department:", error);
      setCabinets([]);
    } finally {
      setLoadingCabinets(false);
    }
  };

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
    loadCabinetsByDepartment(formFilters.departmentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- trigger when department changes
  }, [formFilters.departmentId]);

  const handleSearch = () => {
    if (!formFilters.departmentId?.trim()) {
      return;
    }
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

  const departmentOptions = departments.map((dept) => ({
    value: dept.ID.toString(),
    label: dept.DepName || "",
    subLabel: dept.DepName2 || "",
  }));

  return (
    <Card className="mb-6 border-slate-200/80 shadow-sm rounded-xl">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50">
        <CardTitle className="flex items-center gap-2 text-slate-800">
          <Filter className="h-5 w-5 text-blue-600" />
          ค้นหาและกรอง
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <SearchableSelect
            label="แผนก"
            placeholder="— เลือกแผนก —"
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
            searchPlaceholder="ค้นหาชื่อแผนก..."
            disabled={departmentDisabled}
          />

          <SearchableSelect
            label="ตู้ Cabinet"
            placeholder={formFilters.departmentId ? "เลือกตู้ Cabinet" : "กรุณาเลือกแผนกก่อน"}
            value={formFilters.cabinetId}
            onValueChange={(value) => setFormFilters({ ...formFilters, cabinetId: value })}
            options={[
              { value: "", label: "ทุกตู้ (ในแผนกนี้)" },
              ...cabinets.map((cabinet) => ({
                value: cabinet.id.toString(),
                label: cabinet.cabinet_name || "",
                subLabel: cabinet.cabinet_code || "",
              })),
            ]}
            loading={loadingCabinets}
            onSearch={(searchKeyword) => {
              if (formFilters.departmentId) {
                loadCabinetsByDepartment(formFilters.departmentId, searchKeyword);
              }
            }}
            searchPlaceholder={formFilters.departmentId ? "ค้นหารหัสหรือชื่อตู้..." : "กรุณาเลือกแผนกก่อน"}
            disabled={!formFilters.departmentId}
          />
        </div>

        <div className="flex gap-3 pt-1">
          <Button
            onClick={handleSearch}
            className="flex-1"
            disabled={!formFilters.departmentId?.trim()}
          >
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
