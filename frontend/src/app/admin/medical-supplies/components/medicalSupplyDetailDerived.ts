import { toUtcYyyyMmDd } from '@/lib/formatThaiDateTime';

export type MedicalSupplyDetailSummarySupply = Record<string, unknown> & {
  data?: Record<string, unknown> | null;
};

export type SupplyItemRow = Record<string, unknown>;

export type MedicalSupplyDetailDerived = {
  patientHn: string;
  assessionNos: string[];
  firstName: string;
  lastName: string;
  recordedBy: string;
  department: string;
  subDepartmentName: string;
  suppliesCount: number;
  billingStatus: string | undefined;
  createdAt: string | undefined;
  updatedAt: string | undefined;
  printDate: string | undefined;
  timePrintDate: string | undefined;
};

/** วันที่ปฏิทิน UTC (YYYY-MM-DD) ให้ตรงกับช่วง filter / API */
function toFilterDateStr(d: string | Date | null | undefined): string {
  if (!d) return '';
  const s = typeof d === 'string' ? d : d.toISOString();
  return toUtcYyyyMmDd(s) ?? '';
}

function inDateRange(dateStr: string, startDate: string, endDate: string): boolean {
  if (!dateStr) return false;
  if (!startDate && !endDate) return true;
  if (startDate && dateStr < startDate) return false;
  if (endDate && dateStr > endDate) return false;
  return true;
}

function toMillis(v: unknown): number {
  if (!v) return 0;
  const d = new Date(String(v));
  const t = d.getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function getSupplyItemsFromSupply(supply: MedicalSupplyDetailSummarySupply): SupplyItemRow[] {
  const d = supply.data ?? {};
  const supplyItems = (Array.isArray(d.supply_items) ? d.supply_items : supply.supply_items) as SupplyItemRow[];
  return Array.isArray(supplyItems) ? supplyItems : [];
}

/** Group by assession_no + item_code และเลือกแถวเวลาล่าสุด — ตรงกับตารางรายการอุปกรณ์ที่เบิก */
export function groupSupplyItemsLatest(
  items: SupplyItemRow[],
  filters?: { startDate?: string; endDate?: string },
): SupplyItemRow[] {
  const startDate = filters?.startDate || '';
  const endDate = filters?.endDate || '';

  const filteredByDate = items.filter((item) => {
    const createdStr = toFilterDateStr(item.updated_at as string | Date | undefined);
    return inDateRange(createdStr, startDate, endDate);
  });

  const byKey = new Map<string, SupplyItemRow>();
  for (const item of filteredByDate) {
    const assessionNo = String(item.assession_no ?? '').trim();
    const itemCode = String(item.order_item_code ?? item.supply_code ?? '').trim();
    const key = `${assessionNo}|${itemCode}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, item);
      continue;
    }
    const prevTs = Math.max(toMillis(prev.updated_at), toMillis(prev.created_at));
    const currTs = Math.max(toMillis(item.updated_at), toMillis(item.created_at));
    if (currTs >= prevTs) byKey.set(key, item);
  }

  return [...byKey.values()].sort((a, b) => {
    const ta = Math.max(toMillis(a.updated_at), toMillis(a.created_at));
    const tb = Math.max(toMillis(b.updated_at), toMillis(b.created_at));
    return tb - ta;
  });
}

export function deriveMedicalSupplyDetail(
  supply: MedicalSupplyDetailSummarySupply,
  options?: { startDate?: string; endDate?: string },
): MedicalSupplyDetailDerived {
  const d = supply.data ?? {};
  const items = getSupplyItemsFromSupply(supply);
  const groupedLatest = groupSupplyItemsLatest(items, options);
  const assessionNos = [
    ...new Set(
      items
        .map((item) => item.assession_no)
        .filter((no): no is string => Boolean(no && String(no).trim() !== '')),
    ),
  ];

  return {
    patientHn: String(d.patient_hn ?? supply.patient_hn ?? '-'),
    assessionNos,
    firstName: String(d.first_name ?? supply.first_name ?? ''),
    lastName: String(d.lastname ?? supply.lastname ?? ''),
    recordedBy: String(
      d.recorded_by_display ?? supply.recorded_by_display ?? d.recorded_by_name ?? supply.recorded_by_name ?? '-',
    ),
    department: String(
      d.department_name ?? supply.department_name ?? d.department_code ?? supply.department_code ?? '-',
    ),
    subDepartmentName: String(
      d.sub_department_name ?? supply.sub_department_name ?? '',
    ).trim(),
    suppliesCount: groupedLatest.length,
    billingStatus: (d.billing_status ?? supply.billing_status) as string | undefined,
    createdAt: (supply.created_at ?? d.created_at ?? d.usage_datetime) as string | undefined,
    updatedAt: (supply.updated_at ?? d.updated_at) as string | undefined,
    printDate: (d.print_date ?? supply.print_date) as string | undefined,
    timePrintDate: (d.time_print_date ?? supply.time_print_date) as string | undefined,
  };
}
