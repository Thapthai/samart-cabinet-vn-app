import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { DispensedItemsForPatientsReportData } from './dispensed-items-for-patients-excel.service';
import { resolveReportLogoPath, getReportThaiFontPaths } from '../config/report.config';
import { formatReportDateTime } from '../utils/date-timeformat';

/** filter วันที่: ว่าง = ทั้งหมด, มีค่า = ใช้ format รายงาน */
function formatFilterDateValue(v?: string | null): string {
  if (v == null || String(v).trim() === '') return 'ทั้งหมด';
  return formatReportDateTime(v);
}

/** แปลงสถานะให้แสดงเหมือนเว็บ */
function getStatusLabel(status?: string): string {
  if (status == null || status === '') return '-';
  const lower = status.toLowerCase();
  if (lower === 'discontinue' || lower === 'discontinued') return 'ยกเลิก';
  if (lower === 'verified') return 'ยืนยันแล้ว';
  return status;
}

@Injectable()
export class DispensedItemsForPatientsPdfService {
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

  async generateReport(data: DispensedItemsForPatientsReportData): Promise<Buffer> {
    if (!data || !data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid data structure: data.data must be an array');
    }

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
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
    const reportDate = formatReportDateTime(new Date());

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        const margin = 10;
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const contentWidth = pageWidth - margin * 2;
        const usages = data.data ?? [];

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
        doc.text('รายการเบิกอุปกรณ์ใช้กับคนไข้', margin, headerTop + 6, {
          width: contentWidth,
          align: 'center',
        });
        doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
        doc.text('Dispensed Items for Patients Report', margin, headerTop + 22, {
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

        // ---- ตาราง Filter Summary (1 แถว 4 ช่อง) ----
        const filters = data.filters ?? {};
        const filterRowHeight = 34;
        const filterY = doc.y;
        const filterCells = [
          { label: 'วันที่เริ่ม', value: formatFilterDateValue(filters.startDate) },
          { label: 'วันที่สิ้นสุด', value: formatFilterDateValue(filters.endDate) },
          { label: 'แผนก', value: (filters as any).departmentName ?? filters.departmentCode ?? 'ทั้งหมด' },
          { label: 'ประเภทผู้ป่วย', value: filters.usageType === 'OPD' ? 'ผู้ป่วยนอก (OPD)' : filters.usageType === 'IPD' ? 'ผู้ป่วยใน (IPD)' : 'ทั้งหมด' },
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
        const itemHeight = 28;
        const cellPadding = 4;
        const totalTableWidth = contentWidth;
        // ลำดับ, HN/EN, ชื่อคนไข้, แผนก/ประเภท(รวม), วันที่เบิก, ชื่ออุปกรณ์, จำนวน, Assession, สถานะ
        const colPct = [0.06, 0.10, 0.13, 0.13, 0.10, 0.16, 0.08, 0.12, 0.09];
        const colWidths = colPct.map((p) => Math.floor(totalTableWidth * p));
        let sumW = colWidths.reduce((a, b) => a + b, 0);
        if (sumW < totalTableWidth) colWidths[5] += totalTableWidth - sumW;
        const headers = [
          'ลำดับ', 'HN / EN', 'ชื่อคนไข้', 'แผนก / ประเภท',
          'วันที่เบิก', 'ชื่ออุปกรณ์', 'จำนวน', 'Assession No', 'สถานะ',
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

        const drawRow = (
          cellTexts: string[],
          bg: string,
          statusText?: string,
        ) => {
          // คำนวณความสูงแถว
          doc.fontSize(13).font(finalFontName);
          const cellHeights = cellTexts.map((text, i) => {
            const w = Math.max(4, colWidths[i] - cellPadding * 2);
            return doc.heightOfString(text ?? '-', { width: w });
          });
          const rowHeight = Math.max(itemHeight, Math.max(...cellHeights) + cellPadding * 2);

          if (doc.y + rowHeight > pageHeight - 35) {
            doc.addPage({ size: 'A4', layout: 'landscape', margin: 10 });
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
            if (i === 8 && statusText) {
              const sl = statusText.toLowerCase();
              if (sl === 'ยืนยันแล้ว' || sl === 'verified') cellBg = '#D4EDDA';
              else if (sl === 'ยกเลิก' || sl === 'discontinue' || sl === 'discontinued') cellBg = '#F8D7DA';
            }
            doc.rect(xPos, rowY, cw, rowHeight).fillAndStroke(cellBg, '#DEE2E6');
            let textColor = '#000000';
            if (i === 8 && statusText) {
              const sl = statusText.toLowerCase();
              if (sl === 'ยืนยันแล้ว' || sl === 'verified') textColor = '#155724';
              else if (sl === 'ยกเลิก' || sl === 'discontinue' || sl === 'discontinued') textColor = '#721C24';
            }
            doc.fontSize(13).font(finalFontName).fillColor(textColor);
            doc.text(cellTexts[i] ?? '-', xPos + cellPadding, rowY + cellPadding, {
              width: w,
              align: i === 2 || i === 5 ? 'left' : 'center',
            });
            xPos += cw;
          }
          doc.fillColor('#000000');
          doc.y = rowY + rowHeight;
        };

        doc.fontSize(13).font(finalFontName).fillColor('#000000');
        if (usages.length === 0) {
          const rowY = doc.y;
          doc.rect(margin, rowY, totalTableWidth, itemHeight).fillAndStroke('#F8F9FA', '#DEE2E6');
          doc.text('ไม่มีข้อมูล', margin + cellPadding, rowY + 7, {
            width: totalTableWidth - cellPadding * 2,
            align: 'center',
          });
          doc.y = rowY + itemHeight;
        } else {
          usages.forEach((usage, idx) => {
            const items = usage.supply_items ?? [];
            const totalQty = items
              .filter((i) => (i.order_item_status ?? '').toLowerCase() === 'verified')
              .reduce((s, i) => s + i.qty, 0);

            const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA';
            const hnEn = `${usage.patient_hn ?? '-'} / ${usage.en ?? '-'}`;
            const usageTypeLabel = (usage.usage_type ?? '').toUpperCase() === 'IPD' ? 'ผู้ป่วยใน'
              : (usage.usage_type ?? '').toUpperCase() === 'OPD' ? 'ผู้ป่วยนอก'
                : (usage.usage_type ?? '-');

            // Main row — รวม แผนก + ประเภท ในคอลัมน์เดียว (index 3)
            const deptAndType = `${usage.department_name ?? usage.department_code ?? '-'}\n${usageTypeLabel}`;
            drawRow([
              String(usage.seq ?? idx + 1),
              hnEn,
              usage.patient_name ?? '-',
              deptAndType,
              formatReportDateTime(usage.dispensed_date),
              '',
              String(totalQty),
              '', '',
            ], bg);

            // Sub rows
            items.forEach((item) => {
              const statusLabel = getStatusLabel(item.order_item_status);
              drawRow([
                '', '', '', '', '',
                item.itemname ?? '-',
                String(item.qty ?? 0),
                item.assession_no ?? '-',
                statusLabel,
              ], '#F0F8FF', statusLabel);
            });
          });
        }

        // footer note
        doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
        doc.text(
          `จำนวนรายการทั้งหมด: ${data.summary?.total_records ?? 0} รายการ | จำนวนคนไข้: ${data.summary?.total_patients ?? 0} ราย`,
          margin, doc.y + 6, { width: contentWidth, align: 'center' },
        );
        doc.fillColor('#000000');

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
