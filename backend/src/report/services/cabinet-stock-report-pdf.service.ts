import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { CabinetStockReportData } from './cabinet-stock-report-excel.service';
import { resolveReportLogoPath, getReportThaiFontPaths } from '../config/report.config';

@Injectable()
export class CabinetStockReportPdfService {
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

  async generateReport(data: CabinetStockReportData): Promise<Buffer> {
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
    const reportDate =
      data.reportDateDisplay ??
      new Date().toLocaleDateString('th-TH', {
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
        const summary = data?.summary ?? { total_rows: 0, total_qty: 0, total_refill_qty: 0 };
        const rows = data?.data && Array.isArray(data.data) ? data.data : [];

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
        doc.text('รายงานสต็อกอุปกรณ์ในตู้', margin, headerTop + 6, {
          width: contentWidth,
          align: 'center',
        });
        doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
        doc.text('Cabinet Stock Report', margin, headerTop + 22, {
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

        // ---- ตาราง Filter Summary (1 แถว) ----
        const filters = data.filters ?? {};
        const filterRowHeight = 34;
        const filterY = doc.y;
        const filterCells = [
          { label: 'ตู้ Cabinet', value: filters.cabinetName ?? filters.cabinetCode ?? 'ทั้งหมด' },
          { label: 'แผนก', value: filters.departmentName ?? (filters.departmentId != null ? `แผนก ${filters.departmentId}` : 'ทั้งหมด') },
          { label: 'จำนวนรายการ', value: `${data.summary?.total_rows ?? 0} รายการ` },
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

        const itemHeight = 28;
        const cellPadding = 4;
        const totalTableWidth = contentWidth;
        // 5 คอลัมน์ตัวเลข (index 4-8) กว้างเท่ากัน, รหัส+อุปกรณ์กว้างขึ้น
        // ลำดับ:0.04 แผนก:0.09 รหัส:0.11 อุปกรณ์:0.21 | 5x0.11
        // ลำดับ, แผนก, รหัสอุปกรณ์(เหลือ), อุปกรณ์, จำนวนในตู้, ถูกใช้งาน, ไม่ถูกใช้งาน, Min/Max, จำนวนที่ต้องเติม
 
        const colPct = [0.06, 0.09, 0.17, 0.18, 0.10, 0.09, 0.09, 0.09, 0.12];
        const colWidths = colPct.map((p) => Math.floor(totalTableWidth * p));
        let sumW = colWidths.reduce((a, b) => a + b, 0);
        if (sumW < totalTableWidth) colWidths[3] += totalTableWidth - sumW;
        const headers = ['ลำดับ', 'แผนก', 'รหัสอุปกรณ์', 'อุปกรณ์', 'จำนวนในตู้', 'ถูกใช้งาน', 'ไม่ถูกใช้งาน', 'Min / Max', 'จำนวนที่ต้องเติม'];

        const drawTableHeader = (y: number) => {
          let x = margin;
          doc.fontSize(13).font(finalFontBoldName);
          // พื้นหลังทั้งแถว
          doc.rect(margin, y, totalTableWidth, itemHeight).fill('#1A365D');
          doc.fillColor('#FFFFFF');
          headers.forEach((h, i) => {
            doc.text(h, x + cellPadding, y + 8, {
              width: Math.max(2, colWidths[i] - cellPadding * 2),
              align: 'center',
            });
            // เส้นกั้นแนวตั้งระหว่างคอลัมน์ (ยกเว้นคอลัมน์สุดท้าย)
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
        if (rows.length === 0) {
          const rowY = doc.y;
          doc.rect(margin, rowY, totalTableWidth, itemHeight).fillAndStroke('#F8F9FA', '#DEE2E6');
          doc.text('ไม่มีข้อมูล', margin + cellPadding, rowY + 7, {
            width: totalTableWidth - cellPadding * 2,
            align: 'center',
          });
          doc.y = rowY + itemHeight;
        } else {
          for (let idx = 0; idx < rows.length; idx++) {
            const row = rows[idx];
            const seq = row.seq ?? idx + 1;
            const dept = (row as { department_name?: string }).department_name ?? '-';
            const code = (row as { item_code?: string }).item_code ?? '-';
            const name = (row as { item_name?: string }).item_name ?? '-';
            const bal = (row as { balance_qty?: number }).balance_qty ?? 0;
            const qtyInUse = (row as { qty_in_use?: number }).qty_in_use ?? 0;
            const damagedQty = (row as { damaged_qty?: number }).damaged_qty ?? 0;
            const smax = (row as { stock_max?: number | null }).stock_max;
            const smin = (row as { stock_min?: number | null }).stock_min;
            const refill = (row as { refill_qty?: number }).refill_qty ?? 0;
            const minMaxStr =
              smin != null && smax != null
                ? `${smin} / ${smax}`
                : smin != null
                  ? `${smin} / -`
                  : smax != null
                    ? `- / ${smax}`
                    : '-';
            const cellTexts = [
              String(seq),
              String(dept),
              String(code),
              String(name),
              String(bal),
              String(qtyInUse),
              String(damagedQty),
              minMaxStr,
              String(refill),
            ];

            // คำนวณความสูงแถวตามข้อความที่อาจขึ้นบรรทัดใหม่
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
              // reset font กลับเป็น regular หลัง drawTableHeader
              doc.fontSize(13).font(finalFontName).fillColor('#000000');
            }

            const rowY = doc.y;
            const hasRefill = ((row as { refill_qty?: number }).refill_qty ?? 0) > 0;
            const bg = hasRefill ? '#F8D7D7' : (idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA');
            let xPos = margin;
            for (let i = 0; i < 9; i++) {
              const cw = colWidths[i];
              const w = Math.max(4, cw - cellPadding * 2);
              doc.rect(xPos, rowY, cw, rowHeight).fillAndStroke(bg, '#DEE2E6');
              doc.fontSize(13).font(finalFontName).fillColor('#000000');
              doc.text(cellTexts[i] ?? '-', xPos + cellPadding, rowY + cellPadding, {
                width: w,
                align: i === 1 || i === 2 || i === 3 ? 'left' : 'center',
              });
              xPos += cw;
            }
            doc.y = rowY + rowHeight;
          }
        }

        doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
        doc.text(
          'หมายเหตุ: จำนวนในตู้ = ชิ้นในตู้ (IsStock=1) | ถูกใช้งาน = supply_usage_items ตามวันที่รายงาน | จำนวนที่ต้องเติม = Stock Max − จำนวนในตู้',
          margin,
          doc.y + 6,
          {
            width: contentWidth,
            align: 'center',
          },
        );
        doc.fillColor('#000000');

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
