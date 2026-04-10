import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import moment from 'moment-timezone';
import { PrismaService } from '../prisma/prisma.service';
import { ReportServiceService } from './report-service.service';

const FILTER_KEY_ALL = 'ALL';

@Injectable()
export class DailyCabinetStockArchiveService {
  private readonly logger = new Logger(DailyCabinetStockArchiveService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reportService: ReportServiceService,
  ) {}

  private getBaseDir(): string {
    const fromEnv = process.env.DAILY_REPORTS_DIR?.trim();
    if (fromEnv) return path.resolve(fromEnv);
    return path.join(process.cwd(), 'storage', 'daily-reports', 'cabinet-stock');
  }

  private validateYmd(d: string | undefined): string | null {
    const t = d?.trim();
    return t && /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
  }

  /** ถ้าไม่ส่ง reportDate จะใช้เมื่อวาน (Bangkok) */
  async archiveDateOrYesterday(reportDate?: string): Promise<void> {
    const d = this.validateYmd(reportDate);
    if (d) {
      await this.archiveDate(d);
      return;
    }
    const yesterday = moment.tz('Asia/Bangkok').subtract(1, 'day').format('YYYY-MM-DD');
    await this.archiveDate(yesterday);
  }

  async archiveDate(reportDate: string): Promise<void> {
    const d = this.validateYmd(reportDate);
    if (!d) throw new Error('reportDate must be YYYY-MM-DD');

    const base = this.getBaseDir();
    const dayDir = path.join(base, d);
    await fs.mkdir(dayDir, { recursive: true });

    const excelName = `cabinet_stock_${FILTER_KEY_ALL}.xlsx`;
    const pdfName = `cabinet_stock_${FILTER_KEY_ALL}.pdf`;
    const relExcel = path.posix.join(d, excelName);
    const relPdf = path.posix.join(d, pdfName);

    const excel = await this.reportService.generateCabinetStockExcel({
      asOfDate: d,
    });
    const pdf = await this.reportService.generateCabinetStockPdf({ asOfDate: d });

    await fs.writeFile(path.join(dayDir, excelName), excel.buffer);
    await fs.writeFile(path.join(dayDir, pdfName), pdf.buffer);

    await this.prisma.dailyCabinetStockReportArchive.upsert({
      where: {
        report_date_format_filter_key: {
          report_date: d,
          format: 'excel',
          filter_key: FILTER_KEY_ALL,
        },
      },
      create: {
        report_date: d,
        format: 'excel',
        filter_key: FILTER_KEY_ALL,
        file_path: relExcel,
        file_size: excel.buffer.length,
      },
      update: {
        file_path: relExcel,
        file_size: excel.buffer.length,
      },
    });

    await this.prisma.dailyCabinetStockReportArchive.upsert({
      where: {
        report_date_format_filter_key: {
          report_date: d,
          format: 'pdf',
          filter_key: FILTER_KEY_ALL,
        },
      },
      create: {
        report_date: d,
        format: 'pdf',
        filter_key: FILTER_KEY_ALL,
        file_path: relPdf,
        file_size: pdf.buffer.length,
      },
      update: {
        file_path: relPdf,
        file_size: pdf.buffer.length,
      },
    });
  }

  async listArchives(params?: { limit?: number; offset?: number }) {
    const take = Math.min(Math.max(params?.limit ?? 200, 1), 500);
    const skip = Math.max(params?.offset ?? 0, 0);
    return this.prisma.dailyCabinetStockReportArchive.findMany({
      orderBy: [{ report_date: 'desc' }, { format: 'asc' }],
      take,
      skip,
    });
  }

  async getFileBufferById(id: number): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const row = await this.prisma.dailyCabinetStockReportArchive.findUnique({ where: { id } });
    if (!row) throw new Error('ไม่พบไฟล์รายงานที่ขอ');

    const fullPath = path.join(this.getBaseDir(), ...row.file_path.split('/'));
    const buffer = await fs.readFile(fullPath);
    const ext = row.format === 'excel' ? 'xlsx' : 'pdf';
    const filename = `cabinet_stock_${row.report_date}.${ext}`;
    const contentType =
      row.format === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';
    return { buffer, filename, contentType };
  }
}
