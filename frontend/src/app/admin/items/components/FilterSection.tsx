"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Search, RotateCcw, Filter } from "lucide-react";
import SearchableSelect from "./SearchableSelect";
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
  /** กดปุ่มค้นหา — หน้าถึงจะดึงข้อมูล */
  onSearch: (filters: {
    searchTerm: string;
    departmentId: string;
    subDepartmentId: string;
    cabinetId: string;
    statusFilter: string;
    keyword: string;
  }) => void;
  /** เรียกก่อน onSearch เพื่อให้หน้ารีเซ็ตเป็นหน้า 1 (เช่น setCurrentPage(1)) */
  onBeforeSearch?: () => void;
  /** กดรีเซ็ต — ล้างตารางโดยไม่เรียก API */
  onReset?: () => void;
}

export default function FilterSection({ onSearch, onBeforeSearch, onReset }: FilterSectionProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartmentsMaster, setSubDepartmentsMaster] = useState<SubDepartmentRow[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCabinets, setLoadingCabinets] = useState(false);

  const [formFilters, setFormFilters] = useState({
    searchTerm: "",
    departmentId: "",
    subDepartmentId: "",
    cabinetId: "",
    statusFilter: "all",
  });

  const subDepartmentOptions = useMemo(() => {
    const deptId = formFilters.departmentId?.trim();
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
  }, [subDepartmentsMaster, formFilters.departmentId]);

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
    void resolveCabinets(formFilters.departmentId, formFilters.subDepartmentId);
  }, [formFilters.departmentId, formFilters.subDepartmentId, resolveCabinets]);

  useEffect(() => {
    if (formFilters.cabinetId && cabinets.length > 0) {
      const cabinetExists = cabinets.some(
        (cabinet) => cabinet.id.toString() === formFilters.cabinetId,
      );
      if (!cabinetExists) {
        setFormFilters((prev) => ({
          ...prev,
          cabinetId: "",
        }));
      }
    }
  }, [cabinets, formFilters.cabinetId]);

  const handleSearch = () => {
    onBeforeSearch?.();
    const kw = formFilters.searchTerm.trim();
    onSearch({
      ...formFilters,
      searchTerm: kw,
      keyword: kw,
    });
  };

  const handleReset = () => {
    setFormFilters({
      searchTerm: "",
      departmentId: "",
      subDepartmentId: "",
      cabinetId: "",
      statusFilter: "all",
    });
    onReset?.();
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
            label="Division"
            placeholder="เลือก Division"
            value={formFilters.departmentId}
            onValueChange={(value) => {
              setFormFilters({
                ...formFilters,
                departmentId: value,
                subDepartmentId: "",
                cabinetId: "",
              });
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
              formFilters.departmentId ? "เลือกแผนก ..." : "กรุณาเลือก Division ก่อน"
            }
            value={formFilters.subDepartmentId}
            onValueChange={(value) =>
              setFormFilters({
                ...formFilters,
                subDepartmentId: value,
                cabinetId: "",
              })
            }
            options={subDepartmentOptions}
            disabled={!formFilters.departmentId}
            searchPlaceholder="ค้นหารหัสหรือชื่อแผนก ..."
          />
        </div>

        <div className="grid grid-cols-1 gap-2 mb-4">
          <SearchableSelect
            label="ตู้ Cabinet"
            placeholder={
              formFilters.departmentId ? "เลือกตู้ Cabinet" : "กรุณาเลือก Division ก่อน"
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
              void resolveCabinets(
                formFilters.departmentId,
                formFilters.subDepartmentId,
                searchKeyword,
              );
            }}
            searchPlaceholder={
              formFilters.departmentId
                ? "ค้นหารหัสหรือชื่อตู้..."
                : "กรุณาเลือก Division ก่อน"
            }
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
