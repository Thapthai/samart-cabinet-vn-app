/** เลือกตู้เฉพาะแล้วเท่านั้น — ตรงกับ showCabinetMinMax หน้าเว็บ */
export function isValidCabinetFilterId(
  cabinetId: number | null | undefined,
): cabinetId is number {
  return typeof cabinetId === 'number' && Number.isFinite(cabinetId) && cabinetId > 0;
}

/** แสดงสี highlight แถว — เฉพาะเมื่อ filter ตู้ไม่ใช่ "ทั้งหมด" */
export function resolveCabinetStockShowRowHighlight(data: {
  filters?: { cabinetId?: number | null };
}): boolean {
  return isValidCabinetFilterId(data.filters?.cabinetId);
}

export const CABINET_STOCK_NEUTRAL_ROW_BG = {
  argb: 'FFFFFFFF',
  hex: '#FFFFFF',
} as const;
