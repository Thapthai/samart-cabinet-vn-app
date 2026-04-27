import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StickerPrintController } from './sticker-print.controller';
import { StickerPrintService } from './sticker-print.service';

@Module({
  imports: [AuthModule],
  controllers: [StickerPrintController],
  providers: [StickerPrintService],
  exports: [StickerPrintService],
})
export class StickerPrintModule {}
