'use client';

import { Search, RefreshCw, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePickerBE } from '@/components/ui/date-picker-be';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type DepartmentOption = { ID: number; DepName: string | null; DepName2: string | null };

/** ฟิลด์ที่ฟอร์มค้นหานี้แก้ไขได้ */
export type MedicalSuppliesSearchFilterFields = {
  startDate: string;
  endDate: string;
  itemName: string;
  departmentCode: string;
  usageType: string;
  patientHN: string;
  patientEN: string;
};

interface MedicalSuppliesSearchFiltersProps {
  formFilters: MedicalSuppliesSearchFilterFields;
  onPatchFormFilters: (patch: Partial<MedicalSuppliesSearchFilterFields>) => void;
  departments: DepartmentOption[];
  departmentSearch: string;
  onDepartmentSearchChange: (value: string) => void;
  departmentDropdownOpen: boolean;
  onDepartmentDropdownOpenChange: (open: boolean) => void;
  loading: boolean;
  onSearch: () => void;
  onReset: () => void;
  onReload: () => void;
}

export default function MedicalSuppliesSearchFilters({
  formFilters,
  onPatchFormFilters,
  departments,
  departmentSearch,
  onDepartmentSearchChange,
  departmentDropdownOpen,
  onDepartmentDropdownOpenChange,
  loading,
  onSearch,
  onReset,
  onReload,
}: MedicalSuppliesSearchFiltersProps) {
  const patch = onPatchFormFilters;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 shadow-sm w-full min-w-0">
      <div className="font-bold text-base sm:text-lg mb-4">วันที่เบิกอุปกรณ์ใช้กับคนไข้</div>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 min-w-0">
            <Label htmlFor="startDate">วันที่เริ่มต้น</Label>
            <DatePickerBE
              id="startDate"
              value={formFilters.startDate}
              onChange={(v) => patch({ startDate: v })}
              placeholder="วว/ดด/ปปปป (พ.ศ.)"
            />
          </div>
          <div className="space-y-2 min-w-0">
            <Label htmlFor="endDate">วันที่สิ้นสุด</Label>
            <DatePickerBE
              id="endDate"
              value={formFilters.endDate}
              onChange={(v) => patch({ endDate: v })}
              placeholder="วว/ดด/ปปปป (พ.ศ.)"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 min-w-0">
            <Label htmlFor="itemName">ค้นหาชื่ออุปกรณ์</Label>
            <Input
              id="itemName"
              placeholder="กรอกชื่ออุปกรณ์..."
              value={formFilters.itemName}
              onChange={(e) => patch({ itemName: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            />
          </div>
          <div className="space-y-2 min-w-0">
            <Label>แผนก</Label>
            <DropdownMenu open={departmentDropdownOpen} onOpenChange={onDepartmentDropdownOpenChange}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between font-normal" type="button">
                  <span className="truncate">
                    {formFilters.departmentCode
                      ? departments.find((d) => String(d.ID) === formFilters.departmentCode)?.DepName ||
                        departments.find((d) => String(d.ID) === formFilters.departmentCode)?.DepName2 ||
                        `แผนก ${formFilters.departmentCode}`
                      : 'เลือกแผนก...'}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[12rem] p-1"
              >
                <div className="px-2 pb-2">
                  <Input
                    placeholder="ค้นหาแผนก..."
                    value={departmentSearch}
                    onChange={(e) => onDepartmentSearchChange(e.target.value)}
                    className="h-8"
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="max-h-60 overflow-auto">
                  <button
                    type="button"
                    className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      patch({ departmentCode: '' });
                      onDepartmentDropdownOpenChange(false);
                      onDepartmentSearchChange('');
                    }}
                  >
                    -- ทุกแผนก --
                  </button>
                  {departments
                    .filter(
                      (d) =>
                        !departmentSearch.trim() ||
                        d.DepName?.toLowerCase().includes(departmentSearch.toLowerCase()) ||
                        d.DepName2?.toLowerCase().includes(departmentSearch.toLowerCase()),
                    )
                    .map((dept) => (
                      <button
                        key={dept.ID}
                        type="button"
                        className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                        onClick={() => {
                          patch({ departmentCode: String(dept.ID) });
                          onDepartmentDropdownOpenChange(false);
                          onDepartmentSearchChange('');
                        }}
                      >
                        {dept.DepName || dept.DepName2 || `แผนก ${dept.ID}`}
                      </button>
                    ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2 min-w-0">
            <Label>ประเภทผู้ป่วย</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={formFilters.usageType}
              onChange={(e) => patch({ usageType: e.target.value })}
            >
              <option value="">-- ทั้งหมด --</option>
              <option value="OPD">ผู้ป่วยนอก (OPD)</option>
              <option value="IPD">ผู้ป่วยใน (IPD)</option>
            </select>
          </div>
          <div className="space-y-2 min-w-0">
            <Label htmlFor="patientHN">HN</Label>
            <Input
              id="patientHN"
              placeholder="กรอกเลข HN..."
              value={formFilters.patientHN}
              onChange={(e) => patch({ patientHN: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            />
          </div>
          <div className="space-y-2 min-w-0">
            <Label htmlFor="patientEN">EN</Label>
            <Input
              id="patientEN"
              placeholder="กรอกเลข EN..."
              value={formFilters.patientEN}
              onChange={(e) => patch({ patientEN: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mt-4">
        <Button onClick={onSearch} disabled={loading} className="w-full sm:w-auto">
          <Search className="h-4 w-4 mr-2 shrink-0" />
          ค้นหา
        </Button>
        <Button onClick={onReset} variant="outline" disabled={loading} className="w-full sm:w-auto">
          <RefreshCw className="h-4 w-4 mr-2 shrink-0" />
          รีเซ็ต
        </Button>
        <Button onClick={onReload} variant="outline" disabled={loading} className="w-full sm:w-auto">
          <RefreshCw className={`h-4 w-4 mr-2 shrink-0 ${loading ? 'animate-spin' : ''}`} />
          โหลดใหม่
        </Button>
      </div>
    </div>
  );
}
