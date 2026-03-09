import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { ItemComparisonReportData } from '../types/item-comparison-report.types';
import { resolveReportLogoPath, getReportThaiFontPaths } from '../config/report.config';

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
        // prime ฟอนต์บน page แรก เพื่อให้ PDFKit embed font ใน resource ของ page 1
        doc.font(finalFontBoldName).fontSize(13);
        doc.font(finalFontName).fontSize(13);
      }
    } catch {
      // keep default
    }

    const logoBuffer = this.getLogoBuffer();
    const reportDate = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Bangkok',
    });

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        const margin = 10;
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const contentWidth = pageWidth - margin * 2;

        // ---- Header block with logo ----
        const headerTop = 35;
        const headerHeight = 48;
        doc.rect(margin, headerTop, contentWidth, headerHeight)
          .fillAndStroke('#F8F9FA', '#DEE2E6');

        if (logoBuffer && logoBuffer.length > 0) {
          try {
            doc.image(logoBuffer, margin + 8, headerTop + 6, { fit: [70, 36] });
          } catch {
            try {
              doc.image(logoBuffer, margin + 8, headerTop + 6, { width: 70 });
            } catch {
              // skip logo
            }
          }
        }

        doc.fontSize(16).font(finalFontBoldName).fillColor('#1A365D');
        doc.text('รายงานเปรียบเทียบการเบิกอุปกรณ์และการบันทึกใช้กับคนไข้', margin, headerTop + 6, {
          width: contentWidth,
          align: 'center',
        });
        doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
        doc.text('Comparative Report on Dispensing and Patient Usage', margin, headerTop + 22, {
          width: contentWidth,
          align: 'center',
        });
        doc.fillColor('#000000');
        doc.y = headerTop + headerHeight + 14;

        // วันที่รายงาน
        doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
        doc.text(`วันที่รายงาน: ${reportDate}`, margin, doc.y, {
          width: contentWidth,
          align: 'right',
        });
        doc.fillColor('#000000');
        doc.y += 6;

        // ---- ตาราง Filter Summary ----
        const filters = data.filters ?? {};
        const filterRowHeight = 34;
        const filterY = doc.y;
        const filterCells = [
          { label: 'วันที่เริ่ม', value: filters.startDate ?? 'ทั้งหมด' },
          { label: 'วันที่สิ้นสุด', value: filters.endDate ?? 'ทั้งหมด' },
          { label: 'แผนก', value: filters.departmentName ?? filters.departmentCode ?? 'ทั้งหมด' },
          { label: 'จำนวนรายการ', value: `${data.summary?.total_items ?? 0} รายการ` },
        ];
        const filterColWidth = Math.floor(contentWidth / filterCells.length);
        let fx = margin;
        filterCells.forEach((fc, i) => {
          const cw = i === filterCells.length - 1
            ? contentWidth - filterColWidth * (filterCells.length - 1)
            : filterColWidth;
          doc.rect(fx, filterY, cw, filterRowHeight).fillAndStroke('#E8EDF2', '#DEE2E6');
          doc.fontSize(11).font(finalFontBoldName).fillColor('#444444');
          doc.text(fc.label, fx + 3, filterY + 4, { width: cw - 6, align: 'center' });
          doc.fontSize(13).font(finalFontName).fillColor('#1A365D');
          doc.text(fc.value, fx + 3, filterY + 16, { width: cw - 6, align: 'center' });
          fx += cw;
        });
        doc.fillColor('#000000');
        doc.y = filterY + filterRowHeight + 8;

        // ---- ตารางข้อมูล ----
        // ลำดับ, HN/EN, แผนก/ชนิดผู้ป่วย, ชื่ออุปกรณ์, จำนวนเบิก, จำนวนใช้, ส่วนต่าง, วันที่, สถานะ
        const itemHeight = 28;
        const cellPadding = 4;
        const totalTableWidth = contentWidth;
        const colPct = [0.06, 0.12, 0.14, 0.24, 0.09, 0.08, 0.08, 0.09, 0.1];
        const colWidths = colPct.map((p) => Math.floor(totalTableWidth * p));
        let sumW = colWidths.reduce((a, b) => a + b, 0);
        if (sumW < totalTableWidth) colWidths[3] += totalTableWidth - sumW;
        const headers = [
          'ลำดับ', 'HN / EN', 'แผนก', 'ชื่ออุปกรณ์',
          'จำนวนเบิก', 'จำนวนใช้', 'ส่วนต่าง', 'วันที่', 'สถานะ',
        ];

        const drawTableHeader = (y: number) => {
          let x = margin;
          doc.fontSize(13).font(finalFontBoldName);
          doc.rect(margin, y, totalTableWidth, itemHeight).fill('#1A365D');
          doc.fillColor('#FFFFFF');
          headers.forEach((h, i) => {
            doc.text(h, x + cellPadding, y + 8, {
              width: Math.max(2, colWidths[i] - cellPadding * 2),
              align: 'center',
            });
            if (i < headers.length - 1) {
              doc.save();
              doc.strokeColor('#4A6FA0').lineWidth(0.5);
              doc.moveTo(x + colWidths[i], y + 4).lineTo(x + colWidths[i], y + itemHeight - 4).stroke();
              doc.restore();
            }
            x += colWidths[i];
          });
          doc.fillColor('#000000');
        };

        const tableHeaderY = doc.y;
        drawTableHeader(tableHeaderY);
        doc.y = tableHeaderY + itemHeight;

        doc.fontSize(13).font(finalFontName).fillColor('#000000');

        if (comparisonData.length === 0) {
          const rowY = doc.y;
          doc.rect(margin, rowY, totalTableWidth, itemHeight).fillAndStroke('#F8F9FA', '#DEE2E6');
          doc.text('ไม่มีข้อมูล', margin + cellPadding, rowY + 7, {
            width: totalTableWidth - cellPadding * 2,
            align: 'center',
          });
          doc.y = rowY + itemHeight;
        } else {
          const drawRow = (
            cellTexts: string[],
            bg: string,
            statusText?: string,
            isMatch?: boolean,
            hasDiff?: boolean,
          ) => {
            doc.fontSize(13).font(finalFontName);
            const cellHeights = cellTexts.map((text, i) => {
              const w = Math.max(4, colWidths[i] - cellPadding * 2);
              return doc.heightOfString(text ?? '-', { width: w });
            });
            const rowHeight = Math.max(itemHeight, Math.max(...cellHeights) + cellPadding * 2);

            if (doc.y + rowHeight > pageHeight - 35) {
              doc.addPage({ size: 'A4', layout: 'portrait', margin: 10 });
              doc.y = margin;
              const newHeaderY = doc.y;
              drawTableHeader(newHeaderY);
              doc.y = newHeaderY + itemHeight;
              doc.fontSize(13).font(finalFontName).fillColor('#000000');
            }

            const rowY = doc.y;
            let xPos = margin;
            for (let i = 0; i < 9; i++) {
              const cw = colWidths[i];
              const w = Math.max(4, cw - cellPadding * 2);
              let cellBg = bg;
              let textColor = '#000000';
              if (i === 6 && hasDiff) {
                cellBg = '#FFF3CD';
                textColor = '#856404';
              }
              if (i === 8 && statusText != null) {
                cellBg = isMatch ? '#D4EDDA' : '#F8D7DA';
                textColor = isMatch ? '#155724' : '#721C24';
              }
              doc.rect(xPos, rowY, cw, rowHeight).fillAndStroke(cellBg, '#DEE2E6');
              doc.fontSize(13).font(finalFontName).fillColor(textColor);
              doc.text(cellTexts[i] ?? '-', xPos + cellPadding, rowY + cellPadding, {
                width: w,
                align: i === 1 || i === 2 || i === 3 ? 'left' : 'center',
              });
              xPos += cw;
            }
            doc.fillColor('#000000');
            doc.y = rowY + rowHeight;
          };

          comparisonData.forEach((item, idx) => {
            const difference = (item.total_dispensed ?? 0) - (item.total_used ?? 0) - (item.total_returned ?? 0);
            const isMatch = item.status === 'MATCHED';
            const statusText = this.getStatusText(item.status || 'UNKNOWN');
            const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA';

            drawRow([
              String(idx + 1),
              '-',
              '-',
              item.itemname ?? '-',
              String(item.total_dispensed ?? 0),
              String(item.total_used ?? 0),
              String(difference),
              '-',
              statusText,
            ], bg, statusText, isMatch, difference !== 0);

            if (item.usageItems && Array.isArray(item.usageItems) && item.usageItems.length > 0) {
              item.usageItems.forEach((usage: any) => {
                const usageDate = usage.usage_datetime != null
                  ? new Date(usage.usage_datetime).toLocaleDateString('th-TH')
                  : '-';
                const hnEn = `${usage.patient_hn ?? '-'} / ${usage.patient_en ?? '-'}`;
                const deptLabel = usage.department_name || usage.department_code || '-';
                const usageType = (usage.usage_type ?? '').toUpperCase();
                const patientTypeLabel = usageType === 'IPD' ? 'ผู้ป่วยใน'
                  : usageType === 'OPD' ? 'ผู้ป่วยนอก' : '';
                const deptAndType = patientTypeLabel ? `${deptLabel}\n${patientTypeLabel}` : deptLabel;
                const usageStatus = this.getUsageOrderStatusText(usage.order_item_status);
                const usageIsVerified = usageStatus === 'ยืนยันแล้ว';

                drawRow([
                  ' ',
                  hnEn,
                  deptAndType,
                  '',
                  ' ',
                  String(usage.qty_used ?? 0),
                  ' ',
                  usageDate,
                  usageStatus,
                ], '#F0F8FF', usageStatus, usageIsVerified);
              });
            }
          });
        }

        // =========================================================
        // Summary Page: สรุปรายการเบิกตามเวชภัณฑ์
        // =========================================================
        if (comparisonData.length > 0) {
          doc.addPage({ size: 'A4', layout: 'portrait', margin: 10 });
          doc.y = margin;

          doc.fontSize(14).font(finalFontBoldName).fillColor('#1A365D');
          doc.text('สรุปรายการเบิกตามเวชภัณฑ์', margin, doc.y, {
            width: contentWidth,
            align: 'left',
          });
          doc.y += 10;
          doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
          doc.text('รวมจำนวนเบิกทั้งหมดของแต่ละรายการเวชภัณฑ์ ตามช่วงวันที่ที่เลือก', margin, doc.y, {
            width: contentWidth,
            align: 'left',
          });
          doc.fillColor('#000000');
          doc.y += 14;

          // 5 columns: ลำดับ, ชื่ออุปกรณ์, จำนวนเบิก, จำนวนใช้, ส่วนต่าง
          const sColPct = [0.06, 0.52, 0.14, 0.14, 0.14];
          const sColWidths = sColPct.map((p) => Math.floor(contentWidth * p));
          let sSumW = sColWidths.reduce((a, b) => a + b, 0);
          if (sSumW < contentWidth) sColWidths[1] += contentWidth - sSumW;
          const sHeaders = ['ลำดับ', 'ชื่ออุปกรณ์', 'จำนวนเบิก', 'จำนวนใช้', 'ส่วนต่าง'];

          const drawSummaryHeader = (y: number) => {
            let x = margin;
            doc.fontSize(13).font(finalFontBoldName);
            doc.rect(margin, y, contentWidth, itemHeight).fill('#1A365D');
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

          drawSummaryHeader(doc.y);
          doc.y += itemHeight;
          doc.fontSize(13).font(finalFontName).fillColor('#000000');

          comparisonData.forEach((item, sIdx) => {
            const difference = (item.total_dispensed ?? 0) - (item.total_used ?? 0) - (item.total_returned ?? 0);

            doc.fontSize(13).font(finalFontName);
            const sTexts = [
              String(sIdx + 1),
              item.itemname ?? '-',
              String(item.total_dispensed ?? 0),
              String(item.total_used ?? 0),
              String(difference),
            ];
            const sHeights = sTexts.map((text, i) => {
              const w = Math.max(4, sColWidths[i] - cellPadding * 2);
              return doc.heightOfString(text ?? '-', { width: w });
            });
            const sRowHeight = Math.max(itemHeight, Math.max(...sHeights) + cellPadding * 2);

            if (doc.y + sRowHeight > pageHeight - 35) {
              doc.addPage({ size: 'A4', layout: 'portrait', margin: 10 });
              doc.y = margin;
              drawSummaryHeader(doc.y);
              doc.y += itemHeight;
              doc.fontSize(13).font(finalFontName).fillColor('#000000');
            }

            const rowY = doc.y;
            const bg = sIdx % 2 === 0 ? '#FFFFFF' : '#F8F9FA';
            let xPos = margin;
            for (let i = 0; i < 5; i++) {
              const cw = sColWidths[i];
              const w = Math.max(4, cw - cellPadding * 2);
              let cellBg = bg;
              if (i === 4 && difference !== 0) cellBg = '#FFF3CD';
              doc.rect(xPos, rowY, cw, sRowHeight).fillAndStroke(cellBg, '#DEE2E6');
              doc.fontSize(13).font(finalFontName).fillColor(i === 4 && difference !== 0 ? '#856404' : '#000000');
              doc.text(sTexts[i] ?? '-', xPos + cellPadding, rowY + cellPadding, {
                width: w,
                align: i === 1 ? 'left' : 'center',
              });
              xPos += cw;
            }
            doc.y = rowY + sRowHeight;
          });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  private getStatusText(status: string): string {
    switch (status) {
      case 'MATCHED': return 'ตรงกัน';
      case 'DISPENSED_NOT_USED': return 'เบิกแล้วไม่ใช้';
      case 'USED_WITHOUT_DISPENSE': return 'ใช้โดยไม่เบิก';
      case 'DISPENSE_EXCEEDS_USAGE': return 'เบิกมากกว่าใช้';
      case 'USAGE_EXCEEDS_DISPENSE': return 'ใช้มากกว่าเบิก';
      case 'UNKNOWN': return 'ไม่ทราบสถานะ';
      default: return status || '-';
    }
  }

  private getUsageOrderStatusText(status?: string): string {
    if (status == null || status === '') return '-';
    const lower = status.toLowerCase();
    if (lower === 'discontinue' || lower === 'discontinued') return 'ยกเลิก';
    if (lower === 'verified') return 'ยืนยันแล้ว';
    return status;
  }
}
