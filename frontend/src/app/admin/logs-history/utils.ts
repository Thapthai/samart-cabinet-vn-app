import { formatUtcDateTime } from '@/lib/formatThaiDateTime';

export function getTodayDate(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function groupRowKey(g: { patient_hn: string; en: string }, i: number): string {
  return `${g.patient_hn}\0${g.en}\0${i}`;
}

export function getPaginationPages(
  current: number,
  total: number,
): (number | 'ellipsis')[] {
  if (total <= 1) return [];
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const result: (number | 'ellipsis')[] = [1];
  if (current > 3) result.push('ellipsis');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) result.push(i);
  if (current < total - 2) result.push('ellipsis');
  if (total > 1) result.push(total);
  return result;
}

export function getHnEnFromAction(action: any): string {
  if (!action || typeof action !== 'object') return '-';
  const a = action as Record<string, unknown>;
  const hn = typeof a.patient_hn === 'string' ? a.patient_hn : '';
  const en = typeof a.en === 'string' ? a.en : '';
  if (!hn && !en) return '-';
  return [hn, en].filter(Boolean).join(' / ');
}

export function getMethodFromAction(action: any): string {
  if (!action || typeof action !== 'object') return '-';
  const type = String((action as Record<string, unknown>).type ?? '').toUpperCase();
  if (type === 'QUERY') return 'GET';
  if (type === 'CREATE') return 'POST';
  if (type === 'UPDATE' || type === 'UPDATE_PRINT_INFO') return 'PUT';
  if (type === 'DELETE') return 'DELETE';
  return 'OTHER';
}

export function getActionTypeLabel(action: any): string {
  if (!action || typeof action !== 'object') return '-';
  const type = String((action as Record<string, unknown>).type ?? '').toUpperCase();
  if (type === 'UPDATE_PRINT_INFO') return 'UPDATE_PRINT_INFO';
  return type || '-';
}

export function getActionSummary(action: any): string {
  if (!action || typeof action !== 'object') return '-';
  const a = action as Record<string, unknown>;
  if (a.reason && typeof a.reason === 'string') return a.reason;
  if (a.error_message && typeof a.error_message === 'string') return a.error_message;
  if (a.action && typeof a.action === 'string') return a.action;
  if (a.type && typeof a.type === 'string') return a.type;
  try {
    const s = JSON.stringify(action);
    return s.slice(0, 80) + (s.length > 80 ? '…' : '');
  } catch {
    return '-';
  }
}

export function getLogDescription(row: any): string {
  const d = row?.description;
  if (d != null && String(d).trim()) return String(d).trim();
  return getActionSummary(row?.action);
}

export function rowHn(row: any): string {
  return (
    row?.patient_hn ||
    (row?.action && typeof row.action.patient_hn === 'string' ? row.action.patient_hn : null) ||
    '–'
  );
}

export function rowEn(row: any): string {
  return (
    row?.en || (row?.action && typeof row.action.en === 'string' ? row.action.en : null) || '–'
  );
}

export function formatActionJson(action: any): string {
  if (action == null) return 'null';
  try {
    return JSON.stringify(action, null, 2);
  } catch {
    return String(action);
  }
}

/** แสดงวันเวลาตาม UTC — ไม่ +7 / ไม่ใช้ Asia/Bangkok */
export function formatLogDate(v: string | Date | null | undefined): string {
  if (v == null || v === '') return '-';
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return '-';
    return formatUtcDateTime(v.toISOString());
  }
  return formatUtcDateTime(String(v));
}
