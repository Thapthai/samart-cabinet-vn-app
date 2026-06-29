import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { ItemService } from './item.service';

const SHEET_DATA = 'Item Master';

/** header ของแต่ละคอลัมน์ในไฟล์ template (ต้องตรงกับฝั่ง report ที่สร้าง template) */
const COLUMN_HEADERS: Record<string, string> = {
  itemcode: 'รหัส Item *',
  itemname: 'ชื่ออุปกรณ์ *',
  barcode: 'บาร์โค้ด',
  unit: 'หน่วย (Stock)',
  subUnit: 'หน่วยการเบิก',
  subUnitQty: 'จำนวนหน่วยการเบิกต่อ 1 หน่วย',
  department1: 'แผนกที่ใช้ 1',
  department2: 'แผนกที่ใช้ 2',
  department3: 'แผนกที่ใช้ 3',
  description: 'คำอธิบาย',
  status: 'สถานะ',
};

export interface ItemMasterUploadRowError {
  row: number;
  itemcode?: string;
  message: string;
}

export interface ItemMasterUploadResult {
  total: number;
  created: number;
  updated: number;
  failed: number;
  errors: ItemMasterUploadRowError[];
}

/** แปลงค่า cell ของ ExcelJS เป็นข้อความ */
function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value).trim();
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    const obj = value as { text?: string; result?: unknown; richText?: { text: string }[] };
    if (typeof obj.text === 'string') return obj.text.trim();
    if (Array.isArray(obj.richText)) return obj.richText.map((t) => t.text).join('').trim();
    if (obj.result != null) return String(obj.result).trim();
  }
  return String(value).trim();
}

function cellToInt(value: ExcelJS.CellValue): number | undefined {
  const s = cellToString(value);
  if (s === '') return undefined;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeKey(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * อ่านไฟล์ Excel ที่อัปโหลด → ตรวจสอบ → upsert Item (ส่วนของ item module)
 * — การสร้าง/ดาวน์โหลด template อยู่ที่ report module
 */
@Injectable()
export class ItemMasterUploadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemService: ItemService,
  ) {}

  /** อ่านไฟล์ Excel → ตรวจสอบ → upsert Item ทีละแถว (ซ้ำ = update, ไม่ซ้ำ = insert) */
  async parseAndCreate(fileBuffer: Buffer): Promise<ItemMasterUploadResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as unknown as ArrayBuffer);

    const sheet = workbook.getWorksheet(SHEET_DATA) ?? workbook.worksheets[0];
    if (!sheet) {
      return { total: 0, created: 0, updated: 0, failed: 0, errors: [{ row: 0, message: 'ไม่พบชีตข้อมูลในไฟล์' }] };
    }

    // map header → column index (1-based) จากแถวที่ 1
    const headerRow = sheet.getRow(1);
    const headerToCol = new Map<string, number>();
    headerRow.eachCell((cell, colNumber) => {
      const text = normalizeKey(cellToString(cell.value));
      if (text) headerToCol.set(text, colNumber);
    });

    const colOf = (key: keyof typeof COLUMN_HEADERS): number | undefined => {
      const header = COLUMN_HEADERS[key];
      if (!header) return undefined;
      return headerToCol.get(normalizeKey(header));
    };

    const colItemcode = colOf('itemcode');
    const colItemname = colOf('itemname');
    if (!colItemcode || !colItemname) {
      return {
        total: 0,
        created: 0,
        updated: 0,
        failed: 0,
        errors: [{ row: 1, message: 'รูปแบบไฟล์ไม่ถูกต้อง: ไม่พบคอลัมน์ "รหัส Item" หรือ "ชื่ออุปกรณ์" (กรุณาใช้ template ล่าสุด)' }],
      };
    }
    const colBarcode = colOf('barcode');
    const colUnit = colOf('unit');
    const colSubUnit = colOf('subUnit');
    const colSubUnitQty = colOf('subUnitQty');
    const colDept1 = colOf('department1');
    const colDept2 = colOf('department2');
    const colDept3 = colOf('department3');
    const colDescription = colOf('description');
    const colStatus = colOf('status');

    // โหลด map ชื่อ → id
    const [units, departments] = await Promise.all([
      this.prisma.unit.findMany({ select: { ID: true, UnitName: true } }),
      this.prisma.department.findMany({ select: { ID: true, DepName: true, DepName2: true } }),
    ]);
    const unitMap = new Map<string, number>();
    units.forEach((u) => {
      const name = (u.UnitName ?? '').trim();
      if (name) unitMap.set(normalizeKey(name), u.ID);
    });
    const deptMap = new Map<string, number>();
    departments.forEach((d) => {
      [d.DepName, d.DepName2].forEach((n) => {
        const name = (n ?? '').trim();
        if (name && !deptMap.has(normalizeKey(name))) deptMap.set(normalizeKey(name), d.ID);
      });
    });

    const result: ItemMasterUploadResult = {
      total: 0,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
    };
    const seenCodes = new Set<string>();

    const lastRow = sheet.rowCount;
    for (let r = 2; r <= lastRow; r++) {
      const row = sheet.getRow(r);
      const getCell = (col?: number): ExcelJS.CellValue =>
        col ? row.getCell(col).value : null;

      const itemcode = cellToString(getCell(colItemcode));
      const itemname = cellToString(getCell(colItemname));
      const description = cellToString(getCell(colDescription));

      // ข้ามแถวว่าง
      if (itemcode === '' && itemname === '') continue;

      result.total++;

      // ตรวจสอบช่องบังคับ (เฉพาะ รหัส Item และ ชื่ออุปกรณ์)
      if (itemcode === '') {
        result.failed++;
        result.errors.push({ row: r, message: 'ไม่ได้กรอกรหัส Item' });
        continue;
      }
      if (itemname === '') {
        result.failed++;
        result.errors.push({ row: r, itemcode, message: 'ไม่ได้กรอกชื่ออุปกรณ์' });
        continue;
      }

      // ซ้ำในไฟล์
      const codeKey = normalizeKey(itemcode);
      if (seenCodes.has(codeKey)) {
        result.failed++;
        result.errors.push({ row: r, itemcode, message: 'รหัส Item ซ้ำกันในไฟล์' });
        continue;
      }
      seenCodes.add(codeKey);

      // มีอยู่แล้วหรือไม่ → ใช้ตัดสินใจ update / insert
      const existing = await this.prisma.item.findUnique({
        where: { itemcode },
        select: { itemcode: true },
      });

      // หน่วย
      let unitId: number | undefined;
      const unitName = cellToString(getCell(colUnit));
      if (unitName !== '') {
        unitId = unitMap.get(normalizeKey(unitName));
        if (unitId == null) {
          result.failed++;
          result.errors.push({ row: r, itemcode, message: `ไม่พบหน่วย "${unitName}" ในระบบ` });
          continue;
        }
      }

      // หน่วยการเบิก
      let subUnitId: number | undefined;
      const subUnitName = cellToString(getCell(colSubUnit));
      if (subUnitName !== '') {
        subUnitId = unitMap.get(normalizeKey(subUnitName));
        if (subUnitId == null) {
          result.failed++;
          result.errors.push({ row: r, itemcode, message: `ไม่พบหน่วยการเบิก "${subUnitName}" ในระบบ` });
          continue;
        }
      }

      // แผนก 1-3
      const deptNames = [
        cellToString(getCell(colDept1)),
        cellToString(getCell(colDept2)),
        cellToString(getCell(colDept3)),
      ].filter((n) => n !== '');
      let deptError: string | null = null;
      const departmentIds: number[] = [];
      for (const dn of deptNames) {
        const id = deptMap.get(normalizeKey(dn));
        if (id == null) {
          deptError = `ไม่พบแผนก "${dn}" ในระบบ`;
          break;
        }
        if (!departmentIds.includes(id)) departmentIds.push(id);
      }
      if (deptError) {
        result.failed++;
        result.errors.push({ row: r, itemcode, message: deptError });
        continue;
      }

      // สถานะ → IsCancel
      const statusText = cellToString(getCell(colStatus));
      const isCancel = statusText.includes('ปิด') ? 1 : 0;

      const subUnitQty = cellToInt(getCell(colSubUnitQty));
      const barcode = cellToString(getCell(colBarcode));

      const dto = {
        itemcode,
        itemname,
        ...(barcode !== '' ? { Barcode: barcode } : {}),
        ...(unitId != null ? { UnitID: unitId } : {}),
        ...(subUnitId != null ? { SubUnitID: subUnitId } : {}),
        ...(subUnitQty != null && subUnitQty >= 1 ? { SubUnitQty: subUnitQty } : {}),
        ...(description !== '' ? { Description: description } : {}),
        department_ids: departmentIds,
        IsCancel: isCancel,
        item_status: isCancel === 1 ? 1 : 0,
        IsNormal: '1',
        IsStock: true,
      };

      const opRes = existing
        ? await this.itemService.updateItem(itemcode, dto as any)
        : await this.itemService.createItem(dto as any);

      if (opRes?.success) {
        if (existing) result.updated++;
        else result.created++;
      } else {
        result.failed++;
        result.errors.push({
          row: r,
          itemcode,
          message: opRes?.message || opRes?.error || (existing ? 'อัปเดต Item ไม่สำเร็จ' : 'สร้าง Item ไม่สำเร็จ'),
        });
      }
    }

    return result;
  }
}
