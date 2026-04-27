import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * พิมพ์ฉลากจาก master Item — host/port จาก .env เท่านั้น; token SBPL override ได้ทีละฟิลด์
 */
export class PrintLabelItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(25)
  itemcode!: string;

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
