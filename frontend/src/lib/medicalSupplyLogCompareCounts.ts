/**
 * แสดงตัวเลขจาก log action (compare_item_code_count / non_compare_item_code_count)
 * log เก่าที่ไม่มีฟิลด์จะได้ "–"
 */
export function formatLogCompareItemCodeCount(
  action: unknown,
  field: 'compare_item_code_count' | 'non_compare_item_code_count',
): string {
  if (!action || typeof action !== 'object') return '–';
  const a = action as Record<string, unknown>;
  if (!(field in a) || a[field] === undefined || a[field] === null) return '–';
  const v = a[field];
  if (typeof v === 'number' && !Number.isNaN(v)) return String(v);
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return String(Number(v));
  return '–';
}

export function logActionHasCompareCounts(action: unknown): boolean {
  if (!action || typeof action !== 'object') return false;
  const a = action as Record<string, unknown>;
  return (
    ('compare_item_code_count' in a && a.compare_item_code_count != null) ||
    ('non_compare_item_code_count' in a && a.non_compare_item_code_count != null)
  );
}

/** ค่าในตาราง — รายการที่ Compare (กรอบส้ม) */
export const logCompareOrangeValueClass =
  'inline-flex min-w-[2.25rem] justify-center rounded-md border-2 border-orange-400 bg-orange-50 px-2 py-1.5 font-mono text-sm tabular-nums text-orange-950 dark:border-orange-500 dark:bg-orange-950/40 dark:text-orange-100';

/** รายการที่ไม่ Compare (กรอบแดง) */
export const logCompareRedValueClass =
  'inline-flex min-w-[2.25rem] justify-center rounded-md border-2 border-red-400 bg-red-50 px-2 py-1.5 font-mono text-sm tabular-nums text-red-950 dark:border-red-500 dark:bg-red-950/40 dark:text-red-100';

/** การ์ดมือถือ */
export const logCompareOrangeMobileChipClass =
  'inline-flex flex-1 min-w-0 flex-col rounded-md border-2 border-orange-400 bg-orange-50 px-2 py-1.5 text-center font-mono text-[11px] leading-tight text-orange-950 dark:border-orange-500 dark:bg-orange-950/40 dark:text-orange-100';

export const logCompareRedMobileChipClass =
  'inline-flex flex-1 min-w-0 flex-col rounded-md border-2 border-red-400 bg-red-50 px-2 py-1.5 text-center font-mono text-[11px] leading-tight text-red-950 dark:border-red-500 dark:bg-red-950/40 dark:text-red-100';

/** แถวใน dialog รายละเอียด */
export const logCompareOrangeDialogRowClass =
  'flex flex-wrap items-center justify-between gap-2 rounded-md border-2 border-orange-400 bg-orange-50 px-3 py-2.5 sm:col-span-2 dark:border-orange-500 dark:bg-orange-950/40';

export const logCompareRedDialogRowClass =
  'flex flex-wrap items-center justify-between gap-2 rounded-md border-2 border-red-400 bg-red-50 px-3 py-2.5 sm:col-span-2 dark:border-red-500 dark:bg-red-950/40';
