"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, RotateCcw, Filter } from "lucide-react";
import SearchableSelect from "./SearchableSelect";
import { staffCabinetApi, staffCabinetDepartmentApi } from "@/lib/staffApi/cabinetApi";
import { staffDepartmentApi } from "@/lib/staffApi/departmentApi";

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
  initialDepartmentId?: string;
  departmentDisabled?: boolean;
}

export default function FilterSection({ onSearch, initialDepartmentId, departmentDisabled }: FilterSectionProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCabinets, setLoadingCabinets] = useState(false);

  // Form state (local)
  const [formFilters, setFormFilters] = useState({
    cabinetId: "",
    departmentId: initialDepartmentId ?? "",
    status: "ALL",
  });

  // Sync initialDepartmentId ถ้าโหลดมาทีหลัง (จาก localStorage)
  useEffect(() => {
    if (initialDepartmentId) {
      setFormFilters(prev => ({ ...prev, departmentId: initialDepartmentId }));
    }
  }, [initialDepartmentId]);

  // Load departments with search
  const loadDepartments = async (keyword?: string) => {
    try {
      setLoadingDepartments(true);
      const response = await staffDepartmentApi.getAll({ page: 1, limit: 50, keyword });
      if (response.success && response.data) {
        setDepartments(response.data as Department[]);
      }
    } catch (error) {
      console.error("Failed to load departments:", error);
    } finally {
      setLoadingDepartments(false);
    }
  };

  // Load cabinets based on selected department (Select Chain)
  const loadCabinetsByDepartment = async (departmentId: string, keyword?: string) => {
    if (!departmentId || departmentId === "") {
      // If no department selected, load all cabinets
      loadAllCabinets(keyword);
      return;
    }

    try {
      setLoadingCabinets(true);
      const response = await staffCabinetDepartmentApi.getAll({ 
        departmentId: parseInt(departmentId),
        keyword: keyword,
      });
      
      if (response.success && response.data) {
        // Extract unique cabinets from mappings
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

  // Load all cabinets (fallback when no department selected)
  const loadAllCabinets = async (keyword?: string) => {
    try {
      setLoadingCabinets(true);
      const response = await staffCabinetApi.getAll({ page: 1, limit: 50, keyword });
      if (response.success && response.data) {
        setCabinets(response.data as Cabinet[]);
      }
    } catch (error) {
      console.error("Failed to load cabinets:", error);
    } finally {
      setLoadingCabinets(false);
    }
  };

  // Load departments on mount
  useEffect(() => {
    loadDepartments();
  }, []);

  // Load cabinets when department changes
  useEffect(() => {
    loadCabinetsByDepartment(formFilters.departmentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadCabinetsByDepartment is stable, departmentId is the trigger
  }, [formFilters.departmentId]);

  const handleSearch = () => {
    onSearch(formFilters);
  };

  const handleReset = () => {
    const defaultFilters = {
      cabinetId: "",
      departmentId: departmentDisabled ? (initialDepartmentId ?? "") : "",
      status: "ALL",
    };
    setFormFilters(defaultFilters);
    onSearch(defaultFilters);
  };

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
            disabled={departmentDisabled}
          />

          <SearchableSelect
            label="ตู้ Cabinet"
            placeholder={formFilters.departmentId ? "เลือกตู้ Cabinet" : "กรุณาเลือกแผนกก่อน"}
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
              // When searching in cabinet dropdown, load based on selected department
              if (formFilters.departmentId) {
                loadCabinetsByDepartment(formFilters.departmentId, searchKeyword);
              } else {
                loadAllCabinets(searchKeyword);
              }
            }}
            searchPlaceholder={formFilters.departmentId ? "ค้นหารหัสหรือชื่อตู้..." : "กรุณาเลือกแผนกก่อน"}
            disabled={!formFilters.departmentId}
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
