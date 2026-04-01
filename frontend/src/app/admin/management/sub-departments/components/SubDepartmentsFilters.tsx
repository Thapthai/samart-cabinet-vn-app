'use client';

import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DeptRow, StatusFilter } from '../types';

type Props = {
  keyword: string;
  onKeywordChange: (v: string) => void;
  onSearch: () => void;
  departmentFilter: 'all' | string;
  onDepartmentFilterChange: (v: 'all' | string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (v: StatusFilter) => void;
  filterDepartments: DeptRow[];
  departmentsLoading?: boolean;
};

export default function SubDepartmentsFilters({
  keyword,
  onKeywordChange,
  onSearch,
  departmentFilter,
  onDepartmentFilterChange,
  statusFilter,
  onStatusFilterChange,
  filterDepartments,
  departmentsLoading,
}: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">ค้นหาและกรอง</CardTitle>
        <CardDescription>ค้นจากรหัส ชื่อ หรือรายละเอียด · เลือกแผนกหลักหรือสถานะ</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex min-w-[200px] flex-1 gap-2">
          <Input
            placeholder="คำค้น (code, ชื่อ, รายละเอียด)..."
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            className="max-w-md"
          />
          <Button type="button" variant="secondary" onClick={onSearch} className="gap-1.5 shrink-0">
            <Search className="h-4 w-4" />
            ค้นหา
          </Button>
        </div>
        <div className="flex flex-col gap-1.5 sm:min-w-[200px]">
          <span className="text-xs text-muted-foreground">แผนกหลัก</span>
          <Select
            value={departmentFilter}
            onValueChange={(v) => onDepartmentFilterChange(v as 'all' | string)}
            disabled={departmentsLoading}
          >
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder={departmentsLoading ? 'กำลังโหลด...' : 'ทั้งหมด'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              {filterDepartments.map((d) => (
                <SelectItem key={d.ID} value={String(d.ID)}>
                  {d.DepName || d.DepName2 || `ID ${d.ID}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5 sm:min-w-[140px]">
          <span className="text-xs text-muted-foreground">สถานะ</span>
          <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              <SelectItem value="active">เปิดใช้งาน</SelectItem>
              <SelectItem value="inactive">ปิดใช้งาน</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
