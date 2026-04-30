import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  UnitName: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  B_ID?: number;
}
