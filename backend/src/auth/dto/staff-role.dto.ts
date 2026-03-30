import { IsString, IsBoolean, IsOptional, MinLength, ValidateIf } from 'class-validator';

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
}
