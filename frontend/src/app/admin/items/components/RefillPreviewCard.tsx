'use client';

import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Item } from '@/types/item';
import ItemNameWithUnit from '@/components/ItemNameWithUnit';
import { getCabinetQty, toStockLimitNumber } from '@/lib/itemUnitDisplay';

export interface RefillPreviewCardProps {
  items: Item[];
  totalNeedRefill: number;
  loading?: boolean;
}

export default function RefillPreviewCard({
  items,
  totalNeedRefill,
  loading = false,
}: RefillPreviewCardProps) {
  if (loading || totalNeedRefill === 0) {
    return null;
  }

  const previewLimit = items.length;
  const hasMore = totalNeedRefill > previewLimit;
  const showCabinetColumn = items.some((item) => Boolean(item.refill_cabinet_name?.trim()));

  return (
    <Card className="border-amber-200 bg-amber-50/40 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-amber-100 p-2">
              <AlertTriangle className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <CardTitle className="text-base text-amber-950">
                ต้องเติมด่วน ({totalNeedRefill} รายการ)
              </CardTitle>
              <CardDescription className="text-amber-900/70">
                Max − จำนวนในตู้ · เรียงความสำคัญหลัก (มาก → น้อย)
                {showCabinetColumn ? ' · แสดงตู้ที่ต้องเติมมากที่สุด' : null}
                {hasMore ? ` · แสดง ${previewLimit} รายการแรก` : null}
              </CardDescription>
            </div>
          </div>
          <Badge className="shrink-0 border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-100">
            ต้องเติม
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto rounded-lg border border-amber-200/80 bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-amber-50/80 hover:bg-amber-50/80">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>รหัส</TableHead>
                <TableHead>ชื่ออุปกรณ์</TableHead>
                {showCabinetColumn ? <TableHead>ตู้</TableHead> : null}
                <TableHead className="text-center">ในตู้</TableHead>
                <TableHead className="text-center">Max</TableHead>
                <TableHead className="text-center">ต้องเติม</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => {
                const hasCabinetRefill = item.refill_cabinet_name?.trim();
                const inCabinet =
                  typeof item.refill_cabinet_count === 'number'
                    ? item.refill_cabinet_count
                    : getCabinetQty(item);
                const max = toStockLimitNumber(item.stock_max);
                const refill = Math.max(0, Number(item.refill_qty ?? 0));
                return (
                  <TableRow key={`${item.itemcode}-${index}`} className="hover:bg-amber-50/50">
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                        {item.itemcode}
                      </code>
                    </TableCell>
                    <TableCell className="max-w-[240px]">
                      <ItemNameWithUnit item={item} qtyMain={inCabinet} />
                    </TableCell>
                    {showCabinetColumn ? (
                      <TableCell className="text-sm text-muted-foreground">
                        {hasCabinetRefill || '—'}
                      </TableCell>
                    ) : null}
                    <TableCell className="text-center font-medium text-blue-700">
                      {inCabinet.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">{max}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-semibold text-amber-900">
                        {refill.toLocaleString()}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {hasMore ? (
          <p className="mt-2 text-xs text-amber-800/80">
            ดูรายการที่เหลือได้ในตารางด้านล่าง (เรียงรายการต้องเติมไว้ด้านบน)
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
