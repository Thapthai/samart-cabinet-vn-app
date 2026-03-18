'use client';

import { Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DatePickerBE } from '@/components/ui/date-picker-be';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface WillReturnFilterCardProps {
  departmentId: string;
  cabinetId: string;
  itemCode: string;
  startDate: string;
  endDate: string;
  departments: Array<{ ID: number; DepName: string }>;
  cabinets: Array<{ id: number; cabinet_name?: string; cabinet_code?: string }>;
  onDepartmentChange: (value: string) => void;
  onCabinetChange: (value: string) => void;
  onItemCodeChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onSearch: () => void;
  onReset: () => void;
  onRefresh?: () => void;
  loading: boolean;
}

export default function WillReturnFilterCard({
  departmentId,
  cabinetId,
  itemCode,
  startDate,
  endDate,
  departments,
  cabinets,
  onDepartmentChange,
  onCabinetChange,
  onItemCodeChange,
  onStartDateChange,
  onEndDateChange,
  onSearch,
  onReset,
  onRefresh,
  loading,
}: WillReturnFilterCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>กรองข้อมูล</CardTitle>
        <CardDescription>ค้นหาและกรองรายการแจ้งคืนอุปกรณ์</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* รหัส/ชื่อเวชภัณฑ์ */}
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

          {/* ช่วงวันที่ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* แผนก & ตู้ Cabinet */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">แผนก</label>
              <Select
                value={departmentId || 'all'}
                onValueChange={(v) => {
                  onDepartmentChange(v === 'all' ? '' : v);
                  onCabinetChange('');
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="เลือกแผนก" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.ID} value={String(d.ID)}>
                      {d.DepName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">ตู้ Cabinet</label>
              <Select value={cabinetId || 'all'} onValueChange={(v) => onCabinetChange(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={departmentId ? 'เลือกตู้ Cabinet' : 'ทั้งหมด'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  {cabinets.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.cabinet_code || c.cabinet_name || `ตู้ ${c.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button onClick={onSearch} disabled={loading}>
            <Search className="h-4 w-4 mr-2" />
            ค้นหา
          </Button>
          <Button onClick={onReset} variant="outline">
            ล้าง
          </Button>
          {onRefresh && (
            <Button onClick={onRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              รีเฟรช
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
