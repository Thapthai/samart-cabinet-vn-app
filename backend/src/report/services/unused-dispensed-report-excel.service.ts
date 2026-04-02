import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { applyExcelStandardTitleHeader } from '../utils/excel-report-header.util';

export interface UnusedDispensedReportData {
  summary: {
    date: string;
    total_unused_items: number;
    total_unused_qty: number;
  };
  data: Array<{
    item_code: string;
    item_name: string;
    dispensed_date: Date;
    qty: number;
    rfid_code: string;
    hours_since_dispense: number;
  }>;
}

@Injectable()
export class UnusedDispensedReportExcelService {
  async generateReport(data: UnusedDispensedReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('รายงานรายการที่ไม่ได้ใช้');

    applyExcelStandardTitleHeader(worksheet, workbook, {
      mergeRange: 'A1:F2',
      title: 'รายงานรายการที่เบิกแล้วแต่ไม่ได้ใช้ภายในวัน',
      row1Height: 28,
      row2Height: 26,
    });

    // Summary
    worksheet.addRow([]);
    worksheet.addRow(['สรุปผล (Summary)']);
    worksheet.addRow(['วันที่', data.summary.date]);
    worksheet.addRow(['จำนวนรายการที่ไม่ได้ใช้', data.summary.total_unused_items]);
    worksheet.addRow(['จำนวนรวม', data.summary.total_unused_qty]);

    worksheet.addRow([]);
    worksheet.addRow(['หมายเหตุ: รายการที่เบิกแล้วแต่ยังไม่ได้ใช้ภายในวันเดียวกัน']);

    worksheet.addRow([]);

    // Headers
    const headerRow = worksheet.addRow([
      'รหัสอุปกรณ์',
      'ชื่ออุปกรณ์',
      'วันที่เบิก',
      'จำนวน',
      'RFID Code',
      'ชั่วโมงที่ผ่านมา',
    ]);
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF203864' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    headerRow.height = 25;

    // Data rows
    data.data.forEach((item) => {
      const row = worksheet.addRow([
        item.item_code,
        item.item_name,
        item.dispensed_date,
        item.qty,
        item.rfid_code,
        item.hours_since_dispense,
      ]);
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Tahoma', size: 11 };
        cell.alignment = { horizontal: colNumber === 2 ? 'left' : 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Set column widths
    worksheet.getColumn(1).width = 15;
    worksheet.getColumn(2).width = 30;
    worksheet.getColumn(3).width = 20;
    worksheet.getColumn(4).width = 10;
    worksheet.getColumn(5).width = 20;
    worksheet.getColumn(6).width = 15;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

