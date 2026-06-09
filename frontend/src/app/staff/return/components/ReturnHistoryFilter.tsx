'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePickerBE } from '@/components/ui/date-picker-be';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchableSelect from '@/app/admin/items/components/SearchableSelect';
import {
  clampDepartmentIdString,
  fetchStaffDepartmentsForFilter,
  getStaffAllowedDepartmentIds,
} from '@/lib/staffDepartmentScope';
import type { SubDepartmentOption } from '@/app/admin/medical-supplies/components/MedicalSuppliesSearchFilters';
import { cn } from '@/lib/utils';

const fieldInputClass = 'bg-white';

export type DepartmentOption = { ID: number; DepName?: string | null; DepName2?: string | null };

function buildRoleScopeDivisionSummary(depts: DepartmentOption[]): string {
  const names = depts.map((d) => (d.DepName || '').trim()).filter(Boolean);
  if (names.length === 0) return '';
  if (names.length <= 5) return names.join(', ');
  return `${names.slice(0, 5).join(', ')} … (+${names.length - 5})`;
}

interface ReturnHistoryFilterProps {
  dateFrom: string;
  dateTo: string;
  reason: string;
  departmentCode: string;
  subDepartmentId: string;
  cabinetId: string;
  itemKeyword: string;
  subDepartments: SubDepartmentOption[];
  cabinets: Array<{ id: number; cabinet_name?: string; cabinet_code?: string }>;
  loading: boolean;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onReasonChange: (reason: string) => void;
  onDepartmentChange: (value: string) => void;
  onSubDepartmentChange: (value: string) => void;
  onCabinetChange: (value: string) => void;
  onItemKeywordChange: (value: string) => void;
  onSearch: () => void;
  onReset: () => void;
  onRefresh?: () => void;
}

export default function ReturnHistoryFilter({
  dateFrom,
  dateTo,
  reason,
  departmentCode,
  subDepartmentId,
  cabinetId,
  itemKeyword,
  subDepartments,
  cabinets,
  loading,
  onDateFromChange,
  onDateToChange,
  onReasonChange,
  onDepartmentChange,
  onSubDepartmentChange,
  onCabinetChange,
  onItemKeywordChange,
  onSearch,
  onReset,
  onRefresh,
}: ReturnHistoryFilterProps) {
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
    const deptId = departmentCode?.trim();
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
  }, [subDepartments, departmentCode]);

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
      if (cancelled) return;
      const nextDept = clampDepartmentIdString(departmentCode, allowed, '');
      if (nextDept !== departmentCode) {
        onDepartmentChange(nextDept);
        onCabinetChange('');
        onSubDepartmentChange('');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadDepartments]);

  const handleSearchClick = () => {
    const allowed = allowedDepartmentIdsRef.current;
    const roleScopeAll =
      Array.isArray(allowed) && allowed.length > 0 && !departmentCode?.trim();
    if (!departmentCode?.trim() && !roleScopeAll) {
      toast.error('กรุณาเลือก Division ก่อนค้นหา (หรือเลือกทั้งหมดเฉพาะเมื่อ role จำกัดแผนก)');
      return;
    }
    onSearch();
  };

  const hasMainDepartment = Boolean(departmentCode?.trim());
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
              value={itemKeyword}
              onChange={(e) => onItemKeywordChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
              className={cn('w-full', fieldInputClass)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">วันที่เริ่มต้น</label>
              <DatePickerBE
                value={dateFrom}
                onChange={onDateFromChange}
                placeholder="วว/ดด/ปปปป (พ.ศ.)"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">วันที่สิ้นสุด</label>
              <DatePickerBE
                value={dateTo}
                onChange={onDateToChange}
                placeholder="วว/ดด/ปปปป (พ.ศ.)"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SearchableSelect
              label="Division"
              placeholder={
                canPickAllRoleDepartments
                  ? 'เลือก Division หรือทั้งหมด (ตาม role)'
                  : 'เลือก Division (บังคับ)'
              }
              required={!canPickAllRoleDepartments}
              value={departmentCode}
              initialDisplay={
                canPickAllRoleDepartments && !departmentCode?.trim()
                  ? {
                      label: 'ทั้งหมด',
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

            <SearchableSelect
              label="แผนก"
              placeholder={
                departmentCode?.trim()
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

          <div className="space-y-2">
            <Label htmlFor="staff-history-reason">สาเหตุ</Label>
            <Select value={reason || 'ALL'} onValueChange={onReasonChange}>
              <SelectTrigger id="staff-history-reason" className={cn('h-10 w-full', fieldInputClass)}>
                <SelectValue placeholder="ทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ทั้งหมด</SelectItem>
                <SelectItem value="OTHER">อื่นๆ</SelectItem>
                <SelectItem value="UNWRAPPED_UNUSED">อื่นๆ (ข้อมูลเก่า)</SelectItem>
                <SelectItem value="EXPIRED">อุปกรณ์หมดอายุ</SelectItem>
                <SelectItem value="CONTAMINATED">อุปกรณ์มีการปนเปื้อน</SelectItem>
                <SelectItem value="DAMAGED">อุปกรณ์ชำรุด</SelectItem>
              </SelectContent>
            </Select>
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
            <Button onClick={onRefresh} variant="outline" type="button" disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              รีเฟรช
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
