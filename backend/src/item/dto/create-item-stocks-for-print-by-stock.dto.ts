import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class CreateItemStocksForPrintByStockLineDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(25)
  itemcode: string;

  /** stock_id จาก app_cabinets.stock_id (0 = ไม่ผูกตู้/แผนก) */
  @IsInt()
  @Min(0)
  @Type(() => Number)
  stock_id: number;

  /** จำนวนแผ่น = จำนวนแถว itemstock ที่จะสร้าง */
  @IsInt()
  @Min(1)
  @Max(2000)
  @Type(() => Number)
  copies: number;

  /** วันหมดอายุ (YYYY-MM-DD) — บันทึกที่ ExpireDate / expDate ใน itemstock */
  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== '')
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'expire_date must be YYYY-MM-DD' })
  expire_date?: string;
}

export class CreateItemStocksForPrintByStockDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateItemStocksForPrintByStockLineDto)
  lines: CreateItemStocksForPrintByStockLineDto[];
}

