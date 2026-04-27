import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * พิมพ์ฉลาก SATO จากเทมเพลต SBPL1.txt
 * token ที่รองรับในเทมเพลต: QrCode1, Qrcode, QrCode2, itemcode2, num2, num3, num4
 */
export class PrintSatoSbplDto {
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
