/**
 * ให้ตรงกับ frontend `formatItemUnitBracket` + `QtyWithMainUnit` (single string สำหรับ Excel/PDF)
 * — หน่วยเท่านั้นในการคิดจำนวน; หน่วยการเบิกเป็นป้ายในวงเล็บ
 */

export type ReportItemUnitFields = {
  unit?: { UnitName?: string | null };
  subUnit?: { UnitName?: string | null };
  SubUnitQty?: number | null;
};

/** เช่น `กล่อง (90 เม็ด)` — ไม่รวมเลขจำนวนหลักด้านหน้า (เหมือน frontend) */
export function formatItemUnitBracket(
  item: ReportItemUnitFields,
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

/**
 * สตริงเต็มสำหรับรายงาน: `9 กล่อง (180 เม็ด)` หรือ `0 เม็ด`
 */
export function formatQtyWithMainUnitForReport(qty: number, item: ReportItemUnitFields): string {
  const tail = formatItemUnitBracket(item, qty);
  if (qty === 0 && tail !== '') {
    const m = tail.match(/^0\s+(.+)$/);
    if (m) {
      return `0 ${m[1]}`;
    }
    return tail;
  }
  if (!tail) {
    return Number(qty).toLocaleString();
  }
  return `${Number(qty).toLocaleString()} ${tail}`;
}

/** ตัวเลขอย่างเดียว — ใช้คอลัมน์ที่ไม่ต้องแสดงหน่วยในรายงานสต๊อกตู้ */
export function formatQtyPlainForReport(qty: number): string {
  return Number(qty).toLocaleString();
}

/** Min/Max ตัวเลขอย่างเดียว — null/undefined แสดงเป็น 0 (เช่น `0 / 0` ไม่ใช่ `- / 0`) */
export function formatMinMaxPlainForReport(
  min: number | null | undefined,
  max: number | null | undefined,
): string {
  const fmt = (n: number | null | undefined) => {
    const num = n != null && Number.isFinite(Number(n)) ? Number(n) : 0;
    return formatQtyPlainForReport(num);
  };
  return `${fmt(min)} / ${fmt(max)}`;
}

/** ส่วนต่างที่อาจติดลบ — คงหน่วยเดียวกับรายการ */
export function formatSignedQtyWithMainUnitForReport(
  qty: number,
  item: ReportItemUnitFields,
): string {
  if (qty === 0) return formatQtyWithMainUnitForReport(0, item);
  const sign = qty < 0 ? '-' : '';
  return sign + formatQtyWithMainUnitForReport(Math.abs(qty), item);
}

/** คอลัมน์หมายเหตุรายงานสต๊อกตู้ — หมดอายุ / ต้องเติม */
export function formatCabinetStockRemark(row: {
  has_expired?: boolean;
  refill_qty?: number;
}): string {
  const parts: string[] = [];
  if (row.has_expired) parts.push('หมดอายุ');
  if ((row.refill_qty ?? 0) > 0) parts.push('ต้องเติม');
  return parts.length > 0 ? parts.join(' / ') : '-';
}
