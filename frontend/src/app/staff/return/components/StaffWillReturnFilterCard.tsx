'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePickerBE } from '@/components/ui/date-picker-be';
import SearchableSelect from '@/app/admin/items/components/SearchableSelect';
import { cn } from '@/lib/utils';
import {
  clampDepartmentIdString,
  fetchStaffDepartmentsForFilter,
  getStaffAllowedDepartmentIds,
} from '@/lib/staffDepartmentScope';
import type { SubDepartmentOption } from '@/app/admin/medical-supplies/components/MedicalSuppliesSearchFilters';

const fieldInputClass = 'bg-white';

export type DepartmentOption = { ID: number; DepName?: string | null; DepName2?: string | null };

function buildRoleScopeDivisionSummary(depts: DepartmentOption[]): string {
  const names = depts.map((d) => (d.DepName || '').trim()).filter(Boolean);
  if (names.length === 0) return '';
  if (names.length <= 5) return names.join(', ');
  return `${names.slice(0, 5).join(', ')} … (+${names.length - 5})`;
}

interface StaffWillReturnFilterCardProps {
  departmentId: string;
  cabinetId: string;
  subDepartmentId: string;
  itemCode: string;
  startDate: string;
  endDate: string;
  cabinets: Array<{ id: number; cabinet_name?: string; cabinet_code?: string }>;
  subDepartments: SubDepartmentOption[];
  onDepartmentChange: (value: string) => void;
  onCabinetChange: (value: string) => void;
  onSubDepartmentChange: (value: string) => void;
  onItemCodeChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onSearch: () => void;
  onReset: () => void;
  onRefresh?: () => void;
  loading: boolean;
  departmentLocked?: boolean;
}

export default function StaffWillReturnFilterCard({
  departmentId,
  cabinetId,
  subDepartmentId,
  itemCode,
  startDate,
  endDate,
  cabinets,
  subDepartments,
  onDepartmentChange,
  onCabinetChange,
  onSubDepartmentChange,
  onItemCodeChange,
  onStartDateChange,
  onEndDateChange,
  onSearch,
  onReset,
  onRefresh,
  loading,
  departmentLocked = false,
}: StaffWillReturnFilterCardProps) {
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
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
    const deptId = departmentId?.trim();
    if (!deptId) {
      return [{ value: '', label: 'ทั้งหมด' }];
    }
    const rows = subDepartments.filter(
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
  }, [subDepartments, departmentId]);

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
      if (cancelled || departmentLocked) return;
      const nextDept = clampDepartmentIdString(departmentId, allowed, '');
      if (nextDept !== departmentId) {
        onDepartmentChange(nextDept);
        onCabinetChange('');
        onSubDepartmentChange('');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount + clamp
  }, [departmentLocked, loadDepartments]);

  const lockedDeptLabel =
    departments.find((d) => String(d.ID) === departmentId)?.DepName ||
    departments.find((d) => String(d.ID) === departmentId)?.DepName2 ||
    (departmentId ? `แผนก ${departmentId}` : 'ไม่ระบุแผนก');

  const handleSearchClick = () => {
    if (!departmentLocked) {
      const allowed = allowedDepartmentIdsRef.current;
      const roleScopeAll =
        Array.isArray(allowed) && allowed.length > 0 && !departmentId?.trim();
      if (!departmentId?.trim() && !roleScopeAll) {
        toast.error('กรุณาเลือก Division ก่อนค้นหา (หรือเลือกทั้งหมดเฉพาะเมื่อ role จำกัดแผนก)');
        return;
      }
    }
    onSearch();
  };

  const hasMainDepartment = Boolean(departmentId?.trim()) || departmentLocked;
  const cabinetPlaceholder = !hasMainDepartment
    ? 'เลือก Division (แผนกหลัก) ก่อน'
    : cabinets.length === 0
      ? 'ไม่มีตู้ในแผนกนี้'
      : 'เลือกตู้หรือทุกตู้';

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
              value={itemCode}
              onChange={(e) => onItemCodeChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
              className={cn('w-full', fieldInputClass)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">วันที่เริ่มต้น</label>
              <DatePickerBE
                value={startDate}
                onChange={onStartDateChange}
                placeholder="วว/ดด/ปปปป (พ.ศ.)"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">วันที่สิ้นสุด</label>
              <DatePickerBE
                value={endDate}
                onChange={onEndDateChange}
                placeholder="วว/ดด/ปปปป (พ.ศ.)"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="min-w-0 space-y-2">
              {departmentLocked ? (
                <div className="space-y-2">
                  <Label>Division</Label>
                  <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                    <span className="truncate">{lockedDeptLabel}</span>
                  </div>
                </div>
              ) : (
                <SearchableSelect
                  label="Division"
                  placeholder={
                    canPickAllRoleDepartments
                      ? 'เลือก Division หรือทั้งหมด (ตาม role)'
                      : 'เลือก Division (บังคับ)'
                  }
                  required={!canPickAllRoleDepartments}
                  value={departmentId}
                  initialDisplay={
                    canPickAllRoleDepartments && !departmentId?.trim()
                      ? {
                          label: 'ทั้งหมด (ทุกแผนกที่ role อนุญาต)',
                          ...(roleScopeDivisionSummary ? { subLabel: roleScopeDivisionSummary } : {}),
                        }
                      : undefined
                  }
                  onValueChange={(value) => {
                    onDepartmentChange(value);
                    onCabinetChange('');
                    onSubDepartmentChange('');
                  }}
                  options={divisionSelectOptions}
                  loading={loadingDepartments}
                  onSearch={loadDepartments}
                  searchPlaceholder="ค้นหาชื่อ Division..."
                />
              )}
            </div>

            <div className="min-w-0 space-y-2">
              <SearchableSelect
                label="แผนก"
                placeholder={
                  departmentId?.trim()
                    ? 'เลือกแผนก ...'
                    : 'เลือก Division เฉพาะก่อน ถ้าต้องการกรองแผนกย่อย'
                }
                value={subDepartmentId}
                onValueChange={onSubDepartmentChange}
                options={subDepartmentOptions}
                disabled={!hasMainDepartment}
                searchPlaceholder="ค้นหารหัสหรือชื่อแผนก ..."
              />
            </div>
          </div>

          <div className="min-w-0 space-y-2">
            {!hasMainDepartment ? (
              <>
                <Label>ตู้ Cabinet</Label>
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                  เลือก Division (แผนกหลัก) ก่อน
                </div>
              </>
            ) : (
              <SearchableSelect
                label="ตู้ Cabinet"
                placeholder={cabinetPlaceholder}
                value={cabinetId}
                onValueChange={onCabinetChange}
                options={cabinetSelectOptions}
                disabled={cabinets.length === 0}
                searchPlaceholder="ค้นหารหัสหรือชื่อตู้ ..."
              />
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={handleSearchClick} disabled={loading}>
            <Search className="mr-2 h-4 w-4" />
            ค้นหา
          </Button>
          <Button onClick={onReset} variant="outline" type="button">
            ล้าง
          </Button>
          {onRefresh && (
            <Button onClick={onRefresh} variant="outline" type="button">
              <RefreshCw className="mr-2 h-4 w-4" />
              รีเฟรช
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
