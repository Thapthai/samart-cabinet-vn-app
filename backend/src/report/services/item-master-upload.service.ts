import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';

/** รายการอ้างอิงสำหรับ dropdown (หน่วย / แผนก) */
interface RefRow {
  id: number;
  name: string;
}

/** นิยามคอลัมน์ในชีตกรอกข้อมูล */
interface TemplateColumn {
  /** คีย์ภายใน (ใช้กับ logic ฝั่ง upload) */
  key: string;
  /** ป้ายหัวคอลัมน์ (ภาษาไทย) */
  header: string;
  /** ความกว้างคอลัมน์ */
  width: number;
  /** เป็นช่องบังคับกรอกหรือไม่ */
  required?: boolean;
  /** คำอธิบายเพิ่มเติม (แสดงเป็น note บนหัวคอลัมน์) */
  note?: string;
  /** ชนิด dropdown */
  dropdown?: 'unit' | 'department' | 'status';
}

const SHEET_DATA = 'Item Master';

/** จำนวนแถวที่เปิดให้กรอก (ใส่ data validation ครอบไว้ล่วงหน้า) */
const DATA_ROWS = 1000;

/** คอลัมน์ helper (ซ่อนไว้) สำหรับเก็บค่า dropdown หน่วย/แผนก บนชีตเดียวกัน */
const HELPER_UNIT_COL = 20; // คอลัมน์ T
const HELPER_DEPT_COL = 21; // คอลัมน์ U

const STATUS_OPTIONS = ['ใช้งาน', 'ปิดการใช้งาน'];

const COLUMNS: TemplateColumn[] = [
  {
    key: 'itemcode',
    header: 'รหัส Item *',
    width: 22,
    required: true,
    note: 'รหัสเวชภัณฑ์ — บังคับกรอก เช่น MED2024001 (ถ้ามีอยู่แล้วจะอัปเดต ถ้าไม่มีจะเพิ่มใหม่)',
  },
  {
    key: 'itemname',
    header: 'ชื่ออุปกรณ์ *',
    width: 38,
    required: true,
    note: 'ชื่อเวชภัณฑ์/อุปกรณ์ — บังคับกรอก',
  },
  {
    key: 'barcode',
    header: 'บาร์โค้ด',
    width: 22,
    note: 'บาร์โค้ด (ถ้ามี)',
  },
  {
    key: 'unit',
    header: 'หน่วย (Stock)',
    width: 20,
    dropdown: 'unit',
    note: 'หน่วยนับหลักสำหรับ stock — เลือกจากรายการ',
  },
  {
    key: 'subUnit',
    header: 'หน่วยการเบิก',
    width: 20,
    dropdown: 'unit',
    note: 'หน่วยการเบิก (แสดงผลเท่านั้น ไม่ใช้คำนวณ stock) — เลือกจากรายการ',
  },
  {
    key: 'subUnitQty',
    header: 'จำนวนหน่วยการเบิกต่อ 1 หน่วย',
    width: 26,
    note: 'ตัวเลข เช่น 18 (เม็ดต่อกล่อง) — ใช้แสดงผลเท่านั้น',
  },
  {
    key: 'department1',
    header: 'แผนกที่ใช้ 1',
    width: 24,
    dropdown: 'department',
    note: 'แผนก/Division ที่ใช้ Item นี้ — เลือกจากรายการ (เว้นว่าง = ทุกแผนก)',
  },
  {
    key: 'department2',
    header: 'แผนกที่ใช้ 2',
    width: 24,
    dropdown: 'department',
    note: 'แผนกเพิ่มเติม (ไม่บังคับ)',
  },
  {
    key: 'department3',
    header: 'แผนกที่ใช้ 3',
    width: 24,
    dropdown: 'department',
    note: 'แผนกเพิ่มเติม (ไม่บังคับ) — สูงสุด 3 แผนกต่อ Item',
  },
  {
    key: 'description',
    header: 'คำอธิบาย',
    width: 40,
    note: 'รายละเอียดเพิ่มเติม (ถ้ามี)',
  },
  {
    key: 'status',
    header: 'สถานะ',
    width: 16,
    dropdown: 'status',
    note: 'ใช้งาน / ปิดการใช้งาน (เว้นว่าง = ใช้งาน)',
  },
];

const COLOR = {
  headerBg: 'FF1A365D',
  headerText: 'FFFFFFFF',
  requiredBg: 'FFB7791F',
  exampleBg: 'FFF1F5F9',
  exampleText: 'FF94A3B8',
  border: 'FFB0B7C3',
};

/**
 * สร้างไฟล์ Excel template สำหรับเพิ่ม/อัปเดต Item Master (ส่วนของ report)
 * — การอ่านไฟล์ที่อัปโหลด (parse + upsert) อยู่ที่ item module
 */
@Injectable()
export class ItemMasterUploadService {
  constructor(private readonly prisma: PrismaService) {}

  /** ดึง units + departments จาก DB แล้วสร้างไฟล์ template */
  async buildTemplate(): Promise<{ buffer: Buffer; filename: string }> {
    const [units, departments] = await Promise.all([
      this.prisma.unit.findMany({
        where: { OR: [{ IsCancel: false }, { IsCancel: null }] },
        orderBy: { UnitName: 'asc' },
        select: { ID: true, UnitName: true },
      }),
      this.prisma.department.findMany({
        where: { OR: [{ IsCancel: 0 }, { IsCancel: null }] },
        orderBy: { DepName: 'asc' },
        select: { ID: true, DepName: true, DepName2: true },
      }),
    ]);

    const unitRows: RefRow[] = units
      .filter((u) => (u.UnitName ?? '').trim() !== '')
      .map((u) => ({ id: u.ID, name: (u.UnitName ?? '').trim() }));
    const deptRows: RefRow[] = departments
      .map((d) => ({ id: d.ID, name: (d.DepName || d.DepName2 || '').trim() }))
      .filter((d) => d.name !== '');

    const buffer = await this.generateTemplate(unitRows, deptRows);
    const date = new Date().toISOString().split('T')[0];
    return { buffer, filename: `item_master_template_${date}.xlsx` };
  }

  /** สร้างไฟล์ Excel template (ชีตเดียว) */
  private async generateTemplate(units: RefRow[], departments: RefRow[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Samart Cabinet';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(SHEET_DATA, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    // หัวคอลัมน์
    const headerRow = sheet.getRow(1);
    COLUMNS.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = col.header;
      cell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: COLOR.headerText } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: col.required ? COLOR.requiredBg : COLOR.headerBg },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: COLOR.border } },
        left: { style: 'thin', color: { argb: COLOR.border } },
        bottom: { style: 'thin', color: { argb: COLOR.border } },
        right: { style: 'thin', color: { argb: COLOR.border } },
      };
      if (col.note) {
        cell.note = {
          texts: [{ text: col.note }],
          margins: { insetmode: 'auto' },
        } as ExcelJS.Comment;
      }
      sheet.getColumn(idx + 1).width = col.width;
    });
    headerRow.height = 32;

    // เก็บค่า dropdown (หน่วย/แผนก) ไว้ในคอลัมน์ helper ที่ซ่อนไว้บนชีตเดียวกัน
    units.forEach((u, i) => {
      sheet.getCell(i + 1, HELPER_UNIT_COL).value = u.name;
    });
    departments.forEach((d, i) => {
      sheet.getCell(i + 1, HELPER_DEPT_COL).value = d.name;
    });
    sheet.getColumn(HELPER_UNIT_COL).hidden = true;
    sheet.getColumn(HELPER_DEPT_COL).hidden = true;

    // ใส่ data validation (dropdown) ครอบทุกแถวที่เปิดให้กรอก
    const firstDataRow = 2;
    const lastDataRow = firstDataRow + DATA_ROWS - 1;
    const unitColLetter = sheet.getColumn(HELPER_UNIT_COL).letter;
    const deptColLetter = sheet.getColumn(HELPER_DEPT_COL).letter;
    const unitRange =
      units.length > 0 ? `$${unitColLetter}$1:$${unitColLetter}$${units.length}` : null;
    const deptRange =
      departments.length > 0 ? `$${deptColLetter}$1:$${deptColLetter}$${departments.length}` : null;

    COLUMNS.forEach((col, idx) => {
      if (!col.dropdown) return;
      let formulae: string[] | null = null;
      if (col.dropdown === 'status') {
        formulae = [`"${STATUS_OPTIONS.join(',')}"`];
      } else if (col.dropdown === 'unit' && unitRange) {
        formulae = [unitRange];
      } else if (col.dropdown === 'department' && deptRange) {
        formulae = [deptRange];
      }
      if (!formulae) return;

      const colLetter = sheet.getColumn(idx + 1).letter;
      for (let r = firstDataRow; r <= lastDataRow; r++) {
        sheet.getCell(`${colLetter}${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae,
          showErrorMessage: col.dropdown === 'status',
          errorStyle: 'warning',
          errorTitle: 'ค่าไม่ถูกต้อง',
          error: 'กรุณาเลือกจากรายการที่กำหนด',
        };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
