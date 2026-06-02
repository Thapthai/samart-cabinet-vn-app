/**
 * แสดงวันเวลาแบบไทย เช่น 2026-03-20T08:38:04.559Z → "20 มี.ค. 2569 08:38:04"
 * - ISO ที่มี Z หรือ offset → แสดงตามเวลาใน ISO (UTC) + พ.ศ.
 * - สตริงวันเวลาไม่มี timezone → ถือเป็นเวลาไทย (+07:00)
 */
const TH_DATETIME_OPTS: Intl.DateTimeFormatOptions = {
  calendar: 'buddhist',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
};

export function formatDate(v: string | Date | null | undefined): string {
  if (v == null || v === '') return '-';
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return '-';
    return v.toLocaleString('th-TH', { ...TH_DATETIME_OPTS, timeZone: 'Asia/Bangkok' });
  }
  const s = String(v).trim();
  if (!s) return '-';
  const hasExplicitTz = /Z$/i.test(s) || /[+-]\d{2}:?\d{2}$/.test(s);
  let d: Date;
  if (hasExplicitTz) {
    d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString('th-TH', { ...TH_DATETIME_OPTS, timeZone: 'UTC' });
  }
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(s)) {
    const normalized = s.includes('T') ? s : s.replace(' ', 'T');
    d = new Date(`${normalized}+07:00`);
  } else {
    d = new Date(s);
  }
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('th-TH', { ...TH_DATETIME_OPTS, timeZone: 'Asia/Bangkok' });
}

/** alias สำหรับรายงาน (ชื่อสื่อความหมายเดียวกับ formatDate) */
export const formatReportDateTime = formatDate;

const TH_DATE_ONLY_OPTS: Intl.DateTimeFormatOptions = {
  calendar: 'buddhist',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};

function localeDateOnly(d: Date, timeZone: string): string {
  return d.toLocaleDateString('th-TH', { ...TH_DATE_ONLY_OPTS, timeZone });
}

/** วันที่อย่างเดียว (ไม่มีเวลา) — สำหรับ filter วันที่เริ่ม/สิ้นสุด ฯลฯ */
export function formatReportDateOnly(value?: string | Date | null): string {
  if (value == null || value === '') return '-';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '-';
    return localeDateOnly(value, 'Asia/Bangkok');
  }
  const s = String(value).trim();
  if (!s) return '-';
  const hasExplicitTz = /Z$/i.test(s) || /[+-]\d{2}:?\d{2}$/.test(s);
  let d: Date;
  if (hasExplicitTz) {
    d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return localeDateOnly(d, 'UTC');
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, mo, da] = s.split('-').map(Number);
    d = new Date(Date.UTC(y, mo - 1, da, 12, 0, 0));
    if (Number.isNaN(d.getTime())) return s;
    return localeDateOnly(d, 'Asia/Bangkok');
  }
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(s)) {
    const normalized = s.includes('T') ? s : s.replace(' ', 'T');
    d = new Date(`${normalized}+07:00`);
  } else {
    d = new Date(s);
  }
  if (Number.isNaN(d.getTime())) return s;
  return localeDateOnly(d, 'Asia/Bangkok');
}

const BE_OFFSET = 543;

/**
 * วันที่แบบ d/m/Y (พ.ศ. = ค.ศ. + 543) — ตรงกับ frontend formatCEToBEDMY
 * รองรับ YYYY-MM-DD จาก API และ Date object
 */
export function formatReportDateSlashBE(value?: string | Date | null): string {
  if (value == null || value === '') return '-';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '-';
    const iso = value.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
    return formatReportDateSlashBE(iso);
  }
  const s = String(value).trim();
  if (!s) return '-';
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const yearCE = parseInt(y!, 10);
    const month = parseInt(m!, 10);
    const day = parseInt(d!, 10);
    if (Number.isNaN(yearCE) || Number.isNaN(month) || Number.isNaN(day)) return s;
    return `${day}/${month}/${yearCE + BE_OFFSET}`;
  }
  const slashMatch = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/.exec(s);
  if (slashMatch) {
    const [, d, m, y] = slashMatch;
    const day = parseInt(d!, 10);
    const month = parseInt(m!, 10);
    let year = parseInt(y!, 10);
    if (year <= 99) year = 2500 + year;
    else if (year >= 1900 && year < 2400) year += BE_OFFSET;
    if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return s;
    return `${day}/${month}/${year}`;
  }
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return formatReportDateSlashBE(parsed);
  }
  return s;
}

// --- แยกจากของเดิม: ค่า `Date` / DB เก็บเป็น UTC ให้แสดงตาม UTC (ไม่เลื่อนเป็น Asia/Bangkok) ---

/** แปลง input เป็นจุดเวลา — สตริง ISO ไม่มี timezone (วันเวลา) ให้ parse เป็น UTC (ต่อ Z) */
function parseInputForUtcDisplay(v: string | Date): Date | null {
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? null : v;
  }
  const s = String(v).trim();
  if (!s) return null;
  const hasExplicitTz = /Z$/i.test(s) || /[+-]\d{2}:?\d{2}$/.test(s);
  if (hasExplicitTz) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(s)) {
    const normalized = s.includes('T') ? s : s.replace(' ', 'T');
    const d = new Date(normalized.endsWith('Z') ? normalized : `${normalized}Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * เหมือน formatReportDateTime แต่ `Date` และข้อมูลจาก DB แสดงตาม **UTC** ตรงกับ ISO (ไม่ +7)
 * ใช้กับรายงานที่เก็บเวลาเป็น UTC ใน DB
 */
export function formatReportDateTimeUtc(
  v: string | Date | null | undefined,
): string {
  if (v == null || v === '') return '-';
  const d = parseInputForUtcDisplay(v as string | Date);
  if (d == null) return typeof v === 'string' ? v : '-';
  return d.toLocaleString('th-TH', { ...TH_DATETIME_OPTS, timeZone: 'UTC' });
}

/**
 * เหมือน formatReportDateOnly แต่ส่วนที่เป็น `Date` / ช่วงเวลา UTC แสดงตาม **UTC**
 */
export function formatReportDateOnlyUtc(value?: string | Date | null): string {
  if (value == null || value === '') return '-';
  const d = parseInputForUtcDisplay(value as string | Date);
  if (d == null) return typeof value === 'string' ? value : '-';
  return localeDateOnly(d, 'UTC');
}
