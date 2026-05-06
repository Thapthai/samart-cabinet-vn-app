export type SelectedLine = {
  itemcode: string;
  itemname: string;
  copies: number;
  departmentId: string;
  cabinetId: string;
  /** เพดานจำนวนแผ่นต่อรายการ (อัปเดตหลังเลือกตู้ + ดึง refill หรือค่าเริ่มต้น 10) */
  refillCap: number;
  /** วันหมดอายุ YYYY-MM-DD (ค.ศ.) ตรงกับ DatePickerBE / dispense — ว่างได้ */
  expireDate: string;
  /** แสดงหน่วย `หลัก (N หน่วยย่อย)` — copies × SubUnitQty */
  SubUnitQty?: number;
  unit?: { ID?: number; UnitName?: string | null };
  subUnit?: { ID?: number; UnitName?: string | null };
};
