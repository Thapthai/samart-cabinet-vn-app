'use client';

import { Search, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const fieldInputClass = 'bg-white';

export type ItemStatusFilter = 'all' | 'active' | 'inactive';

export interface ItemsSearchCardProps {
  keywordInput: string;
  activeKeyword: string;
  statusFilter: ItemStatusFilter;
  onKeywordInputChange: (value: string) => void;
  onStatusFilterChange: (value: ItemStatusFilter) => void;
  onSearch: () => void;
  onClearFilters: () => void;
  onRefresh: () => void;
  loading?: boolean;
}

export default function ItemsSearchCard({
  keywordInput,
  activeKeyword,
  statusFilter,
  onKeywordInputChange,
  onStatusFilterChange,
  onSearch,
  onClearFilters,
  onRefresh,
  loading = false,
}: ItemsSearchCardProps) {
  const hasActiveFilters = activeKeyword.trim() !== '' || statusFilter !== 'all';

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent>
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 p-2">
            <Search className="h-4 w-4 text-amber-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">ค้นหาและกรอง</p>
            <p className="text-xs text-slate-500">ค้นจากรหัส Item, ชื่อ หรือบาร์โค้ด</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_160px] lg:items-end">
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <label htmlFor="staff-item-keyword" className="text-xs font-medium text-slate-600">
              คำค้นหา
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="staff-item-keyword"
                placeholder="เช่น MED001, ชื่อเวชภัณฑ์, บาร์โค้ด..."
                value={keywordInput}
                onChange={(e) => onKeywordInputChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                className={cn('h-10 pl-9 shadow-sm', fieldInputClass)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="staff-item-status-filter" className="text-xs font-medium text-slate-600">
              สถานะ
            </label>
            <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as ItemStatusFilter)}>
              <SelectTrigger id="staff-item-status-filter" className={cn('h-10 w-full shadow-sm', fieldInputClass)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="active">ใช้งาน</SelectItem>
                <SelectItem value="inactive">ไม่ใช้งาน</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" onClick={onSearch} className="h-10 gap-2">
              <Search className="h-4 w-4" />
              ค้นหา
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={onRefresh}
              aria-label="รีเฟรช"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {hasActiveFilters ? (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/70 pt-4">
            <span className="text-xs font-medium text-slate-500">กำลังกรอง:</span>
            {activeKeyword.trim() ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                คำค้น: {activeKeyword.trim()}
              </span>
            ) : null}
            {statusFilter !== 'all' ? (
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                  statusFilter === 'active'
                    ? 'border-green-200 bg-green-50 text-green-800'
                    : 'border-slate-200 bg-slate-50 text-slate-700',
                )}
              >
                {statusFilter === 'active' ? 'ใช้งาน' : 'ไม่ใช้งาน'}
              </span>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-slate-600"
              onClick={onClearFilters}
            >
              <X className="h-3.5 w-3.5" />
              ล้างตัวกรอง
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
