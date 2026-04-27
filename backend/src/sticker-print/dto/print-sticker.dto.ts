import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * สั่งงานไปเครื่องปริ้นเครือข่าย (RAW TCP เช่น พอร์ต 9100)
 * payload เป็นข้อความคำสั่ง (เช่น ZPL, TSPL) ตามรุ่นเครื่อง
 */
export class PrintStickerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(253)
  host!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number = 9100;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500_000)
  payload!: string;

  /** รหัส buffer ก่อนส่ง — utf8 สำหรับ ZPL/ข้อความส่วนใหญ่ */
  @IsOptional()
  @IsIn(['utf8', 'latin1', 'ascii'])
  encoding?: 'utf8' | 'latin1' | 'ascii' = 'utf8';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1_000)
  @Max(120_000)
  timeoutMs?: number = 10_000;
}
