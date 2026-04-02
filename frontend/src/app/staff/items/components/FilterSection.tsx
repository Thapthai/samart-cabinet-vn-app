"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface FilterSectionProps {
  onSearch: (filters: {
    searchTerm: string;
    departmentId: string;
    cabinetId: string;
    statusFilter: string;
    keyword: string;
  }) => void;
  /** เรียกก่อน onSearch เพื่อให้หน้ารีเซ็ตเป็นหน้า 1 */
  onBeforeSearch?: () => void;
  initialDepartmentId?: string;
  departmentDisabled?: boolean;
}

export default function FilterSection({ onSearch, onBeforeSearch, initialDepartmentId, departmentDisabled }: FilterSectionProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCabinets, setLoadingCabinets] = useState(false);
  const allowedDepartmentIdsRef = useRef<number[] | null | undefined>(undefined);

  // Form state (local) — แผนก/ตู้ ไม่มีค่าเริ่มต้น (ยกเว้นโหมดล็อกแผนก)
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
  };

  // Load cabinets based on selected department (Select Chain)
  const loadCabinetsByDepartment = async (departmentId: string, keyword?: string) => {
    if (!departmentId || departmentId === "") {
      setCabinets([]);
      return;
    }

    try {
      setLoadingCabinets(true);
      const response = await staffCabinetDepartmentApi.getAll({
        departmentId: parseInt(departmentId, 10),
        keyword: keyword || undefined,
      });

      if (response.success && response.data) {
        const mappings = response.data as CabinetDepartmentMapping[];
        const uniqueCabinets = new Map<number, Cabinet>();

        mappings
          .filter((mapping) => mapping.status === "ACTIVE")
          .forEach((mapping) => {
            if (mapping.cabinet && !uniqueCabinets.has(mapping.cabinet.id)) {
              uniqueCabinets.set(mapping.cabinet.id, {
                id: mapping.cabinet.id,
                cabinet_name: mapping.cabinet.cabinet_name,
                cabinet_code: mapping.cabinet.cabinet_code,
                cabinet_status: mapping.cabinet.cabinet_status,
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
      try {
        setLoadingDepartments(true);
        const list = await fetchStaffDepartmentsForFilter({
          page: 1,
          limit: 50,
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
        return { ...prev, departmentId: nextDept, cabinetId: nextDept !== prev.departmentId ? "" : prev.cabinetId };
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [departmentDisabled]);

  // Load cabinets when department changes
  useEffect(() => {
    loadCabinetsByDepartment(formFilters.departmentId);
  }, [formFilters.departmentId]);

  // Validate cabinetId when cabinets list changes (reset if not in new list)
  useEffect(() => {
    if (formFilters.cabinetId && cabinets.length > 0) {
      const cabinetExists = cabinets.some(
        (cabinet) => cabinet.id.toString() === formFilters.cabinetId
      );
      if (!cabinetExists) {
        // Cabinet ID not in new list, reset it
        setFormFilters((prev) => ({
          ...prev,
          cabinetId: "",
        }));
      }
    }
  }, [cabinets, formFilters.cabinetId]);

  const handleSearch = () => {
    if (!formFilters.departmentId?.trim()) {
      toast.error("กรุณาเลือกแผนก");
      return;
    }
    if (!formFilters.cabinetId?.trim()) {
      toast.error("กรุณาเลือกตู้ Cabinet");
      return;
    }
    onBeforeSearch?.(); // รีเซ็ตเป็นหน้า 1 ก่อนค้นหา
    const kw = formFilters.searchTerm.trim();
    onSearch({
      ...formFilters,
      searchTerm: kw,
      keyword: kw,
    });
  };

  const handleReset = () => {
    const lockedDeptId = departmentDisabled ? (initialDepartmentId?.trim() || "") : "";
    const defaultFilters = {
      searchTerm: "",
      departmentId: lockedDeptId,
      cabinetId: "",
      statusFilter: "all",
      keyword: "",
    };
    setFormFilters({
      searchTerm: "",
      departmentId: lockedDeptId,
      cabinetId: "",
      statusFilter: "all",
    });
    onSearch(defaultFilters);
  };

  return (
    <Card className="mb-6 border-slate-200/80 shadow-sm rounded-xl">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <CardTitle>ค้นหาและกรอง</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          <Label htmlFor="item-keyword">รหัส/ชื่อเวชภัณฑ์</Label>
          <Input
            id="item-keyword"
            placeholder="ค้นหา"
            value={formFilters.searchTerm}
            onChange={(e) =>
              setFormFilters((prev) => ({ ...prev, searchTerm: e.target.value }))
            }
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
            label="แผนก"
            placeholder="เลือกแผนก"
            value={formFilters.departmentId}
            onValueChange={(value) => {
              if (departmentDisabled) return;
              setFormFilters({
                ...formFilters,
                departmentId: value,
                cabinetId: "", // Reset cabinet when department changes
              });
            }}
            options={[
              ...departments.map((dept) => ({
                value: dept.ID.toString(),
                label: dept.DepName || "",
                subLabel: dept.DepName2 || "",
              })),
            ]}
            loading={loadingDepartments}
            onSearch={loadDepartments}
            searchPlaceholder="ค้นหาชื่อแผนก..."
            disabled={departmentDisabled}
          />

          <SearchableSelect
            label="ตู้ Cabinet"
            placeholder={
              formFilters.departmentId ? "เลือกตู้ (บังคับ)" : "กรุณาเลือกแผนกก่อน"
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
              loadCabinetsByDepartment(formFilters.departmentId || "", searchKeyword);
            }}
            searchPlaceholder={formFilters.departmentId ? "ค้นหารหัสหรือชื่อตู้..." : "กรุณาเลือกแผนกก่อน"}
            disabled={!formFilters.departmentId}
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
