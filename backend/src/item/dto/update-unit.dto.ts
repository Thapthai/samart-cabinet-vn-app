import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUnitDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  UnitName?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  B_ID?: number;

  @IsOptional()
  @IsBoolean()
  IsCancel?: boolean;
}
