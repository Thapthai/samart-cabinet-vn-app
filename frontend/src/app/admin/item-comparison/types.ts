export interface ComparisonItem {
  itemcode: string;
  itemname: string;
  itemTypeId: number;
  itemTypeName: string;
  total_dispensed: number;
  total_used: number;
  total_returned?: number;
  difference: number;
  status: string;
  first_dispensed?: string | null;
  last_dispensed?: string | null;
  first_used?: string | null;
  last_used?: string | null;
}

export interface UsageItem {
  usage_id: number;
  supply_item_id?: number; // Add supply_item_id for unique key
  patient_hn: string;
  patient_name: string;
  patient_en?: string;
  department_code?: string;
  department_name?: string; // ชื่อแผนกจาก department.DepName/DepName2
  usage_datetime: string;
  itemcode: string;
  itemname: string;
  qty_used: number;
  qty_returned?: number;
  order_item_status?: string;
  created_at: string;
  updated_at: string;
}

export interface FilterState {
  searchItemCode: string;
  startDate: string;
  endDate: string;
  itemTypeFilter: string;
  departmentCode: string;
  subDepartmentId: string;
  cabinetId: string;
}

export interface SummaryData {
  total: number;
  matched: number;
  notMatched: number;
}
