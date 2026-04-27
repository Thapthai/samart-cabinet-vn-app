import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * ทดสอบ SATO SBPL — ค่าเริ่มต้น dryRun=true (แสดง payload ไม่ส่งเครื่อง)
 * ส่ง dryRun=false เพื่อยิงตัวอย่างจริงไป host (ข้อความทดสอบคงที่ + override ได้)
 */
export class PrintTestDto {
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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1_000)
  @Max(120_000)
  timeoutMs?: number = 10_000;

  /** true = ไม่เชื่อมต่อเครื่อง แค่คืน payload ตัวอย่าง */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  dryRun?: boolean = true;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  QrCode1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  Qrcode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  QrCode2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  itemcode2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  num2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  num3?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  num4?: string;
}
