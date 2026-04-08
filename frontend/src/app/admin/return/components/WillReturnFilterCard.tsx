'use client';

import { useMemo, useState } from 'react';
import { Search, RefreshCw, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePickerBE } from '@/components/ui/date-picker-be';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type {
  DepartmentOption,
  SubDepartmentOption,
} from '@/app/admin/medical-supplies/components/MedicalSuppliesSearchFilters';

interface WillReturnFilterCardProps {
  departmentId: string;
  cabinetId: string;
  subDepartmentId: string;
  itemCode: string;
  startDate: string;
  endDate: string;
  departments: DepartmentOption[];
  cabinets: Array<{ id: number; cabinet_name?: string; cabinet_code?: string }>;
  /** Master แผนกย่อย — กรองตามแผนกหลักที่เลือก (เหมือนหน้าเวชภัณฑ์) */
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

export default function WillReturnFilterCard({
  departmentId,
  cabinetId,
  subDepartmentId,
  itemCode,
  startDate,
  endDate,
  departments,
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
}: WillReturnFilterCardProps) {
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);
  const [subDepartmentSearch, setSubDepartmentSearch] = useState('');
  const [subDepartmentDropdownOpen, setSubDepartmentDropdownOpen] = useState(false);
  const [cabinetSearch, setCabinetSearch] = useState('');
  const [cabinetDropdownOpen, setCabinetDropdownOpen] = useState(false);

  const hasMainDepartment = Boolean(departmentId?.trim()) || departmentLocked;
  const hasSubDepartmentFilter = Boolean(subDepartmentId?.trim());

  const filteredDepartments = useMemo(() => {
    const q = departmentSearch.trim().toLowerCase();
    return departments.filter((d) => {
      if (!q) return true;
      const n1 = (d.DepName || '').toLowerCase();
      const n2 = (d.DepName2 || '').toLowerCase();
      return n1.includes(q) || n2.includes(q);
    });
  }, [departments, departmentSearch]);

  const filteredSubDepartments = useMemo(() => {
    const deptId = departmentId?.trim();
    const q = subDepartmentSearch.trim().toLowerCase();
    return subDepartments.filter((s) => {
      if (s.status === false) return false;
      if (deptId && String(s.department_id) !== deptId) return false;
      if (!q) return true;
      const code = (s.code || '').toLowerCase();
      const name = (s.name || '').toLowerCase();
      return code.includes(q) || name.includes(q);
    });
  }, [subDepartments, departmentId, subDepartmentSearch]);

  const filteredCabinets = useMemo(() => {
    const q = cabinetSearch.trim().toLowerCase();
    return cabinets.filter((c) => {
      if (!q) return true;
      const code = (c.cabinet_code || '').toLowerCase();
      const name = (c.cabinet_name || '').toLowerCase();
      const idStr = String(c.id);
      return code.includes(q) || name.includes(q) || idStr.includes(q);
    });
  }, [cabinets, cabinetSearch]);

  const lockedDeptLabel =
    departments.find((d) => String(d.ID) === departmentId)?.DepName ||
    departments.find((d) => String(d.ID) === departmentId)?.DepName2 ||
    (departmentId ? `แผนก ${departmentId}` : 'ไม่ระบุแผนก');

  const divisionTriggerLabel = () => {
    if (!departmentId) return 'เลือก Division...';
    const d = departments.find((x) => String(x.ID) === departmentId);
    return d?.DepName || d?.DepName2 || `Division ${departmentId}`;
  };

  const subDepartmentTriggerLabel = () => {
    const idStr = subDepartmentId?.trim();
    if (!idStr) return 'เลือกแผนก ...';
    const id = parseInt(idStr, 10);
    if (Number.isNaN(id)) return idStr;
    const sub = subDepartments.find((s) => s.id === id);
    if (sub) {
      const n = sub.name?.trim();
      return n ? `${sub.code} · ${n}` : sub.code;
    }
    return idStr;
  };

  const cabinetTriggerLabel = () => {
    if (!cabinetId?.trim()) {
      if (hasSubDepartmentFilter && cabinets.length === 0) return 'แผนกนี้ยังไม่มีตู้ที่ผูก';
      if (departmentId && cabinets.length === 0) return 'ไม่มีตู้ในแผนกนี้';
      return 'เลือกตู้ Cabinet...';
    }
    const id = parseInt(cabinetId, 10);
    const c = cabinets.find((x) => x.id === id);
    if (c) return c.cabinet_code || c.cabinet_name || `ตู้ ${c.id}`;
    return `ตู้ ${cabinetId}`;
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
              value={itemCode}
              onChange={(e) => onItemCodeChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              className="w-full"
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
              <Label>Division</Label>
              {departmentLocked ? (
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                  <span className="truncate">{lockedDeptLabel}</span>
                </div>
              ) : (
                <DropdownMenu open={departmentDropdownOpen} onOpenChange={setDepartmentDropdownOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-10 w-full justify-between font-normal" type="button">
                      <span className="truncate text-left">{divisionTriggerLabel()}</span>
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[12rem] p-1"
                  >
                    <div className="px-2 pb-2">
                      <Input
                        placeholder="ค้นหา Division..."
                        value={departmentSearch}
                        onChange={(e) => setDepartmentSearch(e.target.value)}
                        className="h-8"
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="max-h-60 overflow-auto">
                      <button
                        type="button"
                        className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                        onClick={() => {
                          onDepartmentChange('');
                          onCabinetChange('');
                          onSubDepartmentChange('');
                          setDepartmentDropdownOpen(false);
                          setDepartmentSearch('');
                        }}
                      >
                        -- ทุก Division --
                      </button>
                      {filteredDepartments.map((dept) => (
                        <button
                          key={dept.ID}
                          type="button"
                          className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                          onClick={() => {
                            onDepartmentChange(String(dept.ID));
                            onCabinetChange('');
                            onSubDepartmentChange('');
                            setDepartmentDropdownOpen(false);
                            setDepartmentSearch('');
                          }}
                        >
                          {dept.DepName || dept.DepName2 || `แผนก ${dept.ID}`}
                        </button>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <div className="min-w-0 space-y-2">
              <Label>แผนก</Label>
              <DropdownMenu
                open={subDepartmentDropdownOpen}
                onOpenChange={setSubDepartmentDropdownOpen}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 w-full justify-between font-normal"
                    type="button"
                    disabled={!hasMainDepartment}
                  >
                    <span className="truncate text-left">{subDepartmentTriggerLabel()}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[12rem] p-1"
                >
                  <div className="px-2 pb-2">
                    <Input
                      placeholder="ค้นหารหัสหรือชื่อแผนก ..."
                      value={subDepartmentSearch}
                      onChange={(e) => setSubDepartmentSearch(e.target.value)}
                      className="h-8"
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="max-h-60 overflow-auto">
                    <button
                      type="button"
                      className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                      onClick={() => {
                        onSubDepartmentChange('');
                        setSubDepartmentDropdownOpen(false);
                        setSubDepartmentSearch('');
                      }}
                    >
                      -- ทุกแผนก --
                    </button>
                    {!hasMainDepartment ? (
                      <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                        เลือกแผนก (Division) ก่อน
                      </div>
                    ) : filteredSubDepartments.length === 0 ? (
                      <div className="px-2 py-3 text-center text-xs text-muted-foreground">ไม่พบรายการ</div>
                    ) : (
                      filteredSubDepartments.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                          onClick={() => {
                            onSubDepartmentChange(String(sub.id));
                            setSubDepartmentDropdownOpen(false);
                            setSubDepartmentSearch('');
                          }}
                        >
                          <span className="font-mono text-xs">{sub.code}</span>
                          {sub.name ? (
                            <span className="text-muted-foreground"> · {sub.name}</span>
                          ) : null}
                        </button>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="min-w-0 space-y-2">
            <Label>ตู้ Cabinet</Label>
            {!hasMainDepartment ? (
              <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                เลือก Division (แผนกหลัก) ก่อน
              </div>
            ) : (
              <DropdownMenu open={cabinetDropdownOpen} onOpenChange={setCabinetDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 w-full justify-between font-normal"
                    type="button"
                  >
                    <span className="truncate text-left">{cabinetTriggerLabel()}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[12rem] p-1"
                >
                  <div className="px-2 pb-2">
                    <Input
                      placeholder="ค้นหารหัสหรือชื่อตู้ ..."
                      value={cabinetSearch}
                      onChange={(e) => setCabinetSearch(e.target.value)}
                      className="h-8"
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="max-h-60 overflow-auto">
                    <button
                      type="button"
                      className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                      onClick={() => {
                        onCabinetChange('');
                        setCabinetDropdownOpen(false);
                        setCabinetSearch('');
                      }}
                    >
                      -- ทุกตู้ --
                    </button>
                    {cabinets.length === 0 ? (
                      <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                        {hasSubDepartmentFilter
                          ? 'แผนกนี้ยังไม่มีตู้ที่ผูก'
                          : departmentId
                            ? 'ไม่มีตู้ในแผนกนี้'
                            : 'ไม่พบตู้'}
                      </div>
                    ) : filteredCabinets.length === 0 ? (
                      <div className="px-2 py-3 text-center text-xs text-muted-foreground">ไม่พบรายการ</div>
                    ) : (
                      filteredCabinets.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                          onClick={() => {
                            onCabinetChange(String(c.id));
                            setCabinetDropdownOpen(false);
                            setCabinetSearch('');
                          }}
                        >
                          <span className="font-mono text-xs">{c.cabinet_code || String(c.id)}</span>
                          {c.cabinet_name ? (
                            <span className="text-muted-foreground"> · {c.cabinet_name}</span>
                          ) : null}
                        </button>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button onClick={onSearch} disabled={loading}>
            <Search className="mr-2 h-4 w-4" />
            ค้นหา
          </Button>
          <Button onClick={onReset} variant="outline">
            ล้าง
          </Button>
          {onRefresh && (
            <Button onClick={onRefresh} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              รีเฟรช
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
