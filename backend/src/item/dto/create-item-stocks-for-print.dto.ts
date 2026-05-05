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

export class CreateItemStocksForPrintLineDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(25)
  itemcode: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  cabinet_id: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  department_id: number;

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

export class CreateItemStocksForPrintDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateItemStocksForPrintLineDto)
  lines: CreateItemStocksForPrintLineDto[];
}
