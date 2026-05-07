'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePickerBE } from '@/components/ui/date-picker-be';
import SearchableSelect from '@/app/admin/items/components/SearchableSelect';
import { cabinetApi, cabinetDepartmentApi, departmentApi } from '@/lib/api';

type Department = {
  ID: number;
  DepName?: string;
  DepName2?: string;
};

type Cabinet = {
  id: number;
  cabinet_name?: string;
  cabinet_code?: string;
  cabinet_status?: string;
  cabinetDepartments?: Array<{ id: number; department_id: number; status: string }>;
};

type CabinetDepartmentMapping = {
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
};

export type BorrowFilterState = {
  searchItemCode: string;
  startDate: string;
  endDate: string;
  departmentId: string;
  cabinetId: string;
  borrowDepartmentId: string;
};

function mapCabinetFromMapping(cabinet: CabinetDepartmentMapping['cabinet']): Cabinet | null {
  if (!cabinet || typeof cabinet.id !== 'number') return null;
  return {
    id: cabinet.id,
    cabinet_name: cabinet.cabinet_name,
    cabinet_code: cabinet.cabinet_code,
    cabinet_status: cabinet.cabinet_status,
  };
}

type Props = {
  filters: BorrowFilterState;
  onFilterChange: (key: keyof BorrowFilterState, value: string) => void;
  onSearch: () => void;
  onClear: () => void;
  onRefresh: () => void;
  loading: boolean;
};

export default function FilterSection({
  filters,
  onFilterChange,
  onSearch,
  onClear,
  onRefresh,
  loading,
}: Props) {
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
      console.error('Failed to load departments:', error);
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
              return cabinet.cabinetDepartments.some((cd) => cd.status === 'ACTIVE');
            }
            return cabinet.cabinet_status === 'ACTIVE';
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
            .filter((mapping) => mapping.status === 'ACTIVE')
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
      console.error('Failed to load cabinets:', error);
      setCabinets([]);
    } finally {
      setLoadingCabinets(false);
    }
  }, []);

  useEffect(() => {
    void loadDepartments();
  }, []);

  useEffect(() => {
    void resolveCabinets(filters.departmentId);
  }, [filters.departmentId, resolveCabinets]);

  useEffect(() => {
    if (filters.cabinetId && cabinets.length > 0) {
      const exists = cabinets.some((c) => c.id.toString() === filters.cabinetId);
      if (!exists) onFilterChange('cabinetId', '');
    }
  }, [cabinets, filters.cabinetId, onFilterChange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>กรองข้อมูล</CardTitle>
        <CardDescription>ค้นหาและกรองรายการยืมอุปกรณ์</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">รหัส/ชื่อเวชภัณฑ์</label>
            <Input
              placeholder="ค้นหา..."
              value={filters.searchItemCode}
              onChange={(e) => onFilterChange('searchItemCode', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">วันที่เริ่มต้น</label>
              <DatePickerBE
                value={filters.startDate}
                onChange={(v) => onFilterChange('startDate', v)}
                placeholder="วว/ดด/ปปปป (พ.ศ.)"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">วันที่สิ้นสุด</label>
              <DatePickerBE
                value={filters.endDate}
                onChange={(v) => onFilterChange('endDate', v)}
                placeholder="วว/ดด/ปปปป (พ.ศ.)"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchableSelect
              label="Division (ที่ตั้งตู้)"
              placeholder="เลือก Division"
              value={filters.departmentId}
              onValueChange={(value) => {
                onFilterChange('departmentId', value);
                onFilterChange('cabinetId', '');
              }}
              options={[
                { value: '', label: 'ทั้งหมด' },
                ...departments.map((dept) => ({
                  value: dept.ID.toString(),
                  label: dept.DepName || '',
                  subLabel: dept.DepName2 || '',
                })),
              ]}
              loading={loadingDepartments}
              onSearch={loadDepartments}
              searchPlaceholder="ค้นหาชื่อ Division..."
            />
            <SearchableSelect
              label="ตู้ Cabinet"
              placeholder={filters.departmentId ? 'เลือกตู้ Cabinet' : 'เลือกตู้ (ทุก Division ที่มีการเชื่อม)'}
              value={filters.cabinetId}
              onValueChange={(value) => onFilterChange('cabinetId', value)}
              options={[
                { value: '', label: 'ทั้งหมด' },
                ...cabinets.map((cabinet) => ({
                  value: cabinet.id.toString(),
                  label: cabinet.cabinet_name || '',
                  subLabel: cabinet.cabinet_code || '',
                })),
              ]}
              loading={loadingCabinets}
              onSearch={(searchKeyword) => {
                void resolveCabinets(filters.departmentId, searchKeyword);
              }}
              searchPlaceholder="ค้นหารหัสหรือชื่อตู้..."
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <SearchableSelect
              label="Division ที่ยืม"
              placeholder="เลือก Division ที่ยืม"
              value={filters.borrowDepartmentId}
              onValueChange={(value) => onFilterChange('borrowDepartmentId', value)}
              options={[
                { value: '', label: 'ทั้งหมด' },
                ...departments.map((dept) => ({
                  value: dept.ID.toString(),
                  label: dept.DepName || '',
                  subLabel: dept.DepName2 || '',
                })),
              ]}
              loading={loadingDepartments}
              onSearch={loadDepartments}
              searchPlaceholder="ค้นหาชื่อ Division ที่ยืม..."
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button onClick={onSearch} disabled={loading}>
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

