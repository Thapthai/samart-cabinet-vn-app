"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import SearchableSelect from "@/app/admin/management/cabinet-departments/components/SearchableSelect";
import { weighingApi, departmentApi, cabinetDepartmentApi } from "@/lib/api";

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
  cabinet?: { id: number; cabinet_name?: string; cabinet_code?: string };
}

interface FilterSectionProps {
  onSearch: (filters: { cabinetId: string; departmentId: string; status: string }) => void;
  onBeforeSearch?: () => void;
}

export default function FilterSection({ onSearch, onBeforeSearch }: FilterSectionProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCabinets, setLoadingCabinets] = useState(false);

  const [formFilters, setFormFilters] = useState({
    cabinetId: "",
    departmentId: "",
    status: "ALL",
  });

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

  const loadCabinetsByDepartment = async (departmentId: string, keyword?: string) => {
    if (!departmentId || departmentId === "") {
      loadWeighingCabinets(keyword);
      return;
    }

    try {
      setLoadingCabinets(true);
      const response = await cabinetDepartmentApi.getAll({
        departmentId: parseInt(departmentId),
        keyword: keyword,
        onlyWeighingCabinets: true,
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

  const loadWeighingCabinets = async (keyword?: string) => {
    try {
      setLoadingCabinets(true);
      const response = await weighingApi.getCabinets();
      if (response.success && response.data) {
        let list = response.data as Cabinet[];
        if (keyword?.trim()) {
          const k = keyword.trim().toLowerCase();
          list = list.filter(
            (c) =>
              (c.cabinet_name || "").toLowerCase().includes(k) ||
              (c.cabinet_code || "").toLowerCase().includes(k)
          );
        }
        setCabinets(list);
      } else {
        setCabinets([]);
      }
    } catch (error) {
      console.error("Failed to load weighing cabinets:", error);
      setCabinets([]);
    } finally {
      setLoadingCabinets(false);
    }
  };

  useEffect(() => {
    loadCabinetsByDepartment(formFilters.departmentId);
  }, [formFilters.departmentId]);

  const handleSearch = () => {
    onBeforeSearch?.();
    onSearch(formFilters);
  };

  const handleReset = () => {
    const defaultFilters = { cabinetId: "", departmentId: "", status: "ALL" };
    setFormFilters(defaultFilters);
    onSearch(defaultFilters);
  };

  return (
    <Card className="mb-6 border-blue-100/80 bg-gradient-to-br from-slate-50 to-blue-50/40 shadow-sm overflow-hidden rounded-xl">
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
            placeholder="เลือกแผนก"
            value={formFilters.departmentId}
            onValueChange={(value) => {
              setFormFilters({ ...formFilters, departmentId: value, cabinetId: "" });
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
            searchPlaceholder="ค้นหาชื่อแผนก..."
          />

          <SearchableSelect
            label="ตู้ Weighing"
            placeholder={formFilters.departmentId ? "เลือกตู้ Weighing" : "ทั้งหมด (เลือกแผนกเพื่อกรอง)"}
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
              if (formFilters.departmentId) {
                loadCabinetsByDepartment(formFilters.departmentId, searchKeyword);
              } else {
                loadWeighingCabinets(searchKeyword);
              }
            }}
            searchPlaceholder="ค้นหารหัสหรือชื่อตู้..."
          />
        </div>

        <div className="flex gap-3 pt-1">
          <Button onClick={handleSearch} className="flex-1 shadow-sm">
            ค้นหา
          </Button>
          <Button onClick={handleReset} variant="outline" className="flex-1 border-gray-300 hover:bg-slate-50">
            รีเซ็ต
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
