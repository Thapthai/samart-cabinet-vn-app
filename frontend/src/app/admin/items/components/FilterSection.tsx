"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Search, RotateCcw, Filter } from "lucide-react";
import SearchableSelect from "./SearchableSelect";
import { cabinetApi, departmentApi, cabinetDepartmentApi } from "@/lib/api";

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
  /** เรียกก่อน onSearch เพื่อให้หน้ารีเซ็ตเป็นหน้า 1 (เช่น setCurrentPage(1)) */
  onBeforeSearch?: () => void;
}

export default function FilterSection({ onSearch, onBeforeSearch }: FilterSectionProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCabinets, setLoadingCabinets] = useState(false);
  const hasInitialSearch = useRef(false);

  // Form state (local)
  const [formFilters, setFormFilters] = useState({
    searchTerm: "",
    departmentId: "29",
    cabinetId: "1",
    statusFilter: "all",
  });

  // Load departments with search
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

  // Load cabinets based on selected department (Select Chain)
  const loadCabinetsByDepartment = async (departmentId: string, keyword?: string) => {
    if (!departmentId || departmentId === "") {
      // If no department selected, load all cabinets
      loadAllCabinets(keyword);
      return;
    }

    try {
      setLoadingCabinets(true);
      const response = await cabinetDepartmentApi.getAll({
        departmentId: parseInt(departmentId),
        keyword: keyword || undefined,
      });

      if (response.success && response.data) {
        // Extract unique cabinets from mappings (only ACTIVE mappings)
        const mappings = response.data as CabinetDepartmentMapping[];
        const uniqueCabinets = new Map<number, Cabinet>();

        mappings
          .filter((mapping) => mapping.status === "ACTIVE") // Filter only ACTIVE mappings
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

  // Load all cabinets (fallback when no department selected)
  const loadAllCabinets = async (keyword?: string) => {
    try {
      setLoadingCabinets(true);
      const response = await cabinetApi.getAll({ page: 1, limit: 50, keyword });
      if (response.success && response.data) {
        // Filter cabinets that have at least one ACTIVE cabinetDepartment mapping
        const allCabinets = response.data as Cabinet[];
        const filteredCabinets = allCabinets.filter((cabinet) => {
          // If cabinet has cabinetDepartments, check if any has status === "ACTIVE"
          if (cabinet.cabinetDepartments && cabinet.cabinetDepartments.length > 0) {
            return cabinet.cabinetDepartments.some((cd) => cd.status === "ACTIVE");
          }
          // If no cabinetDepartments, filter by cabinet_status === "ACTIVE"
          return cabinet.cabinet_status === "ACTIVE";
        });
        setCabinets(filteredCabinets);
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

  // Trigger initial search with default values after cabinets are loaded
  useEffect(() => {
    if (
      !hasInitialSearch.current &&
      formFilters.departmentId &&
      formFilters.cabinetId &&
      cabinets.length > 0 &&
      !loadingCabinets
    ) {
      hasInitialSearch.current = true;
      const kw = formFilters.searchTerm.trim();
      onSearch({
        ...formFilters,
        searchTerm: kw,
        keyword: kw,
      });
    }
  }, [cabinets, loadingCabinets, formFilters, onSearch]);

  const handleSearch = () => {
    onBeforeSearch?.(); // รีเซ็ตเป็นหน้า 1 ก่อนค้นหา
    const kw = formFilters.searchTerm.trim();
    onSearch({
      ...formFilters,
      searchTerm: kw,
      keyword: kw,
    });
  };

  const handleReset = () => {
    const defaultFilters = {
      searchTerm: "",
      departmentId: "29",
      cabinetId: "1",
      statusFilter: "all",
      keyword: "", // Add keyword to match API
    };
    setFormFilters({
      searchTerm: "",
      departmentId: "29",
      cabinetId: "1",
      statusFilter: "all",
    });
    hasInitialSearch.current = false;
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
