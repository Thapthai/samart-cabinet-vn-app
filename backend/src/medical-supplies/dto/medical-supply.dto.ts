import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsObject, IsInt, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

// Enums
export enum ItemStatus {
  PENDING = 'PENDING',     // ยังไม่ได้ดำเนินการ
  PARTIAL = 'PARTIAL',     // ดำเนินการบางส่วน
  COMPLETED = 'COMPLETED', // ดำเนินการครบแล้ว
}

export enum ReturnReason {
  UNWRAPPED_UNUSED = 'UNWRAPPED_UNUSED', // แกะห่อแล้วไม่ได้ใช้
  EXPIRED = 'EXPIRED',                   // อุปกรณ์หมดอายุ
  CONTAMINATED = 'CONTAMINATED',         // อุปกรณ์มีการปนเปื้อนไม่สามารถนำกลับมาใช้งานได้
  DAMAGED = 'DAMAGED',                   // อุปกรณ์มีการชำรุดไม่สามารถนำมาใช้งานได้
}

// Order Item Input (New Format from API Spec)
export interface OrderItemInput {
  ItemCode: string;          // Order Item Code (S4214JELCO018)
  ItemDescription: string;   // Order Item Description (JELCO IV NO,18)
  AssessionNo: string;       // Assession No. (17938884/109)
  ItemStatus?: string;       // Order Item Status (Verified, Update, etc.)
  QTY: string | number;      // Quantity (can be string or number)
  UOM: string;               // Unit of Measure (Each)
  PatientLocationwhenOrdered?: string; // แผนก/จุดที่สั่ง - ใช้เช็คกับ department.DepName2 เพื่อดึง ID → department_code
}

// Legacy Supply Item Input (for backward compatibility)
export interface SupplyItemInput {
  supply_code: string;
  supply_name: string;
  supply_category: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  expiry_date?: string;
}

// Order Item Response
export interface OrderItemResponse {
  id: number;
  order_item_code: string;
  order_item_description: string;
  assession_no: string;
  order_item_status: string;
  qty: number;
  uom: string;
  // Quantity Management
  qty_used_with_patient: number;
  qty_returned_to_cabinet: number;
  qty_pending?: number; // คำนวณได้ = qty - qty_used_with_patient - qty_returned_to_cabinet
  item_status: ItemStatus;
  // Legacy fields
  supply_code?: string;
  supply_name?: string;
  supply_category?: string;
  unit?: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  expiry_date?: string;
  // Return records
  return_items?: ReturnRecordResponse[];
}

// Return Record Response
export interface ReturnRecordResponse {
  id: number;
  qty_returned: number;
  return_reason: ReturnReason;
  return_datetime: Date;
  return_by_user_id: string;
  return_note?: string;
}

// Create DTO (New Format)
export class CreateMedicalSupplyUsageDto {
  @IsOptional()
  @IsString()
  Hospital?: string; // VTN01

  @IsOptional()
  @IsString()
  EN?: string; // Episode Number (EZ5-000584)

  @IsOptional()
  @IsString()
  HN?: string; // Hospital Number (20-010334)

  @IsOptional()
  @IsString()
  FirstName?: string; // ชื่อจริง

  @IsOptional()
  @IsString()
  Lastname?: string; // นามสกุล

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  Order?: OrderItemInput[]; // Order Items

  /** วันที่พิมพ์บิล (YYYY-MM-DD) → print_date */
  @IsOptional()
  @IsString()
  DateBillPrinted?: string;

  /** เวลาพิมพ์บิล (HH:mm:ss) → time_print_date */
  @IsOptional()
  @IsString()
  TimeBillPrinted?: string;

  // Legacy fields (optional for backward compatibility)
  @IsOptional()
  @IsString()
  patient_hn?: string;

  @IsOptional()
  @IsString()
  patient_name_th?: string;

  @IsOptional()
  @IsString()
  patient_name_en?: string;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  supplies?: SupplyItemInput[];

  @IsOptional()
  @IsString()
  usage_datetime?: string;

  @IsOptional()
  @IsString()
  usage_type?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsString()
  department_code?: string;

  @IsOptional()
  @IsString()
  recorded_by_user_id?: string;

  @IsOptional()
  @IsString()
  billing_status?: string;

  @IsOptional()
  @IsNumber()
  billing_subtotal?: number;

  @IsOptional()
  @IsNumber()
  billing_tax?: number;

  @IsOptional()
  @IsNumber()
  billing_total?: number;

  @IsOptional()
  @IsString()
  billing_currency?: string;
}

// Update DTO
export class UpdateMedicalSupplyUsageDto {
  @IsOptional()
  @IsString()
  Hospital?: string;

  @IsOptional()
  @IsString()
  EN?: string;

  @IsOptional()
  @IsString()
  FirstName?: string;

  @IsOptional()
  @IsString()
  Lastname?: string;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  Order?: OrderItemInput[];

  // Legacy fields
  @IsOptional()
  @IsString()
  patient_name_th?: string;

  @IsOptional()
  @IsString()
  patient_name_en?: string;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  supplies?: SupplyItemInput[];

  @IsOptional()
  @IsString()
  usage_datetime?: string;

  @IsOptional()
  @IsString()
  usage_type?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  department_code?: string;

  @IsOptional()
  @IsString()
  recorded_by_user_id?: string;

  @IsOptional()
  @IsString()
  billing_status?: string;

  @IsOptional()
  @IsNumber()
  billing_subtotal?: number;

  @IsOptional()
  @IsNumber()
  billing_tax?: number;

  @IsOptional()
  @IsNumber()
  billing_total?: number;

  @IsOptional()
  @IsString()
  billing_currency?: string;
}

// Update Print Information DTO (สำหรับอัพเดตข้อมูล Print โดยใช้ usage_id)
export class UpdatePrintInfoDto {
  @IsOptional()
  @IsString()
  Twu?: string; // Patient Location when Ordered

  @IsOptional()
  @IsString()
  PrintLocation?: string; // Print Location when Ordered

  @IsOptional()
  @IsString()
  PrintDate?: string; // Print Date

  @IsOptional()
  @IsString()
  TimePrintDate?: string; // Time Print Date

  @IsOptional()
  @IsString()
  update?: string; // Print Date (แยกจาก Receipt/Invoice)
}

// Query DTO
export class GetMedicalSupplyUsagesQueryDto {
  @IsOptional()
  @IsString()
  patient_hn?: string;

  @IsOptional()
  @IsString()
  HN?: string; // Support both formats

  @IsOptional()
  @IsString()
  EN?: string; // Episode Number

  @IsOptional()
  @IsString()
  department_code?: string;

  /** ชื่อแผนก (เช็คกับ DepName/DepName2 แล้วกรองตาม department_code) */
  @IsOptional()
  @IsString()
  department_name?: string;

  /** วันที่พิมพ์บิล (print_date) */
  @IsOptional()
  @IsString()
  print_date?: string;

  /** เวลาที่พิมพ์บิล (time_print_date) */
  @IsOptional()
  @IsString()
  time_print_date?: string;

  @IsOptional()
  @IsString()
  billing_status?: string;

  @IsOptional()
  @IsString()
  usage_type?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  user_name?: string;

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  lastname?: string;

  @IsOptional()
  @IsString()
  assession_no?: string;

  /** Query sends string; internal callers may pass number. Service normalizes to number. */
  @IsOptional()
  page?: number | string;

  @IsOptional()
  limit?: number | string;
}

// Query DTO for Medical Supply Usage Logs
export class GetMedicalSupplyUsageLogsQueryDto {
  @IsOptional()
  @IsString()
  patient_hn?: string;

  @IsOptional()
  @IsString()
  en?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}

// DTO สำหรับบันทึกการใช้กับคนไข้
export class RecordItemUsedWithPatientDto {
  @IsInt()
  item_id: number;

  @IsInt()
  @Min(1)
  qty_used: number; // จำนวนที่ใช้กับคนไข้

  @IsOptional()
  @IsString()
  recorded_by_user_id?: string;
}

// DTO สำหรับบันทึกการคืนอุปกรณ์เข้าตู้
export class RecordItemReturnDto {
  @IsInt()
  item_id: number;

  @IsInt()
  @Min(1)
  qty_returned: number; // จำนวนที่คืน

  @IsEnum(ReturnReason)
  return_reason: ReturnReason;

  @IsString()
  return_by_user_id: string;

  @IsOptional()
  @IsString()
  return_note?: string;
}

// รายการเดียวสำหรับบันทึกคืนโดยอ้างอิง item_stock_id (RowID)
export class RecordStockReturnItemDto {
  @IsInt()
  item_stock_id: number;

  @IsEnum(ReturnReason)
  return_reason: ReturnReason;

  @IsOptional()
  @IsString()
  return_note?: string;
}

// DTO สำหรับบันทึกคืนอุปกรณ์เข้าตู้ (ลง SupplyItemReturnRecord + อัปเดต itemstock)
export class RecordStockReturnDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecordStockReturnItemDto)
  items: RecordStockReturnItemDto[];

  @IsString()
  return_by_user_id: string;

  /** StockID (ตู้ที่คืน) — ใช้บันทึกใน SupplyItemReturnRecord */
  @IsOptional()
  @IsInt()
  stock_id?: number;
}

// Query DTO สำหรับรายการที่รอดำเนินการ
export class GetPendingItemsQueryDto {
  @IsOptional()
  @IsString()
  department_code?: string;

  @IsOptional()
  @IsString()
  patient_hn?: string;

  @IsOptional()
  @IsEnum(ItemStatus)
  item_status?: ItemStatus;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

// Query DTO สำหรับประวัติการคืน
export class GetReturnHistoryQueryDto {
  @IsOptional()
  @IsString()
  department_code?: string;

  @IsOptional()
  @IsString()
  patient_hn?: string;

  @IsOptional()
  @IsEnum(ReturnReason)
  return_reason?: ReturnReason;

  @IsOptional()
  @IsString()
  date_from?: string;

  @IsOptional()
  @IsString()
  date_to?: string;

  @IsOptional()
  page?: number | string;

  @IsOptional()
  limit?: number | string;
}

// Response Interface
export interface MedicalSupplyUsageResponse {
  id: number;
  hospital?: string;
  en?: string;
  patient_hn: string;
  first_name?: string;
  lastname?: string;
  patient_name_th?: string;
  patient_name_en?: string;
  supply_items: OrderItemResponse[];
  usage_datetime?: string;
  usage_type?: string;
  purpose?: string;
  department_code?: string;
  recorded_by_user_id?: string;
  recorded_by_name?: string;
  recorded_by_display?: string;
  billing_status?: string;
  billing_subtotal?: number;
  billing_tax?: number;
  billing_total?: number;
  billing_currency?: string;
  // Print Information (ข้อมูลการ Print - ระดับ Usage Record)
  twu?: string;             // Patient Location when Ordered
  print_location?: string;  // Print Location when Ordered
  print_date?: string;      // Print Date
  time_print_date?: string; // Time Print Date
  update?: string;          // Print Date (แยกจาก Receipt/Invoice)
  created_at: Date;
  updated_at: Date;
}
