"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerBE } from "@/components/ui/date-picker-be";
import type { FilterState } from "../types";
import SearchableSelect from "@/app/admin/items/components/SearchableSelect";
import {
  cabinetApi,
  departmentApi,
  cabinetDepartmentApi,
  cabinetSubDepartmentApi,
  medicalSupplySubDepartmentsApi,
} from "@/lib/api";

interface Department {
  ID: number;
  DepName?: string;
  DepName2?: string;
  DepCode?: string;
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

interface FilterSectionProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  onSearch: () => void;
  onClear: () => void;
  onRefresh: () => void;
  itemTypes: Array<{ id: string; name: string }>;
  loading: boolean;
}

export default function FilterSection({
  filters,
  onFilterChange,
  onSearch,
  onClear,
  onRefresh,
  itemTypes: _itemTypes,
  loading,
}: FilterSectionProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartmentsMaster, setSubDepartmentsMaster] = useState<SubDepartmentRow[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCabinets, setLoadingCabinets] = useState(false);

  const subDepartmentOptions = useMemo(() => {
    const deptId = filters.departmentId?.trim();
    if (!deptId) return [{ value: "", label: "ทั้งหมด" }];
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

  const resolveCabinets = useCallback(
    async (departmentIdStr: string, subDepartmentIdStr: string, keyword?: string) => {
      try {
        setLoadingCabinets(true);
        let next: Cabinet[] = [];
        const subTrim = subDepartmentIdStr?.trim() ?? "";
        if (subTrim) {
          const sid = parseInt(subTrim, 10);
          if (!Number.isNaN(sid)) {
            const res = await cabinetSubDepartmentApi.getAll({
              subDepartmentId: sid,
              status: "ACTIVE",
            });
            const raw = (res as { success?: boolean; data?: unknown[] }).data;
            if (Array.isArray(raw)) {
              const unique = new Map<number, Cabinet>();
              for (const row of raw) {
                if (!row || typeof row !== "object") continue;
                const m = row as { status?: string; cabinet?: unknown };
                if (m.status != null && m.status !== "ACTIVE") continue;
                const c = m.cabinet as CabinetDepartmentMapping["cabinet"];
                const mapped = mapCabinetFromMapping(c);
                if (mapped && !unique.has(mapped.id)) unique.set(mapped.id, mapped);
              }
              next = Array.from(unique.values());
            }
          }
        } else if (!departmentIdStr) {
          const response = await cabinetApi.getAll({ page: 1, limit: 50, keyword });
          if (response.success && response.data) {
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
          const response = await cabinetDepartmentApi.getAll({
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
    },
    [],
  );

  useEffect(() => {
    loadDepartments();
    (async () => {
      try {
        const res = await medicalSupplySubDepartmentsApi.getAll();
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
    void resolveCabinets(filters.departmentId, filters.subDepartmentId);
  }, [filters.departmentId, filters.subDepartmentId, resolveCabinets]);

  useEffect(() => {
    if (filters.cabinetId && cabinets.length > 0) {
      const exists = cabinets.some((c) => c.id.toString() === filters.cabinetId);
      if (!exists) onFilterChange("cabinetId", "");
    }
  }, [cabinets, filters.cabinetId, onFilterChange]);

  const handleSearchClick = () => {
    onSearch();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>กรองข้อมูล</CardTitle>
        <CardDescription>ค้นหาและกรองรายการเติมอุปกรณ์เข้าตู้</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">รหัส/ชื่อเวชภัณฑ์</label>
          <Input
            placeholder="ค้นหา..."
            value={filters.searchItemCode}
            onChange={(e) => onFilterChange("searchItemCode", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchClick()}
            className="w-full"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SearchableSelect
            label="Division"
            placeholder="เลือก Division"
            value={filters.departmentId}
            onValueChange={(value) => {
              onFilterChange("departmentId", value);
              onFilterChange("subDepartmentId", "");
              onFilterChange("cabinetId", "");
            }}
            options={[
              { value: "", label: "ทั้งหมด" },
              ...departments.map((dept) => ({
                value: dept.ID.toString(),
                label: dept.DepName || "",
                subLabel: dept.DepName2 || "",
              })),
            ]}
            loading={loadingDepartments}
            onSearch={loadDepartments}
            searchPlaceholder="ค้นหาชื่อ Division..."
          />
          <SearchableSelect
            label="แผนก"
            placeholder={
              filters.departmentId ? "เลือกแผนก ..." : "กรุณาเลือก Division ก่อน"
            }
            value={filters.subDepartmentId}
            onValueChange={(value) => {
              onFilterChange("subDepartmentId", value);
              onFilterChange("cabinetId", "");
            }}
            options={subDepartmentOptions}
            disabled={!filters.departmentId}
            searchPlaceholder="ค้นหารหัสหรือชื่อแผนก ..."
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <SearchableSelect
            label="ตู้ Cabinet"
            placeholder={
              filters.departmentId ? "เลือกตู้ Cabinet" : "กรุณาเลือก Division ก่อน"
            }
            value={filters.cabinetId}
            onValueChange={(value) => onFilterChange("cabinetId", value)}
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
              void resolveCabinets(
                filters.departmentId,
                filters.subDepartmentId,
                searchKeyword,
              );
            }}
            searchPlaceholder={
              filters.departmentId
                ? "ค้นหารหัสหรือชื่อตู้..."
                : "กรุณาเลือก Division ก่อน"
            }
            disabled={!filters.departmentId}
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
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
