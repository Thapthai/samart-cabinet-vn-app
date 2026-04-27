import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PrintLabelItemDto } from './dto/print-label-item.dto';
import { PrintLabelItemsDto } from './dto/print-label-items.dto';
import { StickerPrintService } from './sticker-print.service';

/**
 * สติกเกอร์ SATO SBPL — ต้องล็อกอิน
 */
@Controller('sticker-print')
@UseGuards(AuthGuard)
export class StickerPrintController {
  constructor(private readonly stickerPrintService: StickerPrintService) {}

  @Post('printLabel')
  @HttpCode(200)
  testPrintLabel(@Body() body: { ip?: string; port?: number | string }) {
    return this.stickerPrintService.printLabel(body?.ip, body?.port);
  }

  /** พิมพ์จาก Item master รายการเดียว — SBPL1 + token จาก DB */
  @Post('printLabel-item')
  @HttpCode(200)
  printLabelItem(@Body() body: PrintLabelItemDto) {
    return this.stickerPrintService.printLabelItem(body);
  }

  /** พิมพ์หลายรายการตามลำดับ — host/port จาก PRINT_STICKER_* ใน .env */
  @Post('printLabel-items')
  @HttpCode(200)
  printLabelItems(@Body() body: PrintLabelItemsDto) {
    return this.stickerPrintService.printLabelItems(body);
  }
}
