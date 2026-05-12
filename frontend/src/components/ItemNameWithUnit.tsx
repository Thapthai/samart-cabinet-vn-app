'use client';

import { cn } from '@/lib/utils';
import type { Item } from '@/types/item';
import { formatItemUnitBracket } from '@/lib/itemUnitDisplay';

type Props = {
  item: Item;
  /** จำนวนในหน่วยหลัก (เช่น จำนวนในเคส stock / จำนวนแผ่นพิมพ์) — ใช้คำนวณ N = qty × SubUnitQty */
  qtyMain?: number | null;
  /** false = แสดงเฉพาะชื่อ (ใช้เมื่อมีคอลัมน์จำนวนแยกแล้ว เช่น QtyWithMainUnit) */
  showUnitBracket?: boolean;
  className?: string;
  nameClassName?: string;
  unitClassName?: string;
};

/** ชื่ออุปกรณ์ + บรรทัดย่อย `หลัก (N หน่วยการเบิก)` เมื่อมีข้อมูลหน่วย */
export default function ItemNameWithUnit({
  item,
  qtyMain,
  showUnitBracket = true,
  className,
  nameClassName,
  unitClassName,
}: Props) {
  const name = item.itemname?.trim() || item.itemcode || '—';
  const bracket = showUnitBracket ? formatItemUnitBracket(item, qtyMain) : '';

  return (
    <div className={cn('flex min-w-0 flex-col gap-0.5', className)}>
      <span className={cn('truncate font-medium', nameClassName)}>{name}</span>
      {bracket ? (
        <span className={cn('truncate text-xs font-normal text-muted-foreground', unitClassName)}>
          {bracket}
        </span>
      ) : null}
    </div>
  );
}
