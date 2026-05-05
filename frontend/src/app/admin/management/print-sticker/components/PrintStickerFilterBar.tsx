'use client';

import { useCallback, useEffect, useState } from 'react';
import SearchableSelect from '@/app/admin/items/components/SearchableSelect';
import { cabinetApi, cabinetDepartmentApi, departmentApi } from '@/lib/api';

type Department = { ID: number; DepName?: string; DepName2?: string };

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

function mapCabinetFromMapping(m: CabinetDepartmentMapping['cabinet']): Cabinet | null {
  if (!m || typeof m.id !== 'number') return null;
  return {
    id: m.id,
    cabinet_name: m.cabinet_name,
    cabinet_code: m.cabinet_code,
    cabinet_status: m.cabinet_status,
  };
}

type PrintStickerFilterBarProps = {
  departmentId: string;
  cabinetId: string;
  onDepartmentIdChange: (id: string) => void;
  onCabinetIdChange: (id: string) => void;
};

export function PrintStickerFilterBar({
  departmentId,
  cabinetId,
  onDepartmentIdChange,
  onCabinetIdChange,
}: PrintStickerFilterBarProps) {
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
    } catch {
      // ignore
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
          const all = response.data as Cabinet[];
          next = all.filter((cabinet) => {
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
          const unique = new Map<number, Cabinet>();
          mappings
            .filter((mapping) => mapping.status === 'ACTIVE')
            .forEach((mapping) => {
              const mapped = mapCabinetFromMapping(mapping.cabinet);
              if (mapped && !unique.has(mapped.id)) {
                unique.set(mapped.id, mapped);
              }
            });
          next = Array.from(unique.values());
        }
      }
      setCabinets(next);
    } catch {
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
      const exists = cabinets.some((c) => c.id.toString() === cabinetId);
      if (!exists) {
        onCabinetIdChange('');
      }
    }
  }, [cabinets, cabinetId, onCabinetIdChange]);

  return (
    <div className="grid gap-4 border-b border-slate-100 pb-4 md:grid-cols-2">
      <SearchableSelect
        label="Division"
        placeholder="เลือก Division"
        value={departmentId}
        onValueChange={(value) => {
          onDepartmentIdChange(value);
          onCabinetIdChange('');
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
        placeholder={departmentId ? 'เลือกตู้ Cabinet' : 'กรุณาเลือก Division ก่อน'}
        value={cabinetId}
        onValueChange={onCabinetIdChange}
        options={[
          { value: '', label: 'ทั้งหมด' },
          ...cabinets.map((cabinet) => ({
            value: cabinet.id.toString(),
            label: cabinet.cabinet_name || '',
            subLabel: cabinet.cabinet_code || '',
          })),
        ]}
        loading={loadingCabinets}
        onSearch={(kw) => {
          void resolveCabinets(departmentId, kw);
        }}
        searchPlaceholder={departmentId ? 'ค้นหารหัสหรือชื่อตู้…' : 'กรุณาเลือก Division ก่อน'}
        disabled={!departmentId}
      />
    </div>
  );
}
