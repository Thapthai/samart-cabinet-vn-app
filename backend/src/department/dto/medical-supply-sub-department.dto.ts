import { IsString, IsInt, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMedicalSupplySubDepartmentDto {
  @IsInt()
  @Type(() => Number)
  department_id: number;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}

export class UpdateMedicalSupplySubDepartmentDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  department_id?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
