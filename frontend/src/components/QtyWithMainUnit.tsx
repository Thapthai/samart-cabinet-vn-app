'use client';

import type { ReactNode } from 'react';
import type { Item } from '@/types/item';
import { formatItemUnitBracket } from '@/lib/itemUnitDisplay';
import { cn } from '@/lib/utils';

type Props = {
  qty: number;
  item: Pick<Item, 'unit' | 'subUnit' | 'SubUnitQty'>;
  className?: string;
  /** จัดชิดขวาเช่นคอลัมน์ตัวเลขชิดขวา */
  align?: 'center' | 'end';
};

/**
 * แสดง `9 กล่อง (18 แผง)` — ตัวเลข + หน่วย + วงเล็บ N หน่วยการเบิก (N = จำนวนหลัก × SubUnitQty)
 * ถ้าไม่มีหน่วยการเบิก: `3 กล่อง`
 * จำนวน 0 + มีหน่วยการเบิก: `0 เม็ด` (tail จาก formatItemUnitBracket เป็น `0 เม็ด` — ไม่ซ้ำเลข 0)
 */
export default function QtyWithMainUnit({ qty, item, className, align = 'center' }: Props) {
  const tail = formatItemUnitBracket(item, qty);

  const wrap = (inner: ReactNode) => (
    <span
      className={cn(
        'inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0',
        align === 'end' ? 'w-full justify-end' : 'justify-center',
        className,
      )}
    >
      {inner}
    </span>
  );

  if (qty === 0 && tail !== '') {
    const m = tail.match(/^0\s+(.+)$/);
    if (m) {
      return wrap(
        <>
          <span className="font-semibold tabular-nums text-slate-700">0</span>
          <span className="text-xs font-normal text-muted-foreground"> {m[1]}</span>
        </>,
      );
    }
  }

  return wrap(
    <>
      <span className="font-semibold tabular-nums text-slate-700">{qty.toLocaleString()}</span>
      {tail ? (
        <span className="text-xs font-normal text-muted-foreground">{tail}</span>
      ) : null}
    </>,
  );
}
