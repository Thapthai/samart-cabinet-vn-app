/**
 * ค.ศ. (CE) <-> พ.ศ. (BE) สำหรับ Date Picker
 * ค่าในระบบ/API ใช้ YYYY-MM-DD (ค.ศ.)
 * การแสดงผลใน input ใช้ d/m/YYYY (พ.ศ. = ปี + 543)
 */

const BE_OFFSET = 543;

/**
 * แปลง YYYY-MM-DD (ค.ศ.) เป็น สตริง d/m/YYYY (พ.ศ.) สำหรับแสดงใน input
 */
export function formatCEToBEDMY(isoDate: string | null | undefined): string {
  if (!isoDate || typeof isoDate !== 'string') return '';
  const trimmed = isoDate.trim();
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed);
  if (!match) return trimmed;
  const [, y, m, d] = match;
  const yearCE = parseInt(y!, 10);
  const month = parseInt(m!, 10);
  const day = parseInt(d!, 10);
  if (Number.isNaN(yearCE) || Number.isNaN(month) || Number.isNaN(day)) return trimmed;
  const yearBE = yearCE + BE_OFFSET;
  return `${day}/${month}/${yearBE}`;
}

/**
 * แปลงสตริง d/m/YYYY (พ.ศ.) เป็น YYYY-MM-DD (ค.ศ.) สำหรับส่ง API
 * รองรับ d/m/yyyy, dd/mm/yyyy, วว/ดด/ปปปป
 */
export function parseBEDMYToCE(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const cleaned = input.trim().replace(/\s/g, '');
  const parts = cleaned.split(/[/\-.]/);
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const day = parseInt(d!, 10);
  const month = parseInt(m!, 10);
  let year = parseInt(y!, 10);
  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return null;
  const yearBE = year <= 99 ? 2500 + year : year;
  const yearCE = yearBE >= 2400 ? yearBE - BE_OFFSET : yearBE;
  const date = new Date(yearCE, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getDate() !== day || date.getMonth() !== month - 1) return null;
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * ได้วันนี้ในรูปแบบ YYYY-MM-DD (ค.ศ.)
 */
export function getTodayCE(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
