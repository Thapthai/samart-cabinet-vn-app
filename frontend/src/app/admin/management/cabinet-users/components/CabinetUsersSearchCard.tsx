"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Filter, RefreshCw, RotateCcw, Search } from "lucide-react";
import SearchableSelect from "@/app/admin/items/components/SearchableSelect";
import { cabinetApi, cabinetDepartmentApi, departmentApi } from "@/lib/api";

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

export function CabinetUsersSearchCard({
  keywordInput,
  onKeywordChange,
  departmentId,
  onDepartmentIdChange,
  cabinetId,
  onCabinetIdChange,
  onSearch,
  onReset,
  onRefresh,
  loading,
}: {
  keywordInput: string;
  onKeywordChange: (value: string) => void;
  departmentId: string;
  onDepartmentIdChange: (value: string) => void;
  cabinetId: string;
  onCabinetIdChange: (value: string) => void;
  onSearch: () => void;
  onReset: () => void;
  onRefresh: () => void;
  loading: boolean;
}) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCabinets, setLoadingCabinets] = useState(false);

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

  const resolveCabinets = useCallback(async (departmentIdStr: string, keyword?: string) => {
    try {
      setLoadingCabinets(true);
      let next: Cabinet[] = [];
      if (!departmentIdStr) {
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
  }, []);

  useEffect(() => {
    void loadDepartments();
  }, []);

  useEffect(() => {
    void resolveCabinets(departmentId);
  }, [departmentId, resolveCabinets]);

  useEffect(() => {
    if (cabinetId && cabinets.length > 0) {
      const cabinetExists = cabinets.some((c) => c.id.toString() === cabinetId);
      if (!cabinetExists) {
        onCabinetIdChange("");
      }
    }
  }, [cabinets, cabinetId, onCabinetIdChange]);

  const handleSearch = () => {
    onSearch();
  };

  return (
    <Card className="mb-6 border-slate-200/80 shadow-sm rounded-xl">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <CardTitle>ค้นหาและกรอง</CardTitle>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onRefresh}
            aria-label="รีเฟรชรายการ"
            className="shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          <Label htmlFor="cabinet-user-keyword">UserName / EmpCode</Label>
          <Input
            id="cabinet-user-keyword"
            placeholder="ค้นหา"
            value={keywordInput}
            onChange={(e) => onKeywordChange(e.target.value)}
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
            value={departmentId}
            onValueChange={(value) => {
              onDepartmentIdChange(value);
              onCabinetIdChange("");
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
            label="ตู้ Cabinet"
            placeholder={departmentId ? "เลือกตู้ Cabinet" : "กรุณาเลือก Division ก่อน"}
            value={cabinetId}
            onValueChange={onCabinetIdChange}
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
              void resolveCabinets(departmentId, searchKeyword);
            }}
            searchPlaceholder={
              departmentId ? "ค้นหารหัสหรือชื่อตู้..." : "กรุณาเลือก Division ก่อน"
            }
            disabled={!departmentId}
          />
        </div>

        <div className="flex gap-4">
          <Button type="button" onClick={handleSearch} className="flex-1">
            <Search className="mr-2 h-4 w-4" />
            ค้นหา
          </Button>
          <Button type="button" onClick={onReset} variant="outline" className="flex-1">
            <RotateCcw className="mr-2 h-4 w-4" />
            รีเซ็ต
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
