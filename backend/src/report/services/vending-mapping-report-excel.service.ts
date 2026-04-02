import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { applyExcelStandardTitleHeader } from '../utils/excel-report-header.util';

export interface VendingMappingReportData {
  filters?: {
    startDate?: string;
    endDate?: string;
    printDate?: string;
  };
  summary: {
    total_days: number;
    total_episodes: number;
    total_patients: number;
    total_items: number;
    total_mapped: number;
    total_unmapped: number;
  };
  data: Array<{
    print_date: string;
    total_episodes: number;
    total_patients: number;
    total_items: number;
    mapped_items: Array<{
      item_code: string;
      item_name: string;
      patient_hn: string;
      patient_name: string;
      en: string;
      qty: number;
      assession_no: string;
      dispensed_date: Date;
      rfid_code: string;
    }>;
    unmapped_items: Array<{
      item_code: string;
      item_name: string;
      patient_hn: string;
      patient_name: string;
      en: string;
      qty: number;
      assession_no: string;
    }>;
  }>;
}

@Injectable()
export class VendingMappingReportExcelService {
  async generateReport(data: VendingMappingReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('รายงาน Mapping Vending');

    applyExcelStandardTitleHeader(worksheet, workbook, {
      mergeRange: 'A1:J2',
      title: 'รายงานสรุป Mapping Vending กับ HIS',
      row1Height: 28,
      row2Height: 26,
    });

    // Summary
    worksheet.addRow([]);
    const summaryRow = worksheet.addRow(['สรุปผล (Summary)']);
    worksheet.mergeCells(`A${summaryRow.number}:J${summaryRow.number}`);
    summaryRow.getCell(1).font = { name: 'Tahoma', size: 14, bold: true };
    summaryRow.height = 25;

    worksheet.addRow(['จำนวนวัน', data.summary.total_days]);
    worksheet.addRow(['จำนวน Episode', data.summary.total_episodes]);
    worksheet.addRow(['จำนวนผู้ป่วย', data.summary.total_patients]);
    worksheet.addRow(['จำนวนรายการทั้งหมด', data.summary.total_items]);
    worksheet.addRow(['รายการที่ Mapping ได้', data.summary.total_mapped]);
    worksheet.addRow(['รายการที่ Mapping ไม่ได้', data.summary.total_unmapped]);

    worksheet.addRow([]);

    // Headers
    const headerRow = worksheet.addRow([
      'วันที่ Print',
      'จำนวน Episode',
      'จำนวนผู้ป่วย',
      'จำนวนรายการ',
      'Mapping ได้',
      'Mapping ไม่ได้',
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
    data.data.forEach((day) => {
      const row = worksheet.addRow([
        day.print_date,
        day.total_episodes,
        day.total_patients,
        day.total_items,
        day.mapped_items.length,
        day.unmapped_items.length,
      ]);
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Tahoma', size: 11 };
        cell.alignment = { horizontal: colNumber === 1 ? 'left' : 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Set column widths
    worksheet.getColumn(1).width = 20;
    worksheet.getColumn(2).width = 15;
    worksheet.getColumn(3).width = 15;
    worksheet.getColumn(4).width = 15;
    worksheet.getColumn(5).width = 15;
    worksheet.getColumn(6).width = 15;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

