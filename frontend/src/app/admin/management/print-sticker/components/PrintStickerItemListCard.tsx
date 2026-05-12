'use client';

import { RefreshCw, Search } from 'lucide-react';
import type { Item } from '@/types/item';
import ItemNameWithUnit from '@/components/ItemNameWithUnit';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { generatePageNumbers } from '../utils';

const COL_MASTER = 4;
const COL_CABINET = 7;

type PrintStickerItemListCardProps = {
  items: Item[];
  loadingList: boolean;
  total: number;
  page: number;
  totalPages: number;
  keywordInput: string;
  onKeywordInputChange: (value: string) => void;
  onSearch: () => void;
  onRefresh: () => void;
  onSelectAllOnPage: () => void;
  onClearSelectionOnPage: () => void;
  onPageChange: (nextPage: number) => void;
  selectedItemcodes: Set<string>;
  onToggleRow: (row: Item) => void;
  /** รายการจาก slot ในตู้ (แสดงคอลัมภ์ในตู้ / max / ต้องเติม) */
  variant?: 'master' | 'cabinet';
  /** ซ่อน pager (เช่น โหมด Auto ดึงรวมครั้งเดียว) */
  hidePagination?: boolean;
};

export function PrintStickerItemListCard({
  items,
  loadingList,
  total,
  page,
  totalPages,
  keywordInput,
  onKeywordInputChange,
  onSearch,
  onRefresh,
  onSelectAllOnPage,
  onClearSelectionOnPage,
  onPageChange,
  selectedItemcodes,
  onToggleRow,
  variant = 'master',
  hidePagination = false,
}: PrintStickerItemListCardProps) {
  const colCount = variant === 'cabinet' ? COL_CABINET : COL_MASTER;
  const onPageSelectedCount = items.filter((r) => selectedItemcodes.has(r.itemcode)).length;

  const descriptionCabinet =
    loadingList && items.length === 0
      ? 'กำลังโหลด…'
      : `แสดง ${items.length} รายการในหน้านี้ จากทั้งหมด ${total} รายการ`;

  return (
    <Card className="min-w-0 border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          {variant === 'cabinet' ? 'เวชภัณฑ์ในตู้' : 'รายการ Item (ใช้งาน)'}
        </CardTitle>
        <CardDescription>
          {variant === 'cabinet'
            ? descriptionCabinet
            : loadingList && items.length === 0
              ? 'กำลังโหลด…'
              : `แสดง ${items.length} รายการในหน้านี้ จากทั้งหมด ${total} รายการ`}
        </CardDescription>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Input
            placeholder="ค้นหา itemcode / ชื่อ"
            value={keywordInput}
            onChange={(e) => onKeywordInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            className="sm:max-w-xs"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" className="gap-1" onClick={onSearch}>
              <Search className="h-4 w-4" />
              ค้นหา
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={onRefresh}
              disabled={loadingList}
            >
              <RefreshCw className={cn('h-4 w-4', loadingList && 'animate-spin')} />
              รีเฟรช
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSelectAllOnPage}
              disabled={loadingList || items.length === 0}
            >
              เลือกทั้งหน้า
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearSelectionOnPage}
              disabled={loadingList || onPageSelectedCount === 0}
            >
              ยกเลิกในหน้านี้
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 pt-0">
        <div className="max-h-[min(70vh,calc(100dvh-15rem))] overflow-y-auto overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 pl-3">เลือก</TableHead>
                <TableHead>itemcode</TableHead>
                <TableHead>ชื่อ</TableHead>
                {variant === 'cabinet' ? (
                  <>
                    <TableHead className="w-[76px] text-center text-xs whitespace-nowrap">ในตู้</TableHead>
                    <TableHead className="w-[76px] text-center text-xs whitespace-nowrap">Max</TableHead>
                    <TableHead className="w-[88px] text-center text-xs whitespace-nowrap">ต้องเติม</TableHead>
                  </>
                ) : null}
                <TableHead className="hidden md:table-cell">Barcode</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingList ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="py-10 text-center text-slate-500">
                    กำลังโหลด…
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colCount} className="py-10 text-center text-slate-500">
                    ไม่มีรายการ
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => {
                  const sel = selectedItemcodes.has(row.itemcode);
                  const qtyIn = typeof row.count_itemstock === 'number' ? row.count_itemstock : 0;
                  const maxS = typeof row.stock_max === 'number' ? row.stock_max : 0;
                  const refill = typeof row.refill_qty === 'number' ? row.refill_qty : 0;
                  return (
                    <TableRow
                      key={row.itemcode}
                      className={cn(sel && 'bg-rose-50/90')}
                      onClick={() => onToggleRow(row)}
                    >
                      <TableCell className="w-12 pl-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={sel}
                          onCheckedChange={() => onToggleRow(row)}
                          aria-label={`เลือก ${row.itemcode}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">{row.itemcode}</TableCell>
                      <TableCell className="max-w-[240px] min-w-0 text-sm">
                        <ItemNameWithUnit item={row} />
                      </TableCell>
                      {variant === 'cabinet' ? (
                        <>
                          <TableCell className="text-center tabular-nums text-sm">{qtyIn}</TableCell>
                          <TableCell className="text-center tabular-nums text-sm">{maxS}</TableCell>
                          <TableCell className="text-center tabular-nums text-sm font-medium text-amber-800">
                            {refill}
                          </TableCell>
                        </>
                      ) : null}
                      <TableCell className="hidden font-mono text-xs text-slate-600 md:table-cell">
                        {row.Barcode ?? '—'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {!hidePagination && totalPages > 1 && (
          <div className="mt-6 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              หน้า {page} จาก {totalPages} ({total} รายการ)
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPageChange(1)}
                disabled={page === 1 || loadingList}
              >
                แรกสุด
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1 || loadingList}
              >
                ก่อนหน้า
              </Button>
              {generatePageNumbers(page, totalPages).map((pNum, idx) =>
                pNum === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                    ...
                  </span>
                ) : (
                  <Button
                    key={pNum}
                    type="button"
                    variant={page === pNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onPageChange(pNum as number)}
                    disabled={loadingList}
                  >
                    {pNum}
                  </Button>
                ),
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages || loadingList}
              >
                ถัดไป
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPageChange(totalPages)}
                disabled={page === totalPages || loadingList}
              >
                สุดท้าย
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
