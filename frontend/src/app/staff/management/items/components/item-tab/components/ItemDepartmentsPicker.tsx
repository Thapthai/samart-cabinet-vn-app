'use client';

import SearchableSelect from './SearchableSelect';
import {
  buildDepartmentSelectOptions,
  departmentInitialDisplay,
  type DeptRow,
} from './itemHelpers';

interface ItemDepartmentsPickerProps {
  departments: DeptRow[];
  loading?: boolean;
  onSearch?: (keyword?: string) => void;
  /** ค่าของแต่ละช่อง (ความยาว 3) — '' = ไม่ระบุ */
  values: string[];
  onChange: (index: number, value: string) => void;
}

const SLOTS = [0, 1, 2];

export default function ItemDepartmentsPicker({
  departments,
  loading,
  onSearch,
  values,
  onChange,
}: ItemDepartmentsPickerProps) {
  const baseOptions = buildDepartmentSelectOptions(departments, false);

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <div>
        <p className="text-sm font-medium text-gray-900">แผนกที่ใช้ Item นี้ (สูงสุด 3 แผนก)</p>
        <p className="text-xs text-muted-foreground">
          แสดงเฉพาะแผนกที่คุณสังกัด · 1 Item ใช้ได้สูงสุด 3 แผนก — เว้นว่างช่องที่ไม่ต้องการได้
        </p>
      </div>
      {SLOTS.map((i) => {
        const value = values[i] ?? '';
        const id = value ? parseInt(value, 10) : 0;
        // ซ่อนแผนกที่ถูกเลือกในช่องอื่นแล้ว เพื่อกันเลือกซ้ำ
        const chosenElsewhere = new Set(
          values.filter((_, idx) => idx !== i).filter((v) => v && v.trim() !== ''),
        );
        const options = baseOptions.filter((o) => !chosenElsewhere.has(o.value));
        return (
          <SearchableSelect
            key={i}
            positionMode="floating"
            label={`แผนกที่ ${i + 1}`}
            placeholder="เลือกแผนก (เว้นว่างได้)"
            value={value}
            onValueChange={(v) => onChange(i, v)}
            options={options}
            loading={loading}
            onSearch={onSearch}
            searchPlaceholder="ค้นหาชื่อแผนก..."
            initialDisplay={id > 0 ? departmentInitialDisplay(id, departments) : undefined}
            allowClear
          />
        );
      })}
    </div>
  );
}
