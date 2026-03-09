import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { VendingMappingReportData } from './vending-mapping-report-excel.service';
import { getReportThaiFontPaths } from '../config/report.config';

@Injectable()
export class VendingMappingReportPdfService {
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

  async generateReport(data: VendingMappingReportData): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {});

    const hasThaiFont = await this.registerThaiFont(doc);
    const fontName = hasThaiFont ? 'ThaiFont' : 'Helvetica';
    const fontBoldName = hasThaiFont ? 'ThaiFontBold' : 'Helvetica-Bold';

    // Title
    doc.font(fontBoldName).fontSize(18).text('รายงานสรุป Mapping Vending กับ HIS', { align: 'center' });
    doc.moveDown();

    // Summary
    doc.font(fontBoldName).fontSize(14).text('สรุปผล', { align: 'left' });
    doc.moveDown(0.5);
    doc.font(fontName).fontSize(11).text(`จำนวนวัน: ${data.summary.total_days}`);
    doc.text(`จำนวน Episode: ${data.summary.total_episodes}`);
    doc.text(`จำนวนผู้ป่วย: ${data.summary.total_patients}`);
    doc.text(`จำนวนรายการทั้งหมด: ${data.summary.total_items}`);
    doc.text(`รายการที่ Mapping ได้: ${data.summary.total_mapped}`);
    doc.text(`รายการที่ Mapping ไม่ได้: ${data.summary.total_unmapped}`);
    doc.moveDown();

    // Table
    const tableTop = doc.y;
    const itemHeight = 20;
    const colWidths = [100, 80, 80, 80, 80, 80];
    const headers = ['วันที่ Print', 'Episode', 'ผู้ป่วย', 'รายการ', 'Mapping ได้', 'Mapping ไม่ได้'];

    // Headers
    doc.font(fontBoldName).fontSize(10);
    let x = 50;
    headers.forEach((header, i) => {
      doc.rect(x, tableTop, colWidths[i], itemHeight).stroke();
      doc.text(header, x + 5, tableTop + 5, { width: colWidths[i] - 10, align: 'center' });
      x += colWidths[i];
    });

    // Data rows
    let y = tableTop + itemHeight;
    doc.font(fontName).fontSize(9);
    data.data.forEach((day) => {
      x = 50;
      const rowData = [
        day.print_date,
        day.total_episodes.toString(),
        day.total_patients.toString(),
        day.total_items.toString(),
        day.mapped_items.length.toString(),
        day.unmapped_items.length.toString(),
      ];
      rowData.forEach((cell, i) => {
        doc.rect(x, y, colWidths[i], itemHeight).stroke();
        doc.text(cell, x + 5, y + 5, { width: colWidths[i] - 10, align: 'center' });
        x += colWidths[i];
      });
      y += itemHeight;
    });

    doc.end();
    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}

