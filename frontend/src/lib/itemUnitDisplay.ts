import type { Item } from '@/types/item';

/** Partial item shape for bracket text (main/sub unit + ratio) */
export type ItemUnitFields = Pick<Item, 'unit' | 'subUnit' | 'SubUnitQty'>;

/**
 * `กล่อง (90 เม็ด)` — N = จำนวนหน่วย × SubUnitQty เมื่อมีจำนวน;
 * ถ้าไม่ส่งจำนวน แสดงอัตราต่อหลัก `กล่อง (18 เม็ด)` (= SubUnitQty)
 * จำนวนหลัก = 0 และมีหน่วยการเบิก → `0 เม็ด` (ไม่แสดง `0 กล่อง (20 เม็ด)` จากอัตราต่อหลัก)
 */
export function formatItemUnitBracket(
  item: ItemUnitFields,
  qtyInMainUnits?: number | null,
): string {
  const main = item.unit?.UnitName?.trim();
  const sub = item.subUnit?.UnitName?.trim();
  const per = item.SubUnitQty != null ? Number(item.SubUnitQty) : NaN;

  const qtyZero =
    qtyInMainUnits != null && Number.isFinite(qtyInMainUnits) && qtyInMainUnits === 0;

  if (qtyZero) {
    if (sub && Number.isFinite(per) && per > 0) {
      return `0 ${sub}`;
    }
    if (main) {
      return `0 ${main}`;
    }
    return '';
  }

  if (!main) return '';

  if (!sub || !Number.isFinite(per) || per <= 0) {
    return main;
  }

  const qty =
    qtyInMainUnits != null && Number.isFinite(qtyInMainUnits) && qtyInMainUnits > 0
      ? qtyInMainUnits
      : null;
  const n = qty != null ? Math.round(qty * per) : Math.round(per);
  return `${main} (${n} ${sub})`;
}

/** ชื่ออุปกรณ์ · หน่วย — ใช้เมื่อต้องการบรรทัดเดียว */
export function formatItemNameWithUnit(
  item: Item & ItemUnitFields,
  opts?: { qtyMain?: number | null },
): string {
  const name = (item.itemname ?? item.itemcode ?? '').trim() || '—';
  const br = formatItemUnitBracket(item, opts?.qtyMain);
  return br ? `${name} · ${br}` : name;
}
