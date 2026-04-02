import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { applyExcelStandardTitleHeader } from '../utils/excel-report-header.util';

/** แถวรายงานสต๊อกอุปกรณ์ในตู้ */
export interface CabinetStockRow {
  seq: number;
  department_name: string;
  item_code: string;
  item_name: string;
  balance_qty: number;
  qty_in_use: number;
  damaged_qty: number;
  stock_max: number | null;
  stock_min: number | null;
  refill_qty: number;
}

export interface CabinetStockReportData {
  filters?: {
    cabinetId?: number;
    cabinetCode?: string;
    cabinetName?: string;
    departmentId?: number;
    departmentName?: string;
  };
  summary: { total_rows: number; total_qty: number; total_refill_qty: number };
  data: CabinetStockRow[];
}

@Injectable()
export class CabinetStockReportExcelService {
  async generateReport(data: CabinetStockReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('รายงานสต๊อกอุปกรณ์ในตู้', {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
      properties: { defaultRowHeight: 20 },
    });

    const reportDate = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Bangkok',
    });

    applyExcelStandardTitleHeader(worksheet, workbook, {
      mergeRange: 'A1:I2',
      title: 'รายงานสต๊อกอุปกรณ์ในตู้\nCabinet Stock Report',
      row1Height: 20,
      row2Height: 20,
    });

    // แถว 3: วันที่รายงาน
    worksheet.mergeCells('A3:I3');
    const dateCell = worksheet.getCell('A3');
    dateCell.value = `วันที่รายงาน: ${reportDate}`;
    dateCell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF6C757D' } };
    dateCell.alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.getRow(3).height = 20;

    // แถว 4: Filter summary (ตู้ | แผนก | สรุป)
    const filters = data.filters ?? {};
    const filterLabels = ['ตู้ Cabinet', 'แผนก', 'จำนวนรายการ'];
    const filterValues = [
      filters.cabinetName ?? filters.cabinetCode ?? 'ทั้งหมด',
      filters.departmentName ?? (filters.departmentId != null ? `แผนก ${filters.departmentId}` : 'ทั้งหมด'),
      `${data.summary?.total_rows ?? 0} รายการ`,
    ];

    // 9 columns → แบ่ง 3 กลุ่ม กลุ่มละ 3 คอลัมน์
    const filterColMap = [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'I']];
    filterLabels.forEach((lbl, gi) => {
      const cols = filterColMap[gi];
      const rangeLabel = `${cols[0]}4:${cols[2]}4`;
      worksheet.mergeCells(rangeLabel);
      const cell = worksheet.getCell(`${cols[0]}4`);
      cell.value = `${lbl}: ${filterValues[gi]}`;
      cell.font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FF1A365D' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF2' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });
    worksheet.getRow(4).height = 20;

    // ---- ตารางข้อมูล (แสดงก่อน สรุปผล/เงื่อนไข) ----
    const tableStartRow = 5;
    const headers = ['ลำดับ', 'แผนก', 'รหัสอุปกรณ์', 'อุปกรณ์', 'จำนวนในตู้', 'ถูกใช้งาน', 'ไม่ถูกใช้งาน', 'Min / Max', 'จำนวนที่ต้องเติม'];
    const headerRow = worksheet.getRow(tableStartRow);
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A365D' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    headerRow.height = 26;

    const LIGHT_RED = 'FFF8D7D7';
    let dataRowIndex = tableStartRow + 1;
    data.data.forEach((row, idx) => {
      const excelRow = worksheet.getRow(dataRowIndex);
      const hasRefill = (row.refill_qty ?? 0) > 0;
      const bg = hasRefill ? LIGHT_RED : (idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8F9FA');
      const minMaxStr =
        row.stock_min != null && row.stock_max != null
          ? `${row.stock_min} / ${row.stock_max}`
          : row.stock_min != null
            ? `${row.stock_min} / -`
            : row.stock_max != null
              ? `- / ${row.stock_max}`
              : '-';
      [
        row.seq,
        row.department_name ?? '-',
        row.item_code,
        row.item_name ?? '-',
        row.balance_qty,
        row.qty_in_use ?? 0,
        row.damaged_qty ?? 0,
        minMaxStr,
        row.refill_qty,
      ].forEach((val, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);
        cell.value = val;
        cell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF212529' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.alignment = {
          horizontal: colIndex === 1 || colIndex === 2 || colIndex === 3 ? 'left' : 'center',
          vertical: 'middle',
        };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      excelRow.height = 22;
      dataRowIndex++;
    });

    worksheet.addRow([]);
    // Footer + หมายเหตุ
    const footerRow = dataRowIndex + 1;
    worksheet.mergeCells(`A${footerRow}:I${footerRow}`);
    const footerCell = worksheet.getCell(`A${footerRow}`);
    footerCell.value = 'เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ';
    footerCell.font = { name: 'Tahoma', size: 11, color: { argb: 'FFADB5BD' } };
    footerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(footerRow).height = 18;
    const noteRow = footerRow + 1;
    worksheet.mergeCells(`A${noteRow}:I${noteRow}`);
    const noteCell = worksheet.getCell(`A${noteRow}`);
    noteCell.value = 'หมายเหตุ: จำนวนในตู้ = จำนวนชิ้นในตู้ (IsStock=1) เท่านั้น | ถูกใช้งาน = จาก supply_usage_items วันที่รายงาน';
    noteCell.font = { name: 'Tahoma', size: 11, color: { argb: 'FF6C757D' } };
    noteCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(noteRow).height = 16;

    worksheet.getColumn(1).width = 13;
    worksheet.getColumn(2).width = 18;
    worksheet.getColumn(3).width = 25;
    worksheet.getColumn(4).width = 58;
    worksheet.getColumn(5).width = 15;
    worksheet.getColumn(6).width = 18;
    worksheet.getColumn(7).width = 18;
    worksheet.getColumn(8).width = 18;
    worksheet.getColumn(9).width = 25;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
