export interface Usage {
  id: number;
  en?: string;
  patient_hn?: string;
  first_name?: string;
  lastname?: string;
  department_code?: string;
  created_at?: string;
  data?: Usage;
}

export interface SupplyItem {
  id: number;
  order_item_code?: string;
  supply_code?: string;
  order_item_description?: string;
  supply_name?: string;
  qty?: number;
  qty_used_with_patient?: number;
  qty_returned_to_cabinet?: number;
}

export interface ReturnHistoryRecord {
  id: number;
  qty_returned: number;
  return_reason: string;
  return_datetime: string;
  return_note?: string;
  return_by_user_id?: string;
  return_by_user_name?: string;
  /** ตู้ที่คืนเข้า (จาก stock_id → cabinet) */
  cabinet_name?: string;
  cabinet_code?: string;
  department_name?: string;
  /** จาก SupplyUsageItem (เก่า) หรือ map จาก item_stock (ใหม่) */
  supply_item?: {
    order_item_code?: string;
    supply_code?: string;
    order_item_description?: string;
    supply_name?: string;
    usage?: {
      id?: number;
      en?: string;
      patient_hn?: string;
      first_name?: string;
      lastname?: string;
      department_code?: string;
      created_at?: string;
    };
  };
  /** มีเมื่อบันทึกจาก item_stock (คืนจากตู้) — ไม่มี usage */
  item_stock?: {
    ItemCode?: string;
    RfidCode?: string;
    item?: { itemcode?: string; itemname?: string };
  };
}

export interface ReturnHistoryData {
  data: ReturnHistoryRecord[];
  total: number;
  page: number;
  limit: number;
}

export type ReturnReason = 'UNWRAPPED_UNUSED' | 'EXPIRED' | 'CONTAMINATED' | 'DAMAGED';

/** รายการจาก GET /item-stocks/will-return (แยกตามตู้ + ItemCode) */
export interface WillReturnItem {
  ItemCode: string;
  StockID?: number;
  cabinet_name?: string | null;
  cabinet_code?: string | null;
  department_id?: number | null;
  department_name?: string | null;
  itemname: string | null;
  withdraw_qty: number;
  used_qty: number;
  return_qty: number;
  max_available_qty: number;
}
