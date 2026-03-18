import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import { resolveReportLogoPath } from '../config/report.config';
import { ItemComparisonReportData, UsageDetail } from '../types/item-comparison-report.types';

/** ธีมเดียวกับชีตสรุป */
const THEME = {
  navy: 'FF1A365D',
  navyLight: 'FFE8EDF2',
  pageBg: 'FFF8F9FA',
  rowAlt: 'FFF8F9FA',
  textMuted: 'FF6C757D',
  textBody: 'FF212529',
  footer: 'FFADB5BD',
} as const;

const BORDER = {
  top: { style: 'thin' as const, color: { argb: 'FF000000' } },
  left: { style: 'thin' as const, color: { argb: 'FF000000' } },
  bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
  right: { style: 'thin' as const, color: { argb: 'FF000000' } },
};

function formatOrderDateTimeBangkok(value: Date | string | null | undefined): string {
  if (value == null || value === '') return '-';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '-';
  return d
    .toLocaleString('en-GB', {
      timeZone: 'Asia/Bangkok',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    .replace(',', '');
}

function formatPeriodDate(value: string | Date | null | undefined): string {
  if (value == null || value === '') return '-';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-GB', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function orderStatusLabel(status?: string): string {
  if (status == null || status === '') return '-';
  const u = status.toLowerCase();
  if (u === 'verified') return 'Verified';
  if (u === 'discontinue' || u === 'discontinued') return 'Discontinued';
  return status;
}

@Injectable()
export class ItemComparisonExcelService {
  async generateReport(data: ItemComparisonReportData): Promise<Buffer> {
    if (!data || !data.comparison) {
      throw new Error('Invalid report data: comparison data is missing');
    }

    const comparisonData = Array.isArray(data.comparison) ? data.comparison : [];
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();

    const reportDate = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Bangkok',
    });

    let logoImageId: number | null = null;
    const logoPath = resolveReportLogoPath();
    if (logoPath && fs.existsSync(logoPath)) {
      try {
        logoImageId = workbook.addImage({ filename: logoPath, extension: 'png' });
      } catch {
        logoImageId = null;
      }
    }

    // ชีต 1: สรุปรายการเบิก
    const summarySheet = workbook.addWorksheet('สรุปรายการเบิก', {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
      properties: { defaultRowHeight: 20 },
    });
    this.buildSummarySheet(summarySheet, data, comparisonData, reportDate, logoImageId);

    // ชีต 2: รายงานเปรียบเทียบการเบิกและใช้ (รูปแบบ Medical Supply Order)
    const orderSheet = workbook.addWorksheet('รายงานเปรียบเทียบการเบิกและใช้', {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
      properties: { defaultRowHeight: 20 },
    });
    this.buildMedicalSupplyOrderSheet(orderSheet, data, comparisonData, reportDate, logoImageId);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private buildSummarySheet(
    summarySheet: ExcelJS.Worksheet,
    data: ItemComparisonReportData,
    comparisonData: ItemComparisonReportData['comparison'],
    reportDate: string,
    logoImageId: number | null,
  ): void {
    const filters = data.filters ?? {};

    summarySheet.mergeCells('A1:A2');
    summarySheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF8F9FA' },
    };
    summarySheet.getCell('A1').border = {
      right: { style: 'thin' },
      bottom: { style: 'thin' },
    };
    if (logoImageId != null) {
      try {
        summarySheet.addImage(logoImageId, 'A1:A2');
      } catch {
        /* skip */
      }
    }
    summarySheet.getRow(1).height = 20;
    summarySheet.getRow(2).height = 20;
    summarySheet.getColumn(1).width = 12;

    summarySheet.mergeCells('B1:E2');
    const summaryHeaderCell = summarySheet.getCell('B1');
    summaryHeaderCell.value =
      'สรุปรายการเบิก — เปรียบเทียบการเบิกและใช้\nItem comparison summary (dispensed vs usage)';
    summaryHeaderCell.font = { name: 'Tahoma', size: 14, bold: true, color: { argb: 'FF1A365D' } };
    summaryHeaderCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    summaryHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
    summaryHeaderCell.border = {
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };

    summarySheet.mergeCells('A3:E3');
    const summaryDateCell = summarySheet.getCell('A3');
    summaryDateCell.value = `วันที่รายงาน: ${reportDate}`;
    summaryDateCell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF6C757D' } };
    summaryDateCell.alignment = { horizontal: 'right', vertical: 'middle' };
    summarySheet.getRow(3).height = 20;

    const sumFilterLabels = ['วันที่เริ่ม', 'วันที่สิ้นสุด', 'แผนก', 'จำนวนรายการ'];
    const sumFilterValues = [
      filters.startDate ?? 'ทั้งหมด',
      filters.endDate ?? 'ทั้งหมด',
      filters.departmentName ?? filters.departmentCode ?? 'ทั้งหมด',
      `${data.summary?.total_items ?? 0} รายการ`,
    ];
    const sumFilterColMap = [['A', 'A'], ['B', 'B'], ['C', 'C'], ['D', 'E']];
    sumFilterLabels.forEach((lbl, gi) => {
      const cols = sumFilterColMap[gi];
      summarySheet.mergeCells(`${cols[0]}4:${cols[1]}4`);
      const cell = summarySheet.getCell(`${cols[0]}4`);
      cell.value = `${lbl}: ${sumFilterValues[gi]}`;
      cell.font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FF1A365D' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF2' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    summarySheet.getRow(4).height = 20;

    const summaryTableHeaders = ['ลำดับ', 'ชื่ออุปกรณ์', 'จำนวนเบิก', 'จำนวนใช้', 'ส่วนต่าง'];
    const summaryHeaderRow = summarySheet.getRow(5);
    summaryTableHeaders.forEach((h, i) => {
      const cell = summaryHeaderRow.getCell(i + 1);
      cell.value = h;
      cell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A365D' } };
      cell.alignment = { horizontal: i === 1 ? 'left' : 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    summaryHeaderRow.height = 26;

    let summaryDataRowIndex = 6;
    comparisonData.forEach((item, idx) => {
      const difference =
        (item.total_dispensed ?? 0) - (item.total_used ?? 0) - (item.total_returned ?? 0);
      const sumRow = summarySheet.getRow(summaryDataRowIndex);
      const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8F9FA';
      const sCells = [idx + 1, item.itemname ?? '-', item.total_dispensed ?? 0, item.total_used ?? 0, difference];
      sCells.forEach((val, colIndex) => {
        const cell = sumRow.getCell(colIndex + 1);
        cell.value = val;
        let fgColor = bg;
        let fontColor = 'FF212529';
        let isBold = false;
        if (colIndex === 4 && difference !== 0) {
          fgColor = 'FFFFF3CD';
          fontColor = 'FF856404';
          isBold = true;
        }
        cell.font = { name: 'Tahoma', size: 12, bold: isBold, color: { argb: fontColor } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fgColor } };
        cell.alignment = { horizontal: colIndex === 1 ? 'left' : 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
      sumRow.height = 22;
      summaryDataRowIndex++;
    });

    summarySheet.addRow([]);
    const sumFooterRow = summaryDataRowIndex + 1;
    summarySheet.mergeCells(`A${sumFooterRow}:E${sumFooterRow}`);
    const sumFooterCell = summarySheet.getCell(`A${sumFooterRow}`);
    sumFooterCell.value = 'เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ';
    sumFooterCell.font = { name: 'Tahoma', size: 11, color: { argb: 'FFADB5BD' } };
    sumFooterCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(sumFooterRow).height = 18;

    summarySheet.getColumn(1).width = 13;
    summarySheet.getColumn(2).width = 44;
    summarySheet.getColumn(3).width = 14;
    summarySheet.getColumn(4).width = 14;
    summarySheet.getColumn(5).width = 14;
  }

  private buildMedicalSupplyOrderSheet(
    ws: ExcelJS.Worksheet,
    data: ItemComparisonReportData,
    comparisonData: ItemComparisonReportData['comparison'],
    reportDate: string,
    logoImageId: number | null,
  ): void {
    const filters = data.filters ?? {};

    // —— หัวชีตเหมือนชีตแรก: โลโก้ A1:A2 + หัวข้อ B1:I2 ——
    ws.mergeCells('A1:A2');
    ws.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: THEME.pageBg },
    };
    ws.getCell('A1').border = {
      right: { style: 'thin' },
      bottom: { style: 'thin' },
    };
    if (logoImageId != null) {
      try {
        ws.addImage(logoImageId, 'A1:A2');
      } catch {
        /* skip */
      }
    }
    ws.getRow(1).height = 25;
    ws.getRow(2).height = 25;
    ws.getColumn(1).width = 12;

    ws.mergeCells('B1:I2');
    const titleCell = ws.getCell('B1');
    titleCell.value =
      'รายงานเปรียบเทียบการเบิกและใช้\nรายละเอียดรายการสั่ง (Medical Supply Order detail)';
    titleCell.font = { name: 'Tahoma', size: 14, bold: true, color: { argb: THEME.navy } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.pageBg } };
    titleCell.border = {
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };

    ws.mergeCells('A3:I3');
    const dateCell = ws.getCell('A3');
    dateCell.value = `วันที่รายงาน: ${reportDate}`;
    dateCell.font = { name: 'Tahoma', size: 12, color: { argb: THEME.textMuted } };
    dateCell.alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getRow(3).height = 20;

    ws.mergeCells('A4:I4');
    const filterCell = ws.getCell('A4');
    filterCell.value = `วันที่เริ่ม: ${filters.startDate ?? 'ทั้งหมด'}  |  วันที่สิ้นสุด: ${filters.endDate ?? 'ทั้งหมด'}  |  แผนก: ${filters.departmentName ?? filters.departmentCode ?? 'ทั้งหมด'}${filters.itemCode ? `  |  รหัสอุปกรณ์: ${filters.itemCode}` : ''}`;
    filterCell.font = { name: 'Tahoma', size: 11, bold: true, color: { argb: THEME.navy } };
    filterCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.navyLight } };
    filterCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    filterCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
    ws.getRow(4).height = 22;

    let r = 5;
    const hdrLabels = [
      'Order Date & Time',
      'Item Code',
      'Description',
      'Quantity',
      'StockAddress',
      'OrderStatus',
      'HN',
      'Room',
      'Patient Name',
    ];
    const headerRow = ws.getRow(r);
    hdrLabels.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.navy } };
      cell.border = BORDER;
    });
    headerRow.height = 26;
    r++;

    const allDates: number[] = [];
    let dataRowIdx = 0;

    for (const item of comparisonData) {
      const usages = (item.usageItems ?? []) as UsageDetail[];
      if (usages.length === 0) continue;

      const sorted = [...usages].sort((a, b) => {
        const ta = new Date((a as any).supply_item_created_at ?? a.usage_datetime ?? 0).getTime();
        const tb = new Date((b as any).supply_item_created_at ?? b.usage_datetime ?? 0).getTime();
        return ta - tb;
      });

      const first = sorted[0];
      const categoryLabel =
        (first.print_location && String(first.print_location).trim()) ||
        (first.department_name && String(first.department_name).trim()) ||
        item.itemcode ||
        'รายการอุปกรณ์';

      ws.mergeCells(r, 1, r, 9);
      const catCell = ws.getCell(r, 1);
      catCell.value = categoryLabel;
      catCell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      catCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      catCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.navy } };
      catCell.border = BORDER;
      ws.getRow(r).height = 24;
      r++;

      let groupQty = 0;
      for (const u of sorted) {
        const dt = (u as any).supply_item_created_at ?? u.usage_datetime;
        if (dt) {
          const t = new Date(dt).getTime();
          if (!Number.isNaN(t)) allDates.push(t);
        }
        const qty = u.qty_used ?? 0;
        groupQty += qty;
        const code = u.itemcode || item.itemcode || '-';
        const desc = u.order_item_description || u.itemname || item.itemname || '-';
        const stockAddr = (u.assession_no && String(u.assession_no).trim()) || '-';
        const status = orderStatusLabel(u.order_item_status);
        const room = u.twu || u.print_location || u.department_name || u.department_code || '-';
        const patient = u.patient_name || '-';

        const bg = dataRowIdx % 2 === 0 ? 'FFFFFFFF' : THEME.rowAlt;
        dataRowIdx++;
        const row = ws.addRow([
          formatOrderDateTimeBangkok(dt),
          code,
          desc,
          qty,
          stockAddr,
          status,
          u.patient_hn || '-',
          room,
          patient,
        ]);
        row.height = 22;
        for (let c = 1; c <= 9; c++) {
          const cell = row.getCell(c);
          cell.font = { name: 'Tahoma', size: 11, color: { argb: THEME.textBody } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
          cell.border = BORDER;
          cell.alignment =
            c === 3 || c === 9
              ? { horizontal: 'left', vertical: 'middle', wrapText: true }
              : { horizontal: 'center', vertical: 'middle' };
        }
        r++;
      }

      const subRow = ws.addRow(['', '', 'Sub-Total', groupQty, '', '', '', '', '']);
      subRow.height = 22;
      for (let c = 1; c <= 9; c++) {
        const cell = subRow.getCell(c);
        cell.font = { name: 'Tahoma', size: 11, bold: true, color: { argb: THEME.navy } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.navyLight } };
        cell.border = BORDER;
        if (c === 3) cell.alignment = { horizontal: 'right', vertical: 'middle' };
        else if (c === 4) cell.alignment = { horizontal: 'center', vertical: 'middle' };
        else cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      r++;
    }

    ws.addRow([]);
    const titleFoot = ws.addRow(['Medical Supply Order Report']);
    ws.mergeCells(titleFoot.number, 1, titleFoot.number, 9);
    titleFoot.getCell(1).font = { name: 'Tahoma', size: 12, bold: true, color: { argb: THEME.navy } };
    titleFoot.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    const tMin = allDates.length ? Math.min(...allDates) : Date.now();
    const tMax = allDates.length ? Math.max(...allDates) : Date.now();
    const periodStr = `${formatPeriodDate(filters.startDate || new Date(tMin))} to ${formatPeriodDate(filters.endDate || new Date(tMax))}`;
    const periodRow = ws.addRow([`Period date: ${periodStr}`]);
    ws.mergeCells(periodRow.number, 1, periodRow.number, 9);
    periodRow.getCell(1).font = { name: 'Tahoma', size: 11, color: { argb: THEME.textMuted } };
    periodRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

    const autoFoot = ws.addRow(['เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ']);
    ws.mergeCells(autoFoot.number, 1, autoFoot.number, 9);
    autoFoot.getCell(1).font = { name: 'Tahoma', size: 11, color: { argb: THEME.footer } };
    autoFoot.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(autoFoot.number).height = 18;

    ws.getColumn(1).width = 20;
    ws.getColumn(2).width = 16;
    ws.getColumn(3).width = 32;
    ws.getColumn(4).width = 10;
    ws.getColumn(5).width = 14;
    ws.getColumn(6).width = 14;
    ws.getColumn(7).width = 14;
    ws.getColumn(8).width = 18;
    ws.getColumn(9).width = 28;
  }
}
