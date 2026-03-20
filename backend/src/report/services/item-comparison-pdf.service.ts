import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { ItemComparisonReportData, UsageDetail } from '../types/item-comparison-report.types';
import { resolveReportLogoPath, getReportThaiFontPaths } from '../config/report.config';
import { formatReportDateTime } from '../utils/date-timeformat';

function formatFilterDateValue(v?: string | null): string {
  if (v == null || String(v).trim() === '') return 'ทั้งหมด';
  return formatReportDateTime(v);
}

@Injectable()
export class ItemComparisonPdfService {
  private async registerThaiFont(doc: PDFKit.PDFDocument): Promise<boolean> {
    try {
      const fonts = getReportThaiFontPaths();
      if (!fonts || !fs.existsSync(fonts.regular)) return false;
      doc.registerFont('ThaiFont', fonts.regular);
      doc.registerFont('ThaiFontBold', fonts.bold);
      return true;
    } catch {
      return false;
    }
  }

  private getLogoBuffer(): Buffer | null {
    const logoPath = resolveReportLogoPath();
    if (!logoPath || !fs.existsSync(logoPath)) return null;
    try {
      return fs.readFileSync(logoPath);
    } catch {
      return null;
    }
  }

  async generateReport(data: ItemComparisonReportData): Promise<Buffer> {
    if (!data || !data.comparison) {
      throw new Error('Invalid report data: comparison data is missing');
    }

    const comparisonData = Array.isArray(data.comparison) ? data.comparison : [];

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'portrait',
      margin: 10,
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    let finalFontName = 'Helvetica';
    let finalFontBoldName = 'Helvetica-Bold';
    try {
      const hasThai = await this.registerThaiFont(doc);
      if (hasThai) {
        finalFontName = 'ThaiFont';
        finalFontBoldName = 'ThaiFontBold';
        doc.font(finalFontBoldName).fontSize(15);
        doc.font(finalFontName).fontSize(15);
      }
    } catch {
      /* keep default */
    }

    const logoBuffer = this.getLogoBuffer();
    const reportDate = formatReportDateTime(new Date());

    const margin = 10;
    const filters = data.filters ?? {};
    const itemHeight = 32;
    const cellPadding = 4;
    const bottomSafe = 45;
    const logoSlotW = 86;

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        const contentWidth = () => doc.page.width - margin * 2;
        const pageHeight = () => doc.page.height;

        /** หัวรายงาน: โลโก้ซ้าย — ข้อความกึ่งกลางเฉพาะช่องขวา (ไม่ทับโลโก้) */
        const drawHeaderBlock = (titleTh: string, titleEn: string) => {
          const cw = contentWidth();
          const headerTop = 32;
          const headerHeight = 50;
          doc.rect(margin, headerTop, cw, headerHeight).fillAndStroke('#F8F9FA', '#DEE2E6');

          const textLeft = margin + logoSlotW + 6;
          const textW = cw - logoSlotW - 12;

          if (logoBuffer && logoBuffer.length > 0) {
            try {
              doc.image(logoBuffer, margin + 6, headerTop + 7, { fit: [72, 36] });
            } catch {
              try {
                doc.image(logoBuffer, margin + 6, headerTop + 7, { width: 72 });
              } catch {
                /* skip */
              }
            }
          }

          doc.fontSize(18).font(finalFontBoldName).fillColor('#1A365D');
          doc.text(titleTh, textLeft, headerTop + 8, { width: textW, align: 'center' });
          doc.fontSize(12).font(finalFontName).fillColor('#6C757D');
          doc.text(titleEn, textLeft, headerTop + 28, { width: textW, align: 'center' });
          doc.fillColor('#000000');
          doc.y = headerTop + headerHeight + 12;
          doc.fontSize(14).font(finalFontName).fillColor('#6C757D');
          doc.text(`วันที่รายงาน: ${reportDate}`, margin, doc.y, { width: cw, align: 'right' });
          doc.fillColor('#000000');
          doc.y += 8;
        };

        const drawFilterRow = () => {
          const cw = contentWidth();
          const filterRowHeight = 36;
          const filterY = doc.y;
          const filterCells = [
            { label: 'วันที่เริ่ม', value: formatFilterDateValue(filters.startDate) },
            { label: 'วันที่สิ้นสุด', value: formatFilterDateValue(filters.endDate) },
            { label: 'แผนก', value: filters.departmentName ?? filters.departmentCode ?? 'ทั้งหมด' },
            { label: 'จำนวนรายการ', value: `${data.summary?.total_items ?? 0} รายการ` },
          ];
          const filterColWidth = Math.floor(cw / filterCells.length);
          let fx = margin;
          filterCells.forEach((fc, i) => {
            const cellW =
              i === filterCells.length - 1
                ? cw - filterColWidth * (filterCells.length - 1)
                : filterColWidth;
            doc.rect(fx, filterY, cellW, filterRowHeight).fillAndStroke('#E8EDF2', '#DEE2E6');
            doc.fontSize(12).font(finalFontBoldName).fillColor('#444444');
            doc.text(fc.label, fx + 4, filterY + 5, { width: cellW - 8, align: 'center' });
            doc.fontSize(14).font(finalFontName).fillColor('#1A365D');
            doc.text(String(fc.value), fx + 4, filterY + 18, { width: cellW - 8, align: 'center' });
            fx += cellW;
          });
          doc.fillColor('#000000');
          doc.y = filterY + filterRowHeight + 4;
        };

        // ---------- หน้าแรก: สรุป ----------
        drawHeaderBlock(
          'สรุปรายการเบิก — เปรียบเทียบการเบิกและใช้',
          'Item comparison summary (dispensed vs usage)',
        );
        drawFilterRow();

        const cw0 = contentWidth();
        const sColPct = [0.07, 0.48, 0.15, 0.15, 0.15];
        const sColWidths = sColPct.map((p) => Math.floor(cw0 * p));
        let sSumW = sColWidths.reduce((a, b) => a + b, 0);
        if (sSumW < cw0) sColWidths[1] += cw0 - sSumW;
        const sHeaders = ['ลำดับ', 'ชื่ออุปกรณ์', 'จำนวนเบิก', 'จำนวนใช้', 'ส่วนต่าง'];

        const drawSummaryHeader = (y: number) => {
          const cw = contentWidth();
          let x = margin;
          doc.fontSize(14).font(finalFontBoldName);
          doc.rect(margin, y, cw, itemHeight).fill('#1A365D');
          doc.fillColor('#FFFFFF');
          sHeaders.forEach((h, i) => {
            doc.text(h, x + cellPadding, y + 8, {
              width: Math.max(2, sColWidths[i] - cellPadding * 2),
              align: 'center',
            });
            if (i < sHeaders.length - 1) {
              doc.save();
              doc.strokeColor('#4A6FA0').lineWidth(0.5);
              doc.moveTo(x + sColWidths[i], y + 4).lineTo(x + sColWidths[i], y + itemHeight - 4).stroke();
              doc.restore();
            }
            x += sColWidths[i];
          });
          doc.fillColor('#000000');
        };

        const ensureSummarySpace = (need: number) => {
          if (doc.y + need > pageHeight() - bottomSafe) {
            doc.addPage({ size: 'A4', layout: 'portrait', margin: 10 });
            doc.y = margin;
            const headerY = doc.y;
            drawSummaryHeader(headerY);
            doc.y = headerY + itemHeight;
            doc.fontSize(14).font(finalFontName).fillColor('#000000');
          }
        };

        const summaryHeaderY = doc.y;
        drawSummaryHeader(summaryHeaderY);
        doc.y = summaryHeaderY + itemHeight;
        doc.fontSize(14).font(finalFontName).fillColor('#000000');

        if (comparisonData.length === 0) {
          const rowY = doc.y;
          const cw = contentWidth();
          doc.rect(margin, rowY, cw, itemHeight).fillAndStroke('#F8F9FA', '#DEE2E6');
          doc.fontSize(14).font(finalFontName);
          doc.text('ไม่มีข้อมูล', margin + cellPadding, rowY + 8, {
            width: cw - cellPadding * 2,
            align: 'center',
          });
          doc.y = rowY + itemHeight;
        } else {
          comparisonData.forEach((item, sIdx) => {
            const difference =
              (item.total_dispensed ?? 0) - (item.total_used ?? 0) - (item.total_returned ?? 0);
            const sTexts = [
              String(sIdx + 1),
              item.itemname ?? '-',
              String(item.total_dispensed ?? 0),
              String(item.total_used ?? 0),
              String(difference),
            ];
            doc.fontSize(14).font(finalFontName);
            const sHeights = sTexts.map((text, i) => {
              const w = Math.max(4, sColWidths[i] - cellPadding * 2);
              return doc.heightOfString(text ?? '-', { width: w });
            });
            const sRowHeight = Math.max(itemHeight, Math.max(...sHeights) + cellPadding * 2);
            ensureSummarySpace(sRowHeight);

            const rowY = doc.y;
            const bg = sIdx % 2 === 0 ? '#FFFFFF' : '#F8F9FA';
            let xPos = margin;
            for (let i = 0; i < 5; i++) {
              const cellW = sColWidths[i];
              const w = Math.max(4, cellW - cellPadding * 2);
              let cellBg = bg;
              if (i === 4 && difference !== 0) cellBg = '#FFF3CD';
              doc.rect(xPos, rowY, cellW, sRowHeight).fillAndStroke(cellBg, '#DEE2E6');
              doc
                .fontSize(14)
                .font(finalFontName)
                .fillColor(i === 4 && difference !== 0 ? '#856404' : '#000000');
              doc.text(sTexts[i] ?? '-', xPos + cellPadding, rowY + cellPadding, {
                width: w,
                align: i === 1 ? 'left' : 'center',
              });
              xPos += cellW;
            }
            doc.fillColor('#000000');
            doc.y = rowY + sRowHeight;
          });
        }

        doc.fontSize(12).font(finalFontName).fillColor('#ADB5BD');
        doc.text('เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ', margin, doc.y + 8, {
          width: contentWidth(),
          align: 'center',
        });
        doc.fillColor('#000000');

        const hasDetail = comparisonData.some(
          (it) => Array.isArray(it.usageItems) && it.usageItems.length > 0,
        );
        if (!hasDetail) {
          doc.end();
          return;
        }

        // ---------- รายละเอียด: แนวนอน (9 คอลัมน์ รวม HN/EN คอลัมน์เดียว) ----------
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 14 });
        const mMargin = 14;
        const mCw = () => doc.page.width - mMargin * 2;
        const mPh = () => doc.page.height;

        const drawMedicalHeaderBand = (titleTh: string, titleEn: string) => {
          const cw = mCw();
          const headerTop = 28;
          const headerHeight = 46;
          doc.rect(mMargin, headerTop, cw, headerHeight).fillAndStroke('#F8F9FA', '#DEE2E6');
          const textLeft = mMargin + logoSlotW + 4;
          const textW = cw - logoSlotW - 10;
          if (logoBuffer && logoBuffer.length > 0) {
            try {
              doc.image(logoBuffer, mMargin + 6, headerTop + 6, { fit: [70, 34] });
            } catch {
              try {
                doc.image(logoBuffer, mMargin + 6, headerTop + 6, { width: 70 });
              } catch {
                /* skip */
              }
            }
          }
          doc.fontSize(18).font(finalFontBoldName).fillColor('#1A365D');
          doc.text(titleTh, textLeft, headerTop + 8, { width: textW, align: 'center' });
          doc.fontSize(13).font(finalFontName).fillColor('#6C757D');
          doc.text(titleEn, textLeft, headerTop + 26, { width: textW, align: 'center' });
          doc.fillColor('#000000');
          doc.y = headerTop + headerHeight + 10;
          doc.fontSize(14).font(finalFontName).fillColor('#6C757D');
          doc.text(`วันที่รายงาน: ${reportDate}`, mMargin, doc.y, { width: cw, align: 'right' });
          doc.y += 10;
        };

        drawMedicalHeaderBand(
          'รายงานเปรียบเทียบการเบิกและใช้ — รายละเอียดรายการสั่ง',
          'Medical Supply Order detail',
        );

        const detailFilterText = `วันที่เริ่ม: ${formatFilterDateValue(filters.startDate)}  |  วันที่สิ้นสุด: ${formatFilterDateValue(filters.endDate)}  |  แผนก: ${filters.departmentName ?? filters.departmentCode ?? 'ทั้งหมด'}${filters.itemCode ? `  |  รหัสอุปกรณ์: ${filters.itemCode}` : ''}`;
        doc.fontSize(13).font(finalFontName).fillColor('#1A365D');
        const filterH = Math.max(
          30,
          doc.heightOfString(detailFilterText, { width: mCw() - 16 }) + 18,
        );
        const fy = doc.y;
        doc.rect(mMargin, fy, mCw(), filterH).fillAndStroke('#E8EDF2', '#DEE2E6');
        doc.font(finalFontBoldName).fontSize(13);
        doc.text(detailFilterText, mMargin + 8, fy + 7, { width: mCw() - 16, align: 'center' });
        doc.fillColor('#000000');
        doc.y = fy + filterH + 4;

        const mHeaders = [
          'วัน-เวลา',
          'Item Code',
          'รายละเอียด',
          'จำนวน',
          'Assession No',
          'สถานะ',
          'HN/EN',
          'แผนก',
          'ชื่อผู้ป่วย',
        ];
        /** 9 คอลัมน์: HN / EN รวมเป็นคอลัมน์เดียว เว้นบรรทัด */
        const mHeaderH = 40;
        const mFont = 13;
        const mFontBold = 13;

        const calcMedicalColWidths = () => {
          const cw = mCw();
          const wDt = 116;
          const wCode = 78;
          const wQty = 32;
          const wAss = 70;
          const wSt = 44;
          const wHnEn = 82;
          const wDept = 48;
          const fixedSum = wDt + wCode + wQty + wAss + wSt + wHnEn + wDept;
          const rest = Math.max(80, cw - fixedSum);
          // ส่วนที่เหลือแบ่ง รายละเอียด vs ชื่อผู้ป่วย (ลดสัดส่วนรายละเอียดนิดหน่อย — ไปขยาย Assession No แล้ว)
          const descW = Math.floor(rest * 0.54);
          const patientW = rest - descW;
          return [wDt, wCode, descW, wQty, wAss, wSt, wHnEn, wDept, patientW];
        };

        let mColWidths = calcMedicalColWidths();

        const drawMedicalTableHeader = (y: number) => {
          mColWidths = calcMedicalColWidths();
          const cw = mCw();
          let x = mMargin;
          doc.fontSize(mFontBold).font(finalFontBoldName);
          doc.rect(mMargin, y, cw, mHeaderH).fill('#1A365D');
          doc.fillColor('#FFFFFF');
          mHeaders.forEach((h, i) => {
            doc.text(h, x + 3, y + 11, {
              width: Math.max(2, mColWidths[i] - 6),
              align: 'center',
            });
            if (i < mHeaders.length - 1) {
              doc.save();
              doc.strokeColor('#4A6FA0').lineWidth(0.5);
              doc.moveTo(x + mColWidths[i], y + 4).lineTo(x + mColWidths[i], y + mHeaderH - 4).stroke();
              doc.restore();
            }
            x += mColWidths[i];
          });
          doc.fillColor('#000000');
        };

        let detailRowIdx = 0;

        const rowTextHeight = (texts: string[], cols: number[]) => {
          doc.fontSize(mFont).font(finalFontName);
          const heights = texts.map((t, i) => {
            const w = Math.max(4, cols[i] - 6);
            return doc.heightOfString(t || '-', { width: w, lineGap: 2 });
          });
          return Math.max(36, Math.max(...heights, 16) + 16);
        };

        const ensureMedicalSpace = (need: number, repeatTableHeader: boolean) => {
          if (doc.y + need > mPh() - bottomSafe) {
            doc.addPage({ size: 'A4', layout: 'landscape', margin: mMargin });
            doc.y = mMargin;
            drawMedicalHeaderBand(
              'รายงานเปรียบเทียบการเบิกและใช้ (ต่อ)',
              'Medical Supply Order detail (continued)',
            );
            doc.y += 4;
            if (repeatTableHeader) {
              drawMedicalTableHeader(doc.y);
              doc.y += mHeaderH;
            }
            doc.fontSize(mFont).font(finalFontName).fillColor('#000000');
          }
        };

        const tableHeaderY = doc.y;
        drawMedicalTableHeader(tableHeaderY);
        doc.y = tableHeaderY + mHeaderH;

        for (const item of comparisonData) {
          const usages = (item.usageItems ?? []) as UsageDetail[];
          if (usages.length === 0) continue;

          const sorted = [...usages].sort((a, b) => {
            const ta = new Date(
              (a as any).supply_item_created_at ?? a.usage_datetime ?? 0,
            ).getTime();
            const tb = new Date(
              (b as any).supply_item_created_at ?? b.usage_datetime ?? 0,
            ).getTime();
            return ta - tb;
          });

          const first = sorted[0];
          const categoryLabel =
            (first.print_location && String(first.print_location).trim()) ||
            (first.department_name && String(first.department_name).trim()) ||
            item.itemcode ||
            'รายการอุปกรณ์';

          doc.fontSize(mFont).font(finalFontBoldName);
          const catH = Math.max(22, doc.heightOfString(categoryLabel, { width: mCw() - 20 }) + 12);
          ensureMedicalSpace(catH + 6, true);
          const catY = doc.y;
          doc.rect(mMargin, catY, mCw(), catH).fillAndStroke('#1A365D', '#DEE2E6');
          doc.fontSize(13).font(finalFontBoldName).fillColor('#FFFFFF');
          doc.text(categoryLabel, mMargin + 10, catY + 6, { width: mCw() - 20 });
          doc.fillColor('#000000');
          doc.y = catY + catH;

          let groupQty = 0;
          for (const u of sorted) {
            const dt = (u as any).supply_item_created_at ?? u.usage_datetime;
            const qty = u.qty_used ?? 0;
            groupQty += qty;
            const code = u.itemcode || item.itemcode || '-';
            const desc = u.order_item_description || u.itemname || item.itemname || '-';
            const assessionNo = (u.assession_no && String(u.assession_no).trim()) || '-';
            const status = this.getUsageOrderStatusText(u.order_item_status);
            const hn = (u.patient_hn && String(u.patient_hn).trim()) || '-';
            const en = (u.patient_en && String(u.patient_en).trim()) || '-';
            const dept =
              (u.department_name && String(u.department_name).trim()) ||
              (u.department_code && String(u.department_code).trim()) ||
              '-';
            const patient = (u.patient_name && String(u.patient_name).trim()) || '-';
            const hnEn = `${hn}\n${en}`;

            const cells = [
              formatReportDateTime(dt),
              code,
              desc,
              String(qty),
              assessionNo,
              status,
              hnEn,
              dept,
              patient,
            ];
            mColWidths = calcMedicalColWidths();
            const rh = rowTextHeight(cells, mColWidths);
            ensureMedicalSpace(rh, true);
            const rowY = doc.y;
            const bg = detailRowIdx % 2 === 0 ? '#FFFFFF' : '#F8F9FA';
            detailRowIdx++;
            let xPos = mMargin;
            for (let i = 0; i < 9; i++) {
              const cellW = mColWidths[i];
              const w = Math.max(4, cellW - 6);
              doc.rect(xPos, rowY, cellW, rh).fillAndStroke(bg, '#DEE2E6');
              doc.fontSize(mFont).font(finalFontName).fillColor('#000000');
              doc.text(cells[i] ?? '-', xPos + 3, rowY + 5, {
                width: w,
                align: i === 2 || i === 8 ? 'left' : 'center',
                lineGap: 2,
              });
              xPos += cellW;
            }
            doc.y = rowY + rh;
          }

          const subBarH = 28;
          ensureMedicalSpace(subBarH, true);
          const subY = doc.y;
          doc.rect(mMargin, subY, mCw(), subBarH).fillAndStroke('#E8EDF2', '#DEE2E6');
          doc.fontSize(mFont).font(finalFontBoldName).fillColor('#1A365D');
          doc.text(`Sub-Total จำนวนรวม: ${groupQty}`, mMargin + 12, subY + 8, {
            width: mCw() - 24,
            align: 'right',
          });
          doc.fillColor('#000000');
          doc.y = subY + subBarH + 8;
        }

        if (doc.y + 40 > mPh() - bottomSafe) {
          doc.addPage({ size: 'A4', layout: 'landscape', margin: mMargin });
          doc.y = mMargin;
        }
        doc.y += 14;
        doc.fontSize(13).font(finalFontName).fillColor('#ADB5BD');
        doc.text('เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ', mMargin, doc.y, {
          width: mCw(),
          align: 'center',
        });
        doc.fillColor('#000000');

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  private getUsageOrderStatusText(status?: string): string {
    if (status == null || status === '') return '-';
    const lower = status.toLowerCase();
    if (lower === 'discontinue' || lower === 'discontinued') return 'ยกเลิก';
    if (lower === 'verified') return 'ยืนยันแล้ว';
    return status;
  }
}
