'use client';

import { Search, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

const fieldInputClass = 'bg-white';

export interface CabinetsSearchCardProps {
  keywordInput: string;
  activeKeyword: string;
  onKeywordInputChange: (value: string) => void;
  onSearch: () => void;
  onClearFilters: () => void;
  onRefresh: () => void;
  loading?: boolean;
}

export default function CabinetsSearchCard({
  keywordInput,
  activeKeyword,
  onKeywordInputChange,
  onSearch,
  onClearFilters,
  onRefresh,
  loading = false,
}: CabinetsSearchCardProps) {
  const hasActiveFilters = activeKeyword.trim() !== '';

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent>
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 p-2">
            <Search className="h-4 w-4 text-amber-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">ค้นหาและกรอง</p>
            <p className="text-xs text-slate-500">ค้นจากชื่อตู้ หรือรหัสตู้</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="staff-cabinet-keyword" className="text-xs font-medium text-slate-600">
              คำค้นหา
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="staff-cabinet-keyword"
                placeholder="เช่น ตู้ A1, CAB-001..."
                value={keywordInput}
                onChange={(e) => onKeywordInputChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                className={cn('h-10 pl-9 shadow-sm', fieldInputClass)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
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
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900">
              คำค้น: {activeKeyword.trim()}
            </span>
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
