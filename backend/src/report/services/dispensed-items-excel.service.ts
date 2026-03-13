import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import { resolveReportLogoPath } from '../config/report.config';
import { ReportConfig } from '../config/report.config';

function formatReportDate(value?: string) {
  if (!value) return '-';
  const base = new Date(value);
  const corrected =
    typeof value === 'string' && value.endsWith('Z')
      ? new Date(base.getTime() - 7 * 60 * 60 * 1000)
      : base;
  return corrected.toLocaleDateString(ReportConfig.locale, {
    timeZone: ReportConfig.timezone,
    ...ReportConfig.dateFormat.date,
  });
}

/** วันที่ + เวลา (ชั่วโมง:นาที ไม่มีวินาที) สำหรับคอลัมน์วันที่เบิก */
function formatReportDateTime(value?: string) {
  if (!value) return '-';
  const base = new Date(value);
  const corrected =
    typeof value === 'string' && value.endsWith('Z')
      ? new Date(base.getTime() - 7 * 60 * 60 * 1000)
      : base;
  return corrected.toLocaleString(ReportConfig.locale, {
    timeZone: ReportConfig.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export interface DispensedItemRow {
  RowID: number;
  itemcode: string;
  itemname: string;
  modifyDate: string;
  qty: number;
  itemCategory?: string;
  itemtypeID?: number;
  RfidCode?: string;
  StockID?: number;
  Istatus_rfid?: number;
  CabinetUserID?: number;
  cabinetUserName?: string;
  departmentName?: string;
  cabinetName?: string;
  cabinetCode?: string;
}

export interface DispensedItemsReportGroup {
  itemcode: string;
  itemname: string;
  dispenseTime: string;
  totalQty: number;
  items: DispensedItemRow[];
}

export interface DispensedItemsReportData {
  filters?: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    cabinetId?: string;
    departmentName?: string;
    cabinetName?: string;
  };
  summary: {
    total_records: number;
    total_qty: number;
  };
  data: DispensedItemRow[];
  /** กลุ่มตามรหัสอุปกรณ์และเวลาที่เบิก (±3 วินาที) สำหรับแสดงแถวสรุป + รายการย่อย */
  groups?: DispensedItemsReportGroup[];
}

@Injectable()
export class DispensedItemsExcelService {
  async generateReport(data: DispensedItemsReportData): Promise<Buffer> {
    if (!data || !data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid data structure: data.data must be an array');
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('รายงานการเบิกอุปกรณ์', {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
      properties: { defaultRowHeight: 20 },
    });

    const reportDate = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Bangkok',
    });

    // ---- แถว 1-2: โลโก้ (A1:A2) + ชื่อรายงาน (B1:H2) ----
    worksheet.mergeCells('A1:A2');
    worksheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF8F9FA' },
    };
    worksheet.getCell('A1').border = {
      right: { style: 'thin' },
      bottom: { style: 'thin' },
    };
    const logoPath = resolveReportLogoPath();
    if (logoPath && fs.existsSync(logoPath)) {
      try {
        const imageId = workbook.addImage({ filename: logoPath, extension: 'png' });
        worksheet.addImage(imageId, 'A1:A2');
      } catch {
        // skip logo on error
      }
    }
    worksheet.getRow(1).height = 20;
    worksheet.getRow(2).height = 20;
    worksheet.getColumn(1).width = 12;

    worksheet.mergeCells('B1:H2');
    const headerCell = worksheet.getCell('B1');
    headerCell.value = 'รายงานการเบิกอุปกรณ์\nDispensed Items Report';
    headerCell.font = { name: 'Tahoma', size: 14, bold: true, color: { argb: 'FF1A365D' } };
    headerCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
    headerCell.border = {
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };

    // ---- แถว 3: วันที่รายงาน ----
    worksheet.mergeCells('A3:H3');
    const dateCell = worksheet.getCell('A3');
    dateCell.value = `วันที่รายงาน: ${reportDate}`;
    dateCell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF6C757D' } };
    dateCell.alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.getRow(3).height = 20;

    // ---- แถว 4: Filter summary (แผนก | ตู้ | วันที่เริ่ม | วันที่สิ้นสุด) ----
    const filters = data.filters ?? {};
    const filterLabels = ['แผนก', 'ตู้ Cabinet', 'วันที่เริ่ม', 'วันที่สิ้นสุด'];
    const filterValues = [
      filters.departmentName ?? (filters.departmentId ? filters.departmentId : 'ทั้งหมด'),
      filters.cabinetName ?? (filters.cabinetId ? filters.cabinetId : 'ทั้งหมด'),
      filters.startDate ?? 'ทั้งหมด',
      filters.endDate ?? 'ทั้งหมด',
    ];
    // 8 columns → 4 กลุ่ม กลุ่มละ 2 คอลัมน์ (A-H)
    const filterColMap = [['A', 'B'], ['C', 'D'], ['E', 'F'], ['G', 'H']];
    filterLabels.forEach((lbl, gi) => {
      const cols = filterColMap[gi];
      worksheet.mergeCells(`${cols[0]}4:${cols[1]}4`);
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

    // ---- แถว 5: Table header (ให้ตรงกับ return-to-cabinet: ลำดับ, รหัส, ชื่อ, จำนวนชิ้น, วันที่เบิก, แผนก, ตู้, ชื่อผู้เบิก) ----
    const tableStartRow = 5;
    const tableHeaders = ['ลำดับ', 'รหัสอุปกรณ์', 'ชื่ออุปกรณ์', 'จำนวนชิ้น', 'วันที่เบิก', 'แผนก', 'ตู้', 'ชื่อผู้เบิก'];
    const headerRow = worksheet.getRow(tableStartRow);
    tableHeaders.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A365D' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    headerRow.height = 26;

    // ---- แถวข้อมูล (จัดกลุ่มหรือแบน) ----
    let dataRowIndex = tableStartRow + 1;
    const useGroups = data.groups && data.groups.length > 0;

    if (useGroups && data.groups) {
      let rowNum = 1;
      for (const group of data.groups) {
        // แถวสรุปกลุ่ม (ตรงกับ return-to-cabinet: ลำดับ, รหัส, ชื่อ, จำนวนชิ้น, วันที่เบิก, แผนก, ไม่แสดงตู้, ชื่อผู้เบิก)
        const groupRow = worksheet.getRow(dataRowIndex);
        const qtyDisplay = `${group.totalQty.toLocaleString()} `;
        const mainRowDispenser = (() => {
          const n = group.items[0]?.cabinetUserName?.trim();
          return n && n !== 'ไม่ระบุ' ? n : '-';
        })();
        [
          rowNum,
          group.itemcode,
          group.itemname || '-',
          qtyDisplay,
          formatReportDateTime(group.dispenseTime),
          group.items[0]?.departmentName ?? '-',
          '-',
          mainRowDispenser,
        ].forEach((val, colIndex) => {
          const cell = groupRow.getCell(colIndex + 1);
          cell.value = val as any;
          cell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: 'FF1A365D' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF2' } };
          cell.alignment = { horizontal: colIndex === 2 || colIndex === 4 || colIndex === 7 ? 'left' : 'center', vertical: 'middle' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
        groupRow.height = 24;
        dataRowIndex++;

        // แถวรายการในกลุ่ม (ลำดับ, รหัส, ชื่อ, จำนวนชิ้น, วันที่เบิก, แผนก, ตู้, ชื่อผู้เบิก)
        group.items.forEach((item, subIdx) => {
          const excelRow = worksheet.getRow(dataRowIndex);
          const subLabel = `${rowNum}.${subIdx + 1}`;
          [
            subLabel,
            item.itemcode,
            item.itemname ?? '-',
            item.qty ?? 1,
            formatReportDateTime(item.modifyDate),
            item.departmentName ?? '-',
            item.cabinetName ?? '-',
            item.cabinetUserName ?? 'ไม่ระบุ',
          ].forEach((val, colIndex) => {
            const cell = excelRow.getCell(colIndex + 1);
            cell.value = val as any;
            cell.font = { name: 'Tahoma', size: 11, color: { argb: 'FF212529' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
            cell.alignment = { horizontal: colIndex === 2 || colIndex === 4 || colIndex === 7 ? 'left' : 'center', vertical: 'middle' };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          });
          excelRow.height = 22;
          dataRowIndex++;
        });
        rowNum++;
      }
    } else {
      data.data.forEach((item, idx) => {
        const excelRow = worksheet.getRow(dataRowIndex);
        const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8F9FA';
        [
          idx + 1,
          item.itemcode,
          item.itemname ?? '-',
          item.qty ?? 1,
          formatReportDateTime(item.modifyDate),
          item.departmentName ?? '-',
          item.cabinetName ?? '-',
          item.cabinetUserName ?? 'ไม่ระบุ',
        ].forEach((val, colIndex) => {
          const cell = excelRow.getCell(colIndex + 1);
          cell.value = val as any;
          cell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF212529' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
          cell.alignment = {
            horizontal: colIndex === 2 || colIndex === 4 || colIndex === 7 ? 'left' : 'center',
            vertical: 'middle',
          };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
        excelRow.height = 24;
        dataRowIndex++;
      });
    }

    worksheet.addRow([]);

    // ---- Footer + หมายเหตุ ----
    const footerRow = dataRowIndex + 1;
    worksheet.mergeCells(`A${footerRow}:H${footerRow}`);
    const footerCell = worksheet.getCell(`A${footerRow}`);
    footerCell.value = 'เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ';
    footerCell.font = { name: 'Tahoma', size: 11, color: { argb: 'FFADB5BD' } };
    footerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(footerRow).height = 18;

    const noteRow = footerRow + 1;
    worksheet.mergeCells(`A${noteRow}:H${noteRow}`);
    const noteCell = worksheet.getCell(`A${noteRow}`);
    noteCell.value = `จำนวนรายการทั้งหมด: ${data.summary?.total_records ?? 0} รายการ`;
    noteCell.font = { name: 'Tahoma', size: 11, color: { argb: 'FF6C757D' } };
    noteCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(noteRow).height = 16;

    // ---- ความกว้างคอลัมน์ (8 คอลัมน์ เหมือน return-to-cabinet) ----
    worksheet.getColumn(1).width = 14;
    worksheet.getColumn(2).width = 22;
    worksheet.getColumn(3).width = 50;
    worksheet.getColumn(4).width = 18;
    worksheet.getColumn(5).width = 30;
    worksheet.getColumn(6).width = 24;
    worksheet.getColumn(7).width = 30;
    worksheet.getColumn(8).width = 30;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
