import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import { resolveReportLogoPath } from '../config/report.config';
import { ItemComparisonReportData, UsageDetail } from '../types/item-comparison-report.types';
import { formatReportDateTime } from '../utils/date-timeformat';

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

function orderStatusLabel(status?: string): string {
  if (status == null || status === '') return '-';
  const u = status.toLowerCase();
  if (u === 'verified') return 'Verified';
  if (u === 'discontinue' || u === 'discontinued') return 'Discontinued';
  return status;
}

/** แปลง cm → px สำหรับขนาดรูปใน Excel (96 DPI มาตรฐาน) */
function cmToExcelPx(cm: number): number {
  return Math.round((cm * 96) / 2.54);
}

/** ชีตรายละเอียด: โลโก้ความกว้าง 4.01 cm ไม่ยึดเต็มช่อง merge A1:A2 */
function addLogoImageCompact(ws: ExcelJS.Worksheet, logoImageId: number | null): void {
  if (logoImageId == null) return;
  const widthCm = 4.01;
  const widthPx = cmToExcelPx(widthCm);
  /** สัดส่วนเดิม 88×36 px */
  const heightPx = Math.round(widthPx * (36 / 88));
  try {
    ws.addImage(logoImageId, {
      tl: { col: 0, row: 0 },
      ext: { width: widthPx, height: heightPx },
    });
  } catch {
    /* skip */
  }
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

    const reportDate = formatReportDateTime(new Date());

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


    const summaryTableHeaders = ['ลำดับ', 'ชื่ออุปกรณ์', 'จำนวนเบิก', 'จำนวนใช้', 'ส่วนต่าง'];
    const summaryHeaderRow = summarySheet.getRow(4);
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

    let summaryDataRowIndex = 5;
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

    // —— หัวชีตเหมือนชีตแรก: โลโก้ A1:A2 + หัวข้อ B1:J2 ——
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
    addLogoImageCompact(ws, logoImageId);
    ws.getRow(1).height = 25;
    ws.getRow(2).height = 25;
    ws.getColumn(1).width = 12;

    ws.mergeCells('B1:J2');
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

    let r = 4;
    const hdrLabels = [
      'วัน - เวลา',
      'Item Code',
      'รายละเอียด',
      'จำนวน',
      'Assession No',
      'สถานะ',
      'HN',
      'EN',
      'แผนก',
      'ชื่อผู้ป่วย',
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

    let dataRowIdx = 0;

    for (const item of comparisonData) {
      const usages = (item.usageItems ?? []) as UsageDetail[];
      if (usages.length === 0) continue;

      const sorted = [...usages].sort((a, b) => {
        const ta = new Date((a as any).supply_item_created_at ?? a.usage_datetime ?? 0).getTime();
        const tb = new Date((b as any).supply_item_created_at ?? b.usage_datetime ?? 0).getTime();
        return ta - tb;
      });

      let groupQty = 0;
      for (const u of sorted) {
        const dt = (u as any).supply_item_created_at ?? u.usage_datetime;
        const qty = u.qty_used ?? 0;
        groupQty += qty;
        const code = u.itemcode || item.itemcode || '-';
        const desc = u.order_item_description || u.itemname || item.itemname || '-';
        const assessionNo = (u.assession_no && String(u.assession_no).trim()) || '-';
        const status = orderStatusLabel(u.order_item_status);
        const hn = (u.patient_hn && String(u.patient_hn).trim()) || '-';
        const en = (u.patient_en && String(u.patient_en).trim()) || '-';
        const dept =
          (u.department_name && String(u.department_name).trim()) ||
          (u.department_code && String(u.department_code).trim()) ||
          '-';
        const patient = (u.patient_name && String(u.patient_name).trim()) || '-';

        const bg = dataRowIdx % 2 === 0 ? 'FFFFFFFF' : THEME.rowAlt;
        dataRowIdx++;
        const row = ws.addRow([
          dt,
          code,
          desc,
          qty,
          assessionNo,
          status,
          hn,
          en,
          dept,
          patient,
        ]);
        row.height = 22;
        for (let c = 1; c <= 10; c++) {
          const cell = row.getCell(c);
          cell.font = { name: 'Tahoma', size: 11, color: { argb: THEME.textBody } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
          cell.border = BORDER;
          cell.alignment =
            c === 3 || c === 10
              ? { horizontal: 'left', vertical: 'middle', wrapText: true }
              : { horizontal: 'center', vertical: 'middle' };
          // ค่า dt ถูกแล้ว แต่ Excel มักใช้รูปแบบแค่วันที่ — ตั้ง numFmt ให้เห็นเวลาในช่อง
          if (c === 1) {
            let v = cell.value;
            if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v.trim())) {
              const parsed = new Date(v.trim());
              if (!Number.isNaN(parsed.getTime())) {
                cell.value = parsed;
                v = parsed;
              }
            }
            if (v instanceof Date || (typeof v === 'number' && Number.isFinite(v))) {
              cell.numFmt = 'dd/mm/yyyy hh:mm:ss';
            }
          }
        }
        r++;
      }

      const subRow = ws.addRow(['', '', 'Sub-Total', groupQty, '', '', '', '', '', '']);
      subRow.height = 22;
      for (let c = 1; c <= 10; c++) {
        const cell = subRow.getCell(c);
        cell.font = { name: 'Tahoma', size: 11, bold: true, color: { argb: THEME.navy } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.navyLight } };
        cell.border = BORDER;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      r++;
    }

    ws.addRow([]);
    const autoFoot = ws.addRow(['เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ']);
    ws.mergeCells(autoFoot.number, 1, autoFoot.number, 10);
    autoFoot.getCell(1).font = { name: 'Tahoma', size: 11, color: { argb: THEME.footer } };
    autoFoot.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(autoFoot.number).height = 18;

    ws.getColumn(1).width = 24;
    ws.getColumn(2).width = 16;
    ws.getColumn(3).width = 38;
    ws.getColumn(4).width = 10;
    ws.getColumn(5).width = 16;
    ws.getColumn(6).width = 12;
    ws.getColumn(7).width = 12;
    ws.getColumn(8).width = 14;
    ws.getColumn(9).width = 14;
    ws.getColumn(10).width = 34;
  }
}
