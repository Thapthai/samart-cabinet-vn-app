'use client';

import { useState, useCallback, useMemo } from 'react';
import { staffUserApi } from '@/lib/api';
import SearchableSelect from '@/app/admin/items/components/SearchableSelect';
import type { StaffEmployeeOption } from './types';

interface StaffEmployeePickerProps {
  value: string | null | undefined;
  onChange: (emp_code: string | null) => void;
  exceptUserId?: number;
  disabled?: boolean;
  /** ใช้ตอนแก้ไข — แสดงใน trigger ก่อนรายการจาก API ตรงกับรหัส */
  currentEmployeeLabel?: string | null;
}

export function StaffEmployeePicker({
  value,
  onChange,
  exceptUserId,
  disabled,
  currentEmployeeLabel,
}: StaffEmployeePickerProps) {
  const [rows, setRows] = useState<StaffEmployeeOption[]>([]);
  const [loading, setLoading] = useState(false);

  const loadEmployees = useCallback(
    async (keyword: string) => {
      setLoading(true);
      try {
        const res = (await staffUserApi.searchEmployees({
          keyword: keyword.trim() || undefined,
          page: 1,
          limit: 80,
          exclude_linked: true,
          except_user_id: exceptUserId,
        })) as {
          success?: boolean;
          data?: StaffEmployeeOption[];
        };
        setRows(Array.isArray(res?.data) ? res.data : []);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [exceptUserId],
  );

  const options = useMemo(() => {
    const mapped = rows.map((row) => {
      const name =
        row.display_name ||
        [row.first_name, row.last_name].filter(Boolean).join(' ').trim() ||
        '(ไม่มีชื่อ)';
      return {
        value: row.emp_code,
        label: name,
        subLabel: row.emp_code,
      };
    });
    return [{ value: '', label: 'ไม่ผูก', subLabel: '' }, ...mapped];
  }, [rows]);

  const strValue = value?.trim() ?? '';

  const initialDisplay =
    strValue && !rows.some((r) => r.emp_code === strValue)
      ? currentEmployeeLabel?.trim()
        ? { label: currentEmployeeLabel.trim(), subLabel: strValue }
        : { label: strValue, subLabel: undefined }
      : undefined;

  return (
    <SearchableSelect
      label="ผูกรหัสพนักงาน (Employee)"
      placeholder="เลือกพนักงาน"
      value={strValue}
      onValueChange={(v) => onChange(v === '' ? null : v)}
      options={options}
      loading={loading}
      onSearch={loadEmployees}
      searchPlaceholder="ค้นหารหัส / ชื่อ / นามสกุล..."
      initialDisplay={initialDisplay}
      disabled={disabled}
    />
  );
}
