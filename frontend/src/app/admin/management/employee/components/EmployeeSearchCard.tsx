'use client';

import { Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface EmployeeSearchCardProps {
  keyword: string;
  onKeywordChange: (value: string) => void;
  onSearch: () => void;
  onRefresh: () => void;
  loading?: boolean;
}

export default function EmployeeSearchCard({
  keyword,
  onKeywordChange,
  onSearch,
  onRefresh,
  loading = false,
}: EmployeeSearchCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">ค้นหา</CardTitle>
        <CardDescription>ค้นจาก EmpCode, ชื่อ หรือนามสกุล</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex min-w-[200px] flex-1 gap-2">
          <Input
            placeholder="คำค้น..."
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            className="max-w-md"
          />
          <Button type="button" variant="secondary" onClick={onSearch} className="gap-1.5">
            <Search className="h-4 w-4" />
            ค้นหา
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onRefresh}
          aria-label="รีเฟรช"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardContent>
    </Card>
  );
}
