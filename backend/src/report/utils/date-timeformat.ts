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
