import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import { resolveReportLogoPath } from '../config/report.config';

export interface ReturnReportData {
  filters?: {
    date_from?: string;
    date_to?: string;
    return_reason?: string;
    department_code?: string;
    patient_hn?: string;
  };
  summary: {
    total_records: number;
    total_qty_returned: number;
  };
  data: Array<{
    id: number;
    qty_returned: number;
    return_reason: string;
    return_datetime: Date;
    return_by_user_id?: string;
    return_by_user_name?: string;
    return_note?: string;
    cabinet_name?: string;
    cabinet_code?: string;
    department_name?: string;
    supply_item?: {
      order_item_code?: string;
      order_item_description?: string;
      supply_code?: string;
      supply_name?: string;
      usage?: {
        patient_hn?: string;
        en?: string;
        first_name?: string;
        lastname?: string;
        department_code?: string;
      };
    };
  }>;
}

@Injectable()
export class ReturnReportExcelService {
  async generateReport(data: ReturnReportData): Promise<Buffer> {
    if (!data || !data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid data structure: data.data must be an array');
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('รายงานอุปกรณ์ที่ไม่ถูกใช้งาน', {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
      properties: { defaultRowHeight: 20 },
    });

    const reportDate = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Bangkok',
    });

    // ---- แถว 1-2: โลโก้ (A1:A2) + ชื่อรายงาน (B1:I2) ----
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

    worksheet.mergeCells('B1:I2');
    const headerCell = worksheet.getCell('B1');
    headerCell.value = 'รายงานอุปกรณ์ที่ไม่ถูกใช้งาน\nReturn Report';
    headerCell.font = { name: 'Tahoma', size: 14, bold: true, color: { argb: 'FF1A365D' } };
    headerCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
    headerCell.border = {
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };

    // ---- แถว 3: วันที่รายงาน ----
    worksheet.mergeCells('A3:I3');
    const dateCell = worksheet.getCell('A3');
    dateCell.value = `วันที่รายงาน: ${reportDate}`;
    dateCell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF6C757D' } };
    dateCell.alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.getRow(3).height = 20;

    // ---- แถว 4: Filter summary ----
    const filters = data.filters ?? {};
    const filterLabels = ['วันที่เริ่ม', 'วันที่สิ้นสุด', 'สาเหตุ', 'จำนวนรายการ'];
    const filterValues = [
      filters.date_from ?? 'ทั้งหมด',
      filters.date_to ?? 'ทั้งหมด',
      filters.return_reason ? this.getReturnReasonLabel(filters.return_reason) : 'ทั้งหมด',
      `${data.summary?.total_records ?? 0} รายการ`,
    ];
    // 9 columns (A-I) → 4 กลุ่ม: [A,B], [C,D], [E,F], [G,I]
    const filterColMap = [['A', 'B'], ['C', 'D'], ['E', 'F'], ['G', 'I']];
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

    // ---- แถว 5: Table header ----
    const tableStartRow = 5;
    const tableHeaders = [
      'ลำดับ', 'รหัสอุปกรณ์', 'ชื่ออุปกรณ์', 'ตู้',
      'ชื่อผู้เติม', 'จำนวน', 'สาเหตุ', 'วันที่', 'หมายเหตุ',
    ];
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

    // ---- แถวข้อมูล ----
    let dataRowIndex = tableStartRow + 1;
    data.data.forEach((record, idx) => {
      const excelRow = worksheet.getRow(dataRowIndex);
      const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8F9FA';
      const itemCode = record.supply_item?.order_item_code || record.supply_item?.supply_code || '-';
      const itemName = record.supply_item?.order_item_description || record.supply_item?.supply_name || '-';
      const cabinetDisplay = [record.cabinet_name || record.cabinet_code, record.department_name].filter(Boolean).join(' / ') || '-';
      const returnByName = record.return_by_user_name ?? 'ไม่ระบุ';
      const returnDate = record.return_datetime instanceof Date
        ? record.return_datetime.toLocaleDateString('th-TH')
        : new Date(record.return_datetime).toLocaleDateString('th-TH');

      [
        idx + 1,
        itemCode,
        itemName,
        cabinetDisplay,
        returnByName,
        record.qty_returned,
        this.getReturnReasonLabel(record.return_reason),
        returnDate,
        record.return_note || '-',
      ].forEach((val, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);
        cell.value = val as any;
        cell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF212529' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.alignment = {
          horizontal: colIndex === 2 || colIndex === 3 || colIndex === 4 || colIndex === 6 || colIndex === 8 ? 'left' : 'center',
          vertical: 'middle',
        };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      excelRow.height = 22;
      dataRowIndex++;
    });

    worksheet.addRow([]);

    // ---- Footer + หมายเหตุ ----
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
    noteCell.value = `จำนวนรายการทั้งหมด: ${data.summary?.total_records ?? 0} รายการ | จำนวนชิ้น: ${data.summary?.total_qty_returned ?? 0} ชิ้น`;
    noteCell.font = { name: 'Tahoma', size: 11, color: { argb: 'FF6C757D' } };
    noteCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(noteRow).height = 16;

    // ---- ความกว้างคอลัมน์ ----
    worksheet.getColumn(1).width = 13;
    worksheet.getColumn(2).width = 18;
    worksheet.getColumn(3).width = 40;
    worksheet.getColumn(4).width = 22;
    worksheet.getColumn(5).width = 18;
    worksheet.getColumn(6).width = 10;
    worksheet.getColumn(7).width = 30;
    worksheet.getColumn(8).width = 16;
    worksheet.getColumn(9).width = 22;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private getReturnReasonLabel(reason: string): string {
    const labels: { [key: string]: string } = {
      OTHER: 'อื่นๆ',
      UNWRAPPED_UNUSED: 'อื่นๆ (ข้อมูลเก่า)',
      EXPIRED: 'อุปกรณ์หมดอายุ',
      CONTAMINATED: 'อุปกรณ์มีการปนเปื้อน',
      DAMAGED: 'อุปกรณ์ชำรุด',
    };
    return labels[reason] || reason;
  }
}
