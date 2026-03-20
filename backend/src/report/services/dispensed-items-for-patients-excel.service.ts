import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import { resolveReportLogoPath } from '../config/report.config';
import { formatReportDateOnly, formatReportDateTime } from '../utils/date-timeformat';

/** filter วันที่เริ่ม/สิ้นสุด: ว่าง = ทั้งหมด, มีค่า = วันที่อย่างเดียว (ไม่มีเวลา) */
function formatFilterDateOnly(v?: string | null): string {
  if (v == null || String(v).trim() === '') return 'ทั้งหมด';
  return formatReportDateOnly(v);
}

/** รายการอุปกรณ์ในหนึ่ง usage (สำหรับ sub row) */
export interface DispensedItemLine {
  itemcode: string;
  itemname: string;
  qty: number;
  uom?: string;
  assession_no?: string;
  order_item_status?: string;
}

/** แปลงสถานะให้แสดงเหมือนเว็บ: discontinue→ยกเลิก, verified→ยืนยันแล้ว */
function getStatusLabel(status?: string): string {
  if (status == null || status === '') return '-';
  const lower = status.toLowerCase();
  if (lower === 'discontinue' || lower === 'discontinued') return 'ยกเลิก';
  if (lower === 'verified') return 'ยืนยันแล้ว';
  return status;
}

/** หนึ่ง usage = หนึ่งคนไข้/หนึ่งครั้งเบิก มีหลาย supply_items */
export interface DispensedUsageGroup {
  usage_id: number;
  seq: number;
  patient_hn: string;
  patient_name: string;
  en?: string;
  department_code?: string;
  department_name?: string;
  usage_type?: string;
  dispensed_date: string;
  supply_items: DispensedItemLine[];
}

export interface DispensedItemsForPatientsReportData {
  filters?: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    patientHn?: string;
    departmentCode?: string;
    departmentName?: string;
    usageType?: string;
  };
  summary: {
    total_records: number;
    total_qty: number;
    total_patients: number;
  };
  data: DispensedUsageGroup[];
}

@Injectable()
export class DispensedItemsForPatientsExcelService {
  async generateReport(data: DispensedItemsForPatientsReportData): Promise<Buffer> {
    if (!data || !data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid data structure: data.data must be an array');
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('รายการเบิกอุปกรณ์ใช้กับคนไข้', {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
      properties: { defaultRowHeight: 20 },
    });

    const reportDate = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Bangkok',
    });

    // ---- แถว 1-2: โลโก้ (A1:A2) + ชื่อรายงาน (B1:K2) ----
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

    worksheet.mergeCells('B1:K2');
    const headerCell = worksheet.getCell('B1');
    headerCell.value = 'รายการเบิกอุปกรณ์ใช้กับคนไข้\nDispensed Items for Patients Report';
    headerCell.font = { name: 'Tahoma', size: 18, bold: true, color: { argb: 'FF1A365D' } };
    headerCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
    headerCell.border = {
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };

    // ---- แถว 3: วันที่รายงาน ----
    worksheet.mergeCells('A3:K3');
    const dateCell = worksheet.getCell('A3');
    dateCell.value = `วันที่รายงาน: ${reportDate}`;
    dateCell.font = { name: 'Tahoma', size: 15, color: { argb: 'FF6C757D' } };
    dateCell.alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.getRow(3).height = 20;

    // ---- แถว 4: Filter summary (วันที่เริ่ม | วันที่สิ้นสุด | แผนก | ประเภทผู้ป่วย) ----
    const filters = data.filters ?? {};
    const filterLabels = ['วันที่เริ่ม', 'วันที่สิ้นสุด', 'แผนก', 'ประเภทผู้ป่วย'];
    const filterValues = [
      formatFilterDateOnly(filters.startDate),
      formatFilterDateOnly(filters.endDate),
      (filters as any).departmentName ?? filters.departmentCode ?? 'ทั้งหมด',
      filters.usageType === 'OPD' ? 'ผู้ป่วยนอก (OPD)'
        : filters.usageType === 'IPD' ? 'ผู้ป่วยใน (IPD)'
        : 'ทั้งหมด',
    ];
    // 11 columns → 4 กลุ่ม: A-C(3), D-F(3), G-I(3), J-K(2)
    const filterColMap = [['A', 'C'], ['D', 'F'], ['G', 'I'], ['J', 'K']];
    filterLabels.forEach((lbl, gi) => {
      const cols = filterColMap[gi];
      worksheet.mergeCells(`${cols[0]}4:${cols[1]}4`);
      const cell = worksheet.getCell(`${cols[0]}4`);
      cell.value = `${lbl}: ${filterValues[gi]}`;
      cell.font = { name: 'Tahoma', size: 17, bold: true, color: { argb: 'FF1A365D' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF2' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });
    worksheet.getRow(4).height = 28;

    // ---- แถว 5: Table header (11 คอลัมน์) ----
    const tableStartRow = 5;
    const tableHeaders = [
      'ลำดับ',        // 1
      'HN / EN',      // 2
      'ชื่อคนไข้',    // 3
      'แผนก',         // 4
      'ประเภท',       // 5
      'วันที่เบิก',   // 6
      'รหัสอุปกรณ์',  // 7
      'ชื่ออุปกรณ์',  // 8
      'จำนวนอุปกรณ์', // 9
      'Assession No', // 10
      'สถานะ',        // 11
    ];
    const headerRow = worksheet.getRow(tableStartRow);
    tableHeaders.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { name: 'Tahoma', size: 17, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A365D' } };
      cell.alignment = {
        horizontal: i === 1 || i === 2 || i === 7 ? 'left' : 'center',
        vertical: 'middle',
      };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    headerRow.height = 32;

    // ---- แถวข้อมูล ----
    let dataRowIndex = tableStartRow + 1;
    data.data.forEach((usage, idx) => {
      const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8F9FA';
      const items = usage.supply_items ?? [];
      const totalQty = items
        .filter((i) => (i.order_item_status ?? '').toLowerCase() === 'verified')
        .reduce((s, i) => s + i.qty, 0);

      const hnEn = `${usage.patient_hn ?? '-'} / ${usage.en ?? '-'}`;
      const usageTypeLabel = (usage.usage_type ?? '').toUpperCase() === 'IPD' ? 'ผู้ป่วยใน (IPD)'
        : (usage.usage_type ?? '').toUpperCase() === 'OPD' ? 'ผู้ป่วยนอก (OPD)'
        : (usage.usage_type ?? '-');

      // Main row
      const mainCells: (string | number)[] = [
        usage.seq,
        hnEn,
        usage.patient_name ?? '-',
        usage.department_name ?? usage.department_code ?? '-',
        usageTypeLabel,
        formatReportDateTime(usage.dispensed_date),
        '', '', totalQty, '', '',
      ];
      const excelRow = worksheet.getRow(dataRowIndex);
      mainCells.forEach((val, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);
        cell.value = val;
        cell.font = { name: 'Tahoma', size: 17, color: { argb: 'FF212529' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.alignment = {
          horizontal: colIndex === 1 || colIndex === 2 || colIndex === 7 ? 'left' : 'center',
          vertical: 'middle',
        };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      excelRow.height = 28;
      dataRowIndex++;

      // Sub rows
      items.forEach((item) => {
        const subRow = worksheet.getRow(dataRowIndex);
        const statusLabel = getStatusLabel(item.order_item_status);
        const subCells: (string | number)[] = [
          '', '', '', '', '', '',
          '└ ' + (item.itemcode ?? '-'),
          item.itemname ?? '-',
          item.qty ?? 0,
          item.assession_no ?? '-',
          statusLabel,
        ];
        subCells.forEach((val, colIndex) => {
          const cell = subRow.getCell(colIndex + 1);
          cell.value = val;
          if (colIndex === 10) {
            const statusLower = String(val).toLowerCase();
            if (statusLower === 'ยืนยันแล้ว' || statusLower === 'verified') {
              cell.font = { name: 'Tahoma', size: 17, color: { argb: 'FF16A34A' }, bold: true };
            } else if (statusLower === 'ยกเลิก' || statusLower === 'discontinue' || statusLower === 'discontinued') {
              cell.font = { name: 'Tahoma', size: 17, color: { argb: 'FFDC2626' }, bold: true };
            } else {
              cell.font = { name: 'Tahoma', size: 17, color: { argb: 'FF212529' } };
            }
          } else {
            cell.font = { name: 'Tahoma', size: 17, color: { argb: 'FF212529' } };
          }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F8FF' } };
          cell.alignment = {
            horizontal: colIndex === 7 ? 'left' : 'center',
            vertical: 'middle',
          };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
        subRow.height = 22;
        dataRowIndex++;
      });
    });

    worksheet.addRow([]);

    // ---- Footer + หมายเหตุ ----
    const footerRow = dataRowIndex + 1;
    worksheet.mergeCells(`A${footerRow}:K${footerRow}`);
    const footerCell = worksheet.getCell(`A${footerRow}`);
    footerCell.value = 'เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ';
    footerCell.font = { name: 'Tahoma', size: 15, color: { argb: 'FFADB5BD' } };
    footerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(footerRow).height = 18;

    const noteRow = footerRow + 1;
    worksheet.mergeCells(`A${noteRow}:K${noteRow}`);
    const noteCell = worksheet.getCell(`A${noteRow}`);
    noteCell.value = `จำนวนรายการทั้งหมด: ${data.summary?.total_records ?? 0} รายการ | จำนวนคนไข้: ${data.summary?.total_patients ?? 0} ราย`;
    noteCell.font = { name: 'Tahoma', size: 17, color: { argb: 'FF6C757D' } };
    noteCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(noteRow).height = 16;

    // ---- ความกว้างคอลัมน์ ----
    worksheet.getColumn(1).width = 13;
    worksheet.getColumn(2).width = 30;
    worksheet.getColumn(3).width = 30;
    worksheet.getColumn(4).width = 20;
    worksheet.getColumn(5).width = 20;
    worksheet.getColumn(6).width = 25;
    worksheet.getColumn(7).width = 25;
    worksheet.getColumn(8).width = 35;
    worksheet.getColumn(9).width = 14;
    worksheet.getColumn(10).width = 20;
    worksheet.getColumn(11).width = 12;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
