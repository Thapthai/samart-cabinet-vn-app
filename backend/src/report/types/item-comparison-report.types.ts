export interface ItemComparisonReportData {
  filters: {
    itemCode?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
    departmentCode?: string;
    departmentName?: string;
  };
  summary: {
    total_items: number;
    total_dispensed: number;
    total_used: number;
    matched_count: number;
    discrepancy_count: number;
  };
  comparison: ComparisonItem[];
  usageDetails?: UsageDetail[];
}

export interface ComparisonItem {
  itemcode: string;
  itemname: string;
  item_type: string;
  total_dispensed: number;
  total_used: number;
  total_returned?: number;
  difference: number;
  status: 'MATCHED' | 'DISPENSED_NOT_USED' | 'USED_WITHOUT_DISPENSE' | 'DISPENSE_EXCEEDS_USAGE' | 'USAGE_EXCEEDS_DISPENSE';
  usageItems?: UsageDetail[];
}

export interface UsageDetail {
  usage_id: number;
  patient_hn: string;
  patient_name?: string;
  patient_en?: string;
  department_code?: string;
  department_name?: string;
  usage_type?: string | null;
  usage_datetime: Date | string;
  qty_used: number;
  qty_returned: number;
  order_item_status?: string;
  assession_no?: string;
  print_location?: string;
  twu?: string;
  order_item_description?: string;
  supply_item_created_at?: Date | string;
  itemcode?: string;
  itemname?: string;
}

