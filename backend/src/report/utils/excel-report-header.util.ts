import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { resolveReportLogoPath } from '../config/report.config';

export const EXCEL_REPORT_HEADER_NAVY = 'FF1A365D';
export const EXCEL_REPORT_HEADER_PAGE_BG = 'FFF8F9FA';

export function cmToExcelPx(cm: number): number {
  return Math.round((cm * 96) / 2.54);
}

/** นามสกุลรูปสำหรับ workbook.addImage */
export function imageExtensionFromPath(logoPath: string): 'png' | 'jpeg' | 'gif' {
  const ext = path.extname(logoPath).toLowerCase().replace('.', '');
  if (ext === 'jpg') return 'jpeg';
  if (ext === 'jpeg' || ext === 'gif' || ext === 'png') return ext as 'png' | 'jpeg' | 'gif';
  return 'png';
}

/** โลโก้มุมซ้ายบน ขนาดคงที่ ไม่ยืดตามเซลล์ merge */
export function addFloatingReportLogo(
  worksheet: ExcelJS.Worksheet,
  workbook: ExcelJS.Workbook,
  logoPath: string | null | undefined,
): void {
  if (!logoPath || !fs.existsSync(logoPath)) return;
  try {
    const imageId = workbook.addImage({
      filename: logoPath,
      extension: imageExtensionFromPath(logoPath),
    });
    addFloatingReportLogoByImageId(worksheet, imageId);
  } catch {
    /* skip */
  }
}

/** ความสูงโลโก้ในรายงาน Excel; ความกว้างตามสัดส่วนเดิม 88×36 px */
const REPORT_LOGO_HEIGHT_CM = 1.3;

export function addFloatingReportLogoByImageId(
  worksheet: ExcelJS.Worksheet,
  logoImageId: number,
): void {
  try {
    const widthCm = REPORT_LOGO_HEIGHT_CM * (88 / 36);
    const widthPx = cmToExcelPx(widthCm);
    const heightPx = cmToExcelPx(REPORT_LOGO_HEIGHT_CM);
    worksheet.addImage(logoImageId, {
      tl: { col: 0, row: 0 },
      ext: { width: widthPx, height: heightPx },
    });
  } catch {
    /* skip */
  }
}

export interface ExcelMergedTitlePaintOptions {
  /** เช่น 'A1:J2' — เซลล์หลักต้องเป็น A1 */
  mergeRange: string;
  title: string;
  navyArgb?: string;
  pageBgArgb?: string;
  row1Height?: number;
  row2Height?: number;
  colAWidth?: number;
}

/** merge + สไตล์หัวรายงานมาตรฐาน (ยังไม่แนบโลโก้) */
export function paintExcelMergedTitleHeader(
  worksheet: ExcelJS.Worksheet,
  options: ExcelMergedTitlePaintOptions,
): void {
  const {
    mergeRange,
    title,
    navyArgb = EXCEL_REPORT_HEADER_NAVY,
    pageBgArgb = EXCEL_REPORT_HEADER_PAGE_BG,
    row1Height = 25,
    row2Height = 25,
    colAWidth = 12,
  } = options;

  worksheet.mergeCells(mergeRange);
  const headerCell = worksheet.getCell('A1');
  headerCell.value = title;
  headerCell.font = { name: 'Tahoma', size: 14, bold: true, color: { argb: navyArgb } };
  headerCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: pageBgArgb } };
  headerCell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };
  worksheet.getRow(1).height = row1Height;
  worksheet.getRow(2).height = row2Height;
  worksheet.getColumn(1).width = colAWidth;
}

/** หัวรายงานมาตรฐาน + โลโก้จากไฟล์ (resolveReportLogoPath) */
export function applyExcelStandardTitleHeader(
  worksheet: ExcelJS.Worksheet,
  workbook: ExcelJS.Workbook,
  options: ExcelMergedTitlePaintOptions,
): void {
  paintExcelMergedTitleHeader(worksheet, options);
  addFloatingReportLogo(worksheet, workbook, resolveReportLogoPath());
}
