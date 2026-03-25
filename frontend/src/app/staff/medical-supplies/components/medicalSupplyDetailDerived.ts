export type MedicalSupplyDetailSummarySupply = Record<string, unknown> & {
  data?: Record<string, unknown> | null;
};

export type MedicalSupplyDetailDerived = {
  patientHn: string;
  assessionNos: string[];
  firstName: string;
  lastName: string;
  recordedBy: string;
  department: string;
  usageType: string;
  suppliesCount: number;
  billingStatus: string | undefined;
  createdAt: string | undefined;
  updatedAt: string | undefined;
  printDate: string | undefined;
  timePrintDate: string | undefined;
};

export function deriveMedicalSupplyDetail(supply: MedicalSupplyDetailSummarySupply): MedicalSupplyDetailDerived {
  const d = supply.data ?? {};
  const supplyItems = (Array.isArray(d.supply_items) ? d.supply_items : supply.supply_items) as Array<{
    assession_no?: string | null;
  }>;
  const items = Array.isArray(supplyItems) ? supplyItems : [];
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
    usageType: String(d.usage_type ?? supply.usage_type ?? '').toUpperCase(),
    suppliesCount: Number(d.supplies_count ?? supply.supplies_count ?? items.length) || 0,
    billingStatus: (d.billing_status ?? supply.billing_status) as string | undefined,
    createdAt: (supply.created_at ?? d.created_at ?? d.usage_datetime) as string | undefined,
    updatedAt: (supply.updated_at ?? d.updated_at) as string | undefined,
    printDate: (d.print_date ?? supply.print_date) as string | undefined,
    timePrintDate: (d.time_print_date ?? supply.time_print_date) as string | undefined,
  };
}
