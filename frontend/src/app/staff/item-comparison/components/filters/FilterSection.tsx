import { Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePickerBE } from '@/components/ui/date-picker-be';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SearchableSelect from '@/app/admin/items/components/SearchableSelect';
import {
  clampDepartmentIdString,
  fetchStaffDepartmentsForFilter,
  getStaffAllowedDepartmentIds,
} from '@/lib/staffDepartmentScope';
import { staffMedicalSupplySubDepartmentsApi } from '@/lib/staffApi/medicalSupplySubDepartmentsApi';
import type { FilterState } from '../../types';

export type DepartmentOption = { ID: number; DepName?: string | null; DepName2?: string | null };

export type SubDepartmentOption = {
  id: number;
  department_id: number;
  code: string;
  name: string | null;
  status?: boolean;
};

interface FilterSectionProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  onSearch: (keyword?: string) => void;
  onClear: () => void;
  onRefresh: () => void;
  itemTypes: Array<{ id: string; name: string }>;
  cabinets: Array<{ id: number; cabinet_name?: string; cabinet_code?: string }>;
  loading: boolean;
  items?: unknown[];
  departmentDisabled?: boolean;
}

function buildRoleScopeDivisionSummary(depts: DepartmentOption[]): string {
  const names = depts.map((d) => (d.DepName || '').trim()).filter(Boolean);
  if (names.length === 0) return '';
  if (names.length <= 5) return names.join(', ');
  return `${names.slice(0, 5).join(', ')} … (+${names.length - 5})`;
}

export function FilterSection({
  filters,
  onFilterChange,
  onSearch,
  onClear,
  onRefresh,
  itemTypes,
  cabinets,
  loading,
  departmentDisabled = false,
}: FilterSectionProps) {
  const [searchInput, setSearchInput] = useState('');
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [subDepartmentsMaster, setSubDepartmentsMaster] = useState<SubDepartmentOption[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const allowedDepartmentIdsRef = useRef<number[] | null | undefined>(undefined);
  const [canPickAllRoleDepartments, setCanPickAllRoleDepartments] = useState(false);

  const roleScopeDivisionSummary = useMemo(
    () => (canPickAllRoleDepartments ? buildRoleScopeDivisionSummary(departments) : ''),
    [canPickAllRoleDepartments, departments],
  );

  const divisionSelectOptions = useMemo(
    () => [
      ...(canPickAllRoleDepartments
        ? [
          {
            value: '',
            label: 'ทั้งหมด',
            ...(roleScopeDivisionSummary ? { subLabel: roleScopeDivisionSummary } : {}),
          },
        ]
        : []),
      ...departments.map((dept) => ({
        value: String(dept.ID),
        label: dept.DepName || '',
        subLabel: dept.DepName2 || '',
      })),
    ],
    [canPickAllRoleDepartments, departments, roleScopeDivisionSummary],
  );

  const subDepartmentOptions = useMemo(() => {
    const deptId = filters.departmentCode?.trim();
    if (!deptId) {
      return [{ value: '', label: 'ทั้งหมด' }];
    }
    const rows = subDepartmentsMaster.filter(
      (s) => s.status !== false && String(s.department_id) === deptId,
    );
    return [
      { value: '', label: 'ทั้งหมด' },
      ...rows.map((s) => ({
        value: String(s.id),
        label: s.code,
        subLabel: s.name?.trim() || '',
      })),
    ];
  }, [subDepartmentsMaster, filters.departmentCode]);

  const cabinetSelectOptions = useMemo(() => {
    const opts: { value: string; label: string; subLabel?: string }[] = [];
    if (cabinets.length > 0) {
      opts.push({ value: '', label: '-- ทุกตู้ --' });
    }
    for (const c of cabinets) {
      opts.push({
        value: String(c.id),
        label: c.cabinet_code || String(c.id),
        subLabel: c.cabinet_name || '',
      });
    }
    return opts;
  }, [cabinets]);

  const loadDepartments = useCallback(async (keyword?: string) => {
    try {
      setLoadingDepartments(true);
      let allowed = allowedDepartmentIdsRef.current;
      if (allowed === undefined) {
        allowed = await getStaffAllowedDepartmentIds();
        allowedDepartmentIdsRef.current = allowed;
      }
      setCanPickAllRoleDepartments(Array.isArray(allowed) && allowed.length > 0);
      const list = await fetchStaffDepartmentsForFilter({
        keyword,
        page: 1,
        limit: 200,
        allowedDepartmentIds: allowed,
      });
      setDepartments(list as DepartmentOption[]);
    } catch (e) {
      console.error('Failed to load departments:', e);
    } finally {
      setLoadingDepartments(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const allowed = await getStaffAllowedDepartmentIds();
      if (cancelled) return;
      allowedDepartmentIdsRef.current = allowed;
      setCanPickAllRoleDepartments(Array.isArray(allowed) && allowed.length > 0);
      await loadDepartments();
      if (cancelled || departmentDisabled) return;
      const nextDept = clampDepartmentIdString(filters.departmentCode, allowed, '');
      if (nextDept !== filters.departmentCode) {
        onFilterChange('departmentCode', nextDept);
        onFilterChange('subDepartmentId', '');
        onFilterChange('cabinetId', '');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount + clamp
  }, [departmentDisabled, loadDepartments]);

  useEffect(() => {
    (async () => {
      try {
        const allowed = await getStaffAllowedDepartmentIds();
        const res = await staffMedicalSupplySubDepartmentsApi.getAll();
        let raw = res.data ?? [];
        if (allowed != null && Array.isArray(allowed) && allowed.length > 0) {
          const allowSet = new Set(allowed);
          raw = raw.filter((s) => allowSet.has(s.department_id));
        } else if (allowed != null && Array.isArray(allowed) && allowed.length === 0) {
          raw = [];
        }
        setSubDepartmentsMaster(
          raw.map((s) => ({
            id: s.id,
            department_id: s.department_id,
            code: s.code,
            name: s.name ?? null,
            status: s.status,
          })),
        );
      } catch {
        setSubDepartmentsMaster([]);
      }
    })();
  }, []);

  const lockedDeptLabel =
    departments.find((d) => String(d.ID) === filters.departmentCode)?.DepName ||
    departments.find((d) => String(d.ID) === filters.departmentCode)?.DepName2 ||
    (filters.departmentCode ? `แผนก ${filters.departmentCode}` : 'ไม่ระบุแผนก');

  const hasMainDepartment =
    departmentDisabled ||
    Boolean(filters.departmentCode?.trim()) ||
    (canPickAllRoleDepartments && !filters.departmentCode?.trim());

  const cabinetPlaceholder = !hasMainDepartment
    ? 'เลือก Division (แผนกหลัก) ก่อน'
    : cabinets.length === 0
      ? 'ไม่มีตู้ในแผนกนี้'
      : 'เลือกตู้หรือทุกตู้';

  const submitSearch = () => {
    if (!departmentDisabled) {
      const allowed = allowedDepartmentIdsRef.current;
      const roleScopeAll =
        Array.isArray(allowed) && allowed.length > 0 && !filters.departmentCode?.trim();
      if (!filters.departmentCode?.trim() && !roleScopeAll) {
        toast.error('กรุณาเลือก Division ก่อนค้นหา (หรือเลือกทั้งหมดเฉพาะเมื่อ role จำกัดแผนก)');
        return;
      }
    }
    const keyword = searchInput.trim();
    onFilterChange('searchItemCode', keyword);
    if (keyword) {
      onSearch(keyword);
    } else {
      onSearch();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>กรองข้อมูล</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">รหัส/ชื่อเวชภัณฑ์</label>
            <Input
              placeholder="ค้นหา..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">ประเภทเวชภัณฑ์</label>
              <Select value={filters.itemTypeFilter} onValueChange={(value) => onFilterChange('itemTypeFilter', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="ทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  {itemTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="min-w-0 space-y-2">
              {departmentDisabled ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Division</label>
                  <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                    <span className="truncate">{lockedDeptLabel}</span>
                  </div>
                </div>
              ) : (
                <SearchableSelect
                  label="Division"
                  placeholder={
                    canPickAllRoleDepartments
                      ? 'เลือก Division'
                      : 'เลือก Division'
                  }
                  required={!canPickAllRoleDepartments}
                  value={filters.departmentCode}
                  initialDisplay={
                    canPickAllRoleDepartments && !filters.departmentCode?.trim()
                      ? {
                        label: 'ทั้งหมด',
                        ...(roleScopeDivisionSummary ? { subLabel: roleScopeDivisionSummary } : {}),
                      }
                      : undefined
                  }
                  onValueChange={(value) => {
                    onFilterChange('departmentCode', value);
                    onFilterChange('subDepartmentId', '');
                    onFilterChange('cabinetId', '');
                  }}
                  options={divisionSelectOptions}
                  loading={loadingDepartments}
                  onSearch={loadDepartments}
                  searchPlaceholder="ค้นหาชื่อ Division..."
                />
              )}
            </div>

            <SearchableSelect
              label="แผนก"
              placeholder={
                filters.departmentCode?.trim()
                  ? 'เลือกแผนก ...'
                  : 'เลือก Division เฉพาะก่อน ถ้าต้องการกรองแผนกย่อย'
              }
              value={filters.subDepartmentId}
              onValueChange={(value) => {
                onFilterChange('subDepartmentId', value);
                onFilterChange('cabinetId', '');
              }}
              options={subDepartmentOptions}
              disabled={departmentDisabled || !filters.departmentCode?.trim()}
              searchPlaceholder="ค้นหารหัสหรือชื่อแผนก ..."
            />
          </div>

          <div className="min-w-0 space-y-2">
            {!hasMainDepartment ? (
              <>
                <label className="text-sm font-medium text-gray-700">ตู้ Cabinet</label>
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                  เลือก Division (แผนกหลัก) ก่อน
                </div>
              </>
            ) : (
              <SearchableSelect
                label="ตู้ Cabinet"
                placeholder={cabinetPlaceholder}
                value={filters.cabinetId}
                onValueChange={(value) => onFilterChange('cabinetId', value)}
                options={cabinetSelectOptions}
                disabled={cabinets.length === 0}
                searchPlaceholder="ค้นหารหัสหรือชื่อตู้ ..."
              />
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={submitSearch} disabled={loading}>
            <Search className="mr-2 h-4 w-4" />
            ค้นหา
          </Button>
          <Button
            onClick={() => {
              setSearchInput('');
              onClear();
            }}
            variant="outline"
            type="button"
          >
            ล้าง
          </Button>
          <Button onClick={onRefresh} variant="outline" type="button" disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
