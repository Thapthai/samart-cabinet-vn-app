import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** แถวหนึ่งในรายการสั่งพิมพ์ */
export class PrintLabelItemLineDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(25)
  itemcode!: string;

  /** จำนวนฉลากของรหัสนี้ — ค่าเริ่มต้น 1 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  copies?: number;
}

/** พิมพ์หลายฉลากจาก Item master ตามลำดับแถว — host/port จาก .env */
export class PrintLabelItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(80)
  @ValidateNested({ each: true })
  @Type(() => PrintLabelItemLineDto)
  items!: PrintLabelItemLineDto[];
}
