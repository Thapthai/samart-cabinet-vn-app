import { IsString, IsBoolean, IsOptional, MinLength, ValidateIf, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStaffRoleDto {
  /** ไม่ส่งหรือว่าง = ระบบสร้างรหัสอัตโนมัติ (เช่น STF-001) */
  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== '')
  @IsString()
  @MinLength(2)
  code?: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  /** 1 = สูงสุด … 3 = ต่ำสุด */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  @Type(() => Number)
  hierarchy_level?: number;
}

export class UpdateStaffRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  @Type(() => Number)
  hierarchy_level?: number;
}
